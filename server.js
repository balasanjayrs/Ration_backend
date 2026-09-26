/*
  Smart Ration Dispenser - Backend API (matches actual schema.sql)
  --------------------------------------------------------------------
  Setup:
    1. npm init -y
    2. npm install express mysql2 cors dotenv
    3. Create a .env file next to this with:
         DB_HOST=your-db-host
         DB_USER=root
         DB_PASSWORD=your-password
         DB_NAME=ration_dispenser
         PORT=3000
    4. node server.js
*/

require('dotenv').config();
const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5500,http://127.0.0.1:3000,http://127.0.0.1:5500').split(',').map(origin => origin.trim()).filter(Boolean);

app.use(express.static(path.join(__dirname)));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is healthy' });
});

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// ---------- 1. LOGIN ----------
// POST /api/login  { username, password }
// NOTE: your users.password column stores plain text right now.
// For a real system, passwords should be hashed with bcrypt - fine to skip for a hackathon demo.
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query(
      'SELECT user_id, username, role FROM users WHERE username = ? AND password = ?',
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid User ID or Password' });
    }
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- 2. SMART CARD VERIFICATION ----------
// GET /api/verify/:cardNumber
app.get('/api/verify/:cardNumber', async (req, res) => {
  try {
    const { cardNumber } = req.params;

    const [cardRows] = await pool.query(
      'SELECT * FROM ration_cards WHERE card_number = ?',
      [cardNumber]
    );
    if (cardRows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const card = cardRows[0];

    const [members] = await pool.query(
      'SELECT member_id, name, age, relation, photo_path FROM family_members WHERE card_id = ?',
      [card.card_id]
    );

    res.json({
      cardId: card.card_id,
      name: card.head_name,
      cardNumber: card.card_number,
      cardType: card.category,        // AAY / BPL / APL
      familyMembers: members.length,
      members: members,
      address: card.address,
      phone: card.phone_number
      // fpsCode / status: not in your table yet - add columns if you want these on the page
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// If you scan by RFID tag instead of typing a card number, use this version:
// GET /api/verify-rfid/:rfidTag
app.get('/api/verify-rfid/:rfidTag', async (req, res) => {
  try {
    const { rfidTag } = req.params;
    const [cardRows] = await pool.query(
      'SELECT * FROM ration_cards WHERE rfid_tag = ?',
      [rfidTag]
    );
    if (cardRows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const card = cardRows[0];
    const [members] = await pool.query(
      'SELECT member_id, name, age, relation, photo_path FROM family_members WHERE card_id = ?',
      [card.card_id]
    );
    res.json({
      cardId: card.card_id,
      name: card.head_name,
      cardNumber: card.card_number,
      cardType: card.category,
      familyMembers: members.length,
      members,
      address: card.address,
      phone: card.phone_number
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- 3. PRODUCTS (prices for commodities.html) ----------
// GET /api/products
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT product_id, name, unit, price_per_unit, stock_quantity FROM products'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- 4. QUOTA (how much a card's category is entitled to, with category-specific price overrides) ----------
// GET /api/quota/:category   e.g. /api/quota/BPL
app.get('/api/quota/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const [rows] = await pool.query(
      `SELECT cq.product_id, p.name, cq.monthly_quota, p.unit,
              COALESCE(cq.price_override, p.price_per_unit) AS effective_price
       FROM category_quota cq
       JOIN products p ON cq.product_id = p.product_id
       WHERE cq.category = ?`,
      [category]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------- 5. SAVE TRANSACTION (handles stock shortages + carried-forward dues) ----------
// POST /api/transaction
// body: { cardId, memberId, workerId, paymentMethod, amountReceived, items: [{ productId, quantityOrdered, pricePerUnit }] }
// Note: totalAmount is now calculated server-side from what's ACTUALLY dispensed,
// since a partial dispense (5kg instead of 10kg) means the bill should be smaller too.
app.post('/api/transaction', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { cardId, memberId, workerId, items } = req.body;
    const paymentMethod = req.body.paymentMethod || 'upi';

    await connection.beginTransaction();

    // Look up this card's category so we can apply any category-specific price overrides
    // (e.g. AAY cards pay ₹13.50/kg for Sugar instead of the flat ₹25.00)
    const [cardRows] = await connection.query(
      'SELECT category FROM ration_cards WHERE card_id = ?',
      [cardId]
    );
    const cardCategory = cardRows.length > 0 ? cardRows[0].category : null;

    // First pass: work out how much of each item can actually be dispensed,
    // factoring in any past pending dues for this card + product.
    const itemsToInsert = [];
    let totalAmount = 0;

    for (const item of items) {
      const [productRows] = await connection.query(
        'SELECT stock_quantity, price_per_unit FROM products WHERE product_id = ? FOR UPDATE',
        [item.productId]
      );
      if (productRows.length === 0) continue;
      const currentStock = parseFloat(productRows[0].stock_quantity);
      let pricePerUnit = parseFloat(productRows[0].price_per_unit);

      // Check for a category-specific price override (e.g. AAY Sugar = ₹13.50)
      if (cardCategory) {
        const [overrideRows] = await connection.query(
          `SELECT price_override FROM category_quota
           WHERE category = ? AND product_id = ? AND price_override IS NOT NULL`,
          [cardCategory, item.productId]
        );
        if (overrideRows.length > 0) {
          pricePerUnit = parseFloat(overrideRows[0].price_override);
        }
      }

      // Include any earlier unfulfilled due for this card + product in what's owed now
      const [dueRows] = await connection.query(
        `SELECT due_id, pending_quantity FROM pending_dues
         WHERE card_id = ? AND product_id = ? AND status = 'pending'`,
        [cardId, item.productId]
      );
      const priorDue = dueRows.reduce((sum, d) => sum + parseFloat(d.pending_quantity), 0);
      const totalOwed = parseFloat(item.quantityOrdered) + priorDue;

      const canDispense = Math.min(totalOwed, currentStock);
      const shortfall = totalOwed - canDispense;
      const status = shortfall > 0 ? 'partial' : 'verified';

      itemsToInsert.push({
        productId: item.productId,
        quantityOrdered: item.quantityOrdered,
        expectedWeight: totalOwed,
        actualWeight: canDispense,
        weightStatus: status
      });

      totalAmount += canDispense * pricePerUnit;

      // Reduce stock by what's actually going out
      await connection.query(
        'UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?',
        [canDispense, item.productId]
      );

      // Clear old dues for this product (they're now folded into this transaction)
      if (dueRows.length > 0) {
        await connection.query(
          `UPDATE pending_dues SET status = 'fulfilled' WHERE card_id = ? AND product_id = ? AND status = 'pending'`,
          [cardId, item.productId]
        );
      }

      // If there's still a shortfall after dispensing everything in stock, record a new due
      if (shortfall > 0) {
        await connection.query(
          `INSERT INTO pending_dues (card_id, product_id, pending_quantity, status)
           VALUES (?, ?, ?, 'pending')`,
          [cardId, item.productId, shortfall]
        );
      }
    }

    const amountReceived = paymentMethod === 'cash' ? req.body.amountReceived : null;
    if (paymentMethod === 'cash' && (!amountReceived || amountReceived < totalAmount)) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cash received must be at least the total amount' });
    }

    const [txResult] = await connection.query(
      `INSERT INTO transactions (card_id, member_id, worker_id, total_amount, payment_method, amount_received, payment_status, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, 'paid', NOW())`,
      [cardId, memberId, workerId, totalAmount, paymentMethod, amountReceived]
    );
    const transactionId = txResult.insertId;

    for (const item of itemsToInsert) {
      await connection.query(
        `INSERT INTO transaction_items (transaction_id, product_id, quantity_ordered, expected_weight, actual_weight, weight_status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [transactionId, item.productId, item.quantityOrdered, item.expectedWeight, item.actualWeight, item.weightStatus]
      );
    }

    await connection.commit();

    const hasShortfall = itemsToInsert.some(i => i.weightStatus === 'partial');
    res.json({
      success: true,
      transactionId,
      totalAmount,
      partialDispense: hasShortfall,
      items: itemsToInsert
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

// ---------- 6. CHECK PENDING DUES FOR A CARD ----------
// GET /api/dues/:cardId   - show this card's family what they're still owed
app.get('/api/dues/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const [rows] = await pool.query(
      `SELECT pd.due_id, p.name, p.unit, pd.pending_quantity, pd.created_date
       FROM pending_dues pd
       JOIN products p ON pd.product_id = p.product_id
       WHERE pd.card_id = ? AND pd.status = 'pending'`,
      [cardId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================================================================
//  RATIONX HARDWARE CONTRACT
//  Polling-based endpoints matching the ESP8266 bridge + website contract.
//  These run ALONGSIDE the endpoints above (which still work fine for
//  manual/browser testing without hardware plugged in).
// ==================================================================

// In-memory state - fine for a single physical unit / one transaction at a time,
// per the contract's own note ("single row is fine").
let latestScan = { found: false };
let fpStatus = { status: 'pending' };
let orderStatus = { currentGate: null, completedGates: [], allDone: false };
let commandQueue = [];
let activeOrderTotalItems = 0;

// Gate numbers map to products in this fixed order (per the contract)
const GATE_TO_PRODUCT_NAME = ['Rice', 'Wheat', 'Sugar', 'Dal', 'Oil']; // gate 4 = "Cooking Oil" in the doc, "Oil" in our products table

async function getProductIdByGate(gate) {
  const name = GATE_TO_PRODUCT_NAME[gate];
  if (!name) return null;
  const [rows] = await pool.query('SELECT product_id FROM products WHERE name = ?', [name]);
  return rows.length > 0 ? rows[0].product_id : null;
}

// ---------- 1. CARD SCAN ----------
// POST /api/scan   body: { "uid": "04A3B2C1" }   - called by the ESP8266
app.post('/api/scan', async (req, res) => {
  try {
    const { uid } = req.body;
    const [cardRows] = await pool.query(
      'SELECT * FROM ration_cards WHERE rfid_tag = ?',
      [uid]
    );

    if (cardRows.length === 0) {
      latestScan = { found: false };
      return res.json({ ok: true });
    }

    const card = cardRows[0];
    const [members] = await pool.query(
      'SELECT member_id, name, fingerprint_id, photo_path FROM family_members WHERE card_id = ?',
      [card.card_id]
    );

    latestScan = {
      found: true,
      cardId: card.card_id,
      cardNumber: card.card_number,
      holderName: card.head_name,
      cardType: card.category,
      familyMembers: members.map(m => ({
        memberId: m.member_id,
        name: m.name,
        fingerprintId: m.fingerprint_id,
        photoPath: m.photo_path
      }))
    };

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/scan/latest   - polled by the website ~every 1.5s
app.get('/api/scan/latest', (req, res) => {
  res.json(latestScan);
});

// POST /api/scan/ack   - called by the website right after reading a result
app.post('/api/scan/ack', (req, res) => {
  latestScan = { found: false };
  res.json({ ok: true });
});

// ---------- 2. FAMILY MEMBER SELECTION -> FINGERPRINT ----------
// POST /api/select-member   body: { "memberId": 2, "fingerprintId": 4 }
app.post('/api/select-member', (req, res) => {
  const { memberId, fingerprintId } = req.body;
  fpStatus = { status: 'pending' };
  commandQueue.push({ cmd: 'START_FP', fingerprintId });
  res.json({ ok: true });
});

// GET /api/fp-status   - polled by the website while showing "scan your fingerprint"
app.get('/api/fp-status', (req, res) => {
  res.json(fpStatus);
});

// ---------- 3. ORDER -> DISPENSING ----------
// POST /api/order   body: { "items": [ { "gate": 0, "grams": 1000 }, ... ] }
app.post('/api/order', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || items.length === 0) {
      return res.json({ status: 'fail' });
    }

    // Queue one DISPENSE command per item, then ALL_DONE at the end
    items.forEach(item => {
      commandQueue.push({ cmd: 'DISPENSE', gate: item.gate, grams: item.grams });
    });
    commandQueue.push({ cmd: 'ALL_DONE' });

    activeOrderTotalItems = items.length;
    orderStatus = {
      currentGate: items[0].gate,
      completedGates: [],
      allDone: false
    };

    res.json({ status: 'ok' });
  } catch (err) {
    console.error(err);
    res.json({ status: 'fail' });
  }
});

// GET /api/order-status   - polled by the website while dispensing
app.get('/api/order-status', (req, res) => {
  res.json(orderStatus);
});

// ---------- 4. HARDWARE POLLING & REPORTING (used by the ESP8266 only) ----------
// GET /api/device/next-command   - polled by the ESP8266 every ~1.5s
app.get('/api/device/next-command', (req, res) => {
  if (commandQueue.length === 0) {
    return res.json({ cmd: 'NONE' });
  }
  const nextCommand = commandQueue.shift();
  res.json(nextCommand);
});

// POST /api/device/report   body: { "event": "FP_OK"|"FP_FAIL"|"ITEM_DONE", ... }
app.post('/api/device/report', (req, res) => {
  const { event, gate } = req.body;

  if (event === 'FP_OK') {
    fpStatus = { status: 'ok' };
  } else if (event === 'FP_FAIL') {
    fpStatus = { status: 'fail' };
  } else if (event === 'ITEM_DONE') {
    orderStatus.completedGates.push(gate);
    if (orderStatus.completedGates.length >= activeOrderTotalItems) {
      orderStatus.allDone = true;
      orderStatus.currentGate = null;
    } else {
      // advance currentGate to whichever queued DISPENSE command is still next
      const nextDispense = commandQueue.find(c => c.cmd === 'DISPENSE');
      orderStatus.currentGate = nextDispense ? nextDispense.gate : null;
    }
  }

  res.json({ ok: true });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
