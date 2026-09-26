// =========================
// LOGIN SESSION CHECK
// =========================

const currentPage =
    window.location.pathname.split("/").pop();

if (currentPage === "index.html" || currentPage === "") {

    const loggedInUser =
        localStorage.getItem("loggedInUser");

    if (loggedInUser) {
        window.location.replace("verify.html");
    }
}


// =========================
// LOGIN
// =========================

const loginForm =
    document.getElementById("loginForm");
const API_BASE_URL = window.location.origin;

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const userId =
                document.getElementById("userId").value.trim();

            const password =
                document.getElementById("password").value.trim();

            const errorMessage =
                document.getElementById("errorMessage");

            if (!userId || !password) {
                errorMessage.textContent = "Please enter User ID and Password.";
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: userId,
                        password: password
                    })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    errorMessage.textContent = data.error || 'Invalid User ID or Password!';
                    return;
                }

                localStorage.setItem(
                    "loggedInUser",
                    data.user.username || userId
                );

                window.location.replace(
                    "verify.html"
                );
            } catch (error) {
                errorMessage.textContent = 'Login failed. Please try again later.';
            }

        }
    );

}


// =========================
// LOGOUT
// =========================

const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "loggedInUser"
            );

            localStorage.removeItem(
                "selectedCommodities"
            );

            localStorage.removeItem(
                "totalAmount"
            );

            window.location.replace(
                "index.html"
            );

        }
    );

}


// =========================
// SMART CARD SCANNING
// =========================

const scanButton =
    document.getElementById("scanButton");

const scanArea =
    document.getElementById("scanArea");

const scanningMessage =
    document.getElementById("scanningMessage");

const cardDetails =
    document.getElementById("cardDetails");

const continueButton =
    document.getElementById("continueButton");

const familySection =
    document.getElementById("familySection");

const cardNumberInput =
    document.getElementById("cardNumberInput");

const cardErrorMessage =
    document.getElementById("cardErrorMessage");

const familyMemberList =
    document.getElementById("familyMemberList");

const cardHolderName =
    document.getElementById("cardHolderName");

const cardNumberValue =
    document.getElementById("cardNumberValue");

const cardTypeValue =
    document.getElementById("cardTypeValue");

const familyMembersValue =
    document.getElementById("familyMembersValue");

const cardAddressValue =
    document.getElementById("cardAddressValue");

const fpsCodeValue =
    document.getElementById("fpsCodeValue");

const cardStatusValue =
    document.getElementById("cardStatusValue");


// Initially hide family section

if (familySection) {
    familySection.style.display = "none";
}


function renderFamilyMembers(members) {
    if (!familyMemberList) return;

    familyMemberList.innerHTML = "";

    members.forEach((member) => {
        const memberCard = document.createElement("div");
        memberCard.className = "family-member";

        memberCard.innerHTML = `
            <div class="member-info">
                <div class="member-icon">👤</div>
                <div>
                    <h3>${member.name || 'Family Member'}</h3>
                    <p>${member.relation || 'Family Member'}</p>
                </div>
            </div>
            <button
                type="button"
                class="select-member"
                data-member-id="${member.member_id || ''}"
                data-fingerprint-id="${member.fingerprint_id || ''}"
                data-member="${member.name || 'Family Member'}"
            >
                SELECT
            </button>
        `;

        familyMemberList.appendChild(memberCard);
    });

    document.querySelectorAll(".select-member").forEach((button) => {
        button.addEventListener("click", function () {
            const member = button.getAttribute("data-member");
            const memberId = button.getAttribute("data-member-id");
            const fingerprintId = button.getAttribute("data-fingerprint-id");

            localStorage.setItem("selectedMember", member);
            localStorage.setItem("selectedMemberId", memberId || '');
            localStorage.setItem("selectedFingerprintId", fingerprintId || '');

            const selectedMemberName = document.getElementById("selectedMemberName");
            if (selectedMemberName) {
                selectedMemberName.textContent = member;
            }

            if (familySection) {
                familySection.style.display = "none";
            }

            const fingerprintSection = document.getElementById("fingerprintSection");
            if (fingerprintSection) {
                fingerprintSection.style.display = "block";
            }
        });
    });
}


if (scanButton) {
    scanButton.addEventListener("click", async function () {
        let cardNumber = cardNumberInput ? cardNumberInput.value.trim() : "";

        if (!cardNumber) {
            cardNumber = window.prompt("Please enter the smart card number:");
        }

        if (!cardNumber) {
            if (cardErrorMessage) {
                cardErrorMessage.textContent = "A card number is required.";
            }
            return;
        }

        if (scanArea) scanArea.style.display = "none";
        if (scanningMessage) scanningMessage.style.display = "block";
        if (cardErrorMessage) cardErrorMessage.textContent = "";

        try {
            const response = await fetch(`${API_BASE_URL}/api/verify/${encodeURIComponent(cardNumber)}`);
            const data = await response.json();

            if (!response.ok || !data.cardNumber) {
                throw new Error(data.error || "Card not found");
            }

            localStorage.setItem("selectedCardId", data.cardId || "");
            localStorage.setItem("selectedCardNumber", data.cardNumber || cardNumber);

            if (cardHolderName) cardHolderName.textContent = data.name || "-";
            if (cardNumberValue) cardNumberValue.textContent = data.cardNumber || "-";
            if (cardTypeValue) cardTypeValue.textContent = data.cardType || "-";
            if (familyMembersValue) familyMembersValue.textContent = data.familyMembers || 0;
            if (cardAddressValue) cardAddressValue.textContent = data.address || "-";
            if (fpsCodeValue) fpsCodeValue.textContent = data.fpsCode || "N/A";
            if (cardStatusValue) cardStatusValue.textContent = data.status || "ACTIVE";

            if (Array.isArray(data.members)) {
                renderFamilyMembers(data.members);
            }

            if (familySection) {
                familySection.style.display = "block";
            }

            if (cardDetails) {
                cardDetails.style.display = "block";
            }
        } catch (error) {
            if (cardErrorMessage) {
                cardErrorMessage.textContent = error.message || "Unable to verify card.";
            }
            if (scanArea) scanArea.style.display = "block";
        } finally {
            if (scanningMessage) scanningMessage.style.display = "none";
        }
    });
}


// =========================
// SMART CARD CONTINUE
// =========================

if (continueButton) {
    continueButton.addEventListener("click", function () {
        if (cardDetails) {
            cardDetails.style.display = "none";
        }

        if (familySection) {
            familySection.style.display = "block";
        }
    });
}


// =========================
// FAMILY MEMBER SELECTION
// =========================

const fingerprintSection =
    document.getElementById("fingerprintSection");

const selectedMemberName =
    document.getElementById("selectedMemberName");

if (fingerprintSection) {
    fingerprintSection.style.display = "none";
}


// =========================
// FINGERPRINT ELEMENTS
// =========================

const fingerprintButton =
    document.getElementById(
        "fingerprintButton"
    );

const fingerprintScanner =
    document.getElementById(
        "fingerprintScanner"
    );

const fingerprintScanning =
    document.getElementById(
        "fingerprintScanning"
    );

const fingerprintVerifying =
    document.getElementById(
        "fingerprintVerifying"
    );

const fingerprintSuccess =
    document.getElementById(
        "fingerprintSuccess"
    );

const fingerprintError =
    document.getElementById(
        "fingerprintError"
    );

const retryFingerprint =
    document.getElementById(
        "retryFingerprint"
    );


// =========================
// INITIAL FINGERPRINT STATE
// =========================

if (fingerprintScanning) {

    fingerprintScanning.style.display =
        "none";

}

if (fingerprintVerifying) {

    fingerprintVerifying.style.display =
        "none";

}

if (fingerprintSuccess) {

    fingerprintSuccess.style.display =
        "none";

}

if (fingerprintError) {

    fingerprintError.style.display =
        "none";

}


// =========================
// FINGERPRINT SCAN
// =========================

if (fingerprintButton) {
    fingerprintButton.addEventListener("click", async function () {
        const selectedMemberId = localStorage.getItem("selectedMemberId");
        const selectedFingerprintId = localStorage.getItem("selectedFingerprintId") || "0";

        if (!selectedMemberId) {
            showFingerprintError();
            return;
        }

        if (fingerprintScanner) fingerprintScanner.style.display = "none";
        if (fingerprintScanning) fingerprintScanning.style.display = "block";

        try {
            const response = await fetch(`${API_BASE_URL}/api/select-member`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    memberId: Number(selectedMemberId),
                    fingerprintId: Number(selectedFingerprintId)
                })
            });

            if (!response.ok) {
                throw new Error('Fingerprint request failed');
            }

            if (fingerprintScanning) fingerprintScanning.style.display = "none";
            if (fingerprintVerifying) fingerprintVerifying.style.display = "block";

            const deadline = Date.now() + 20000;
            while (Date.now() < deadline) {
                const statusResponse = await fetch(`${API_BASE_URL}/api/fp-status`);
                const statusData = await statusResponse.json();

                if (statusData.status === 'ok') {
                    if (fingerprintVerifying) fingerprintVerifying.style.display = "none";
                    showFingerprintSuccess();
                    return;
                }

                if (statusData.status === 'fail') {
                    if (fingerprintVerifying) fingerprintVerifying.style.display = "none";
                    showFingerprintError();
                    return;
                }

                await new Promise((resolve) => setTimeout(resolve, 1200));
            }

            if (fingerprintVerifying) fingerprintVerifying.style.display = "none";
            showFingerprintError();
        } catch (error) {
            if (fingerprintScanning) fingerprintScanning.style.display = "none";
            if (fingerprintVerifying) fingerprintVerifying.style.display = "none";
            showFingerprintError();
        }
    });
}


// =========================
// FINGERPRINT SUCCESS
// =========================

function showFingerprintSuccess() {

    if (!fingerprintSuccess) {
        return;
    }


    fingerprintSuccess.style.display =
        "block";


    /*
     * After success animation,
     * automatically go to commodities.
     */

    setTimeout(
        function () {

            window.location.replace(
                "commodities.html"
            );

        },
        2500
    );

}


// =========================
// FINGERPRINT ERROR
// =========================

function showFingerprintError() {

    if (!fingerprintError) {
        return;
    }


    fingerprintError.style.display =
        "block";

}


// =========================
// RETRY FINGERPRINT
// =========================

if (retryFingerprint) {

    retryFingerprint.addEventListener(
        "click",
        function () {

            fingerprintError.style.display =
                "none";

            fingerprintScanner.style.display =
                "block";

        }
    );

}


// =========================
// COMMODITIES PAGE
// =========================

const commodityPrices = {

    rice: 2,
    wheat: 3,
    sugar: 25,
    dal: 20,
    oil: 50

};


const commodityQuantities = {

    rice: 0,
    wheat: 0,
    sugar: 0,
    dal: 0,
    oil: 0

};


// =========================
// PLUS BUTTONS
// =========================

const plusButtons =
    document.querySelectorAll(
        ".plus"
    );


plusButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const item =
                    button.getAttribute(
                        "data-item"
                    );


                commodityQuantities[item]++;


                updateCommodityPage();

            }
        );

    }
);


// =========================
// MINUS BUTTONS
// =========================

const minusButtons =
    document.querySelectorAll(
        ".minus"
    );


minusButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const item =
                    button.getAttribute(
                        "data-item"
                    );


                if (
                    commodityQuantities[item] > 0
                ) {

                    commodityQuantities[item]--;

                }


                updateCommodityPage();

            }
        );

    }
);


// =========================
// UPDATE COMMODITY PAGE
// =========================

function updateCommodityPage() {

    for (
        const item in commodityQuantities
    ) {

        const quantityElement =
            document.getElementById(
                item + "Quantity"
            );


        if (quantityElement) {

            quantityElement.textContent =
                commodityQuantities[item];

        }

    }


    let total = 0;


    for (
        const item in commodityQuantities
    ) {

        total +=
            commodityQuantities[item] *
            commodityPrices[item];

    }


    const totalElement =
        document.getElementById(
            "totalAmount"
        );


    if (totalElement) {

        totalElement.textContent =
            "₹" + total;

    }

}


// =========================
// PROCEED TO PAYMENT
// =========================

const paymentButton =
    document.getElementById(
        "paymentButton"
    );


if (paymentButton) {

    paymentButton.addEventListener(
        "click",
        function () {

            let total = 0;

            let selectedItems = {};


            for (
                const item in commodityQuantities
            ) {

                const quantity =
                    commodityQuantities[item];


                if (quantity > 0) {

                    selectedItems[item] =
                        quantity;


                    total +=
                        quantity *
                        commodityPrices[item];

                }

            }


            const error =
                document.getElementById(
                    "commodityError"
                );


            if (total === 0) {

                error.textContent =
                    "Please select at least one commodity.";

                return;

            }


            const productCatalog = {
                rice: { productId: 1, price: 2 },
                wheat: { productId: 2, price: 3 },
                sugar: { productId: 3, price: 25 },
                dal: { productId: 4, price: 20 },
                oil: { productId: 5, price: 50 }
            };

            const normalizedItems = {};
            Object.keys(selectedItems).forEach((key) => {
                normalizedItems[key] = {
                    ...productCatalog[key],
                    quantity: selectedItems[key]
                };
            });

            localStorage.setItem(
                "selectedCommodities",
                JSON.stringify(normalizedItems)
            );

            localStorage.setItem(
                "totalAmount",
                total
            );

            window.location.href =
                "payment.html";

        }
    );

}


// =========================
// PAYMENT PAGE
// =========================

const billItems =
    document.getElementById(
        "billItems"
    );

const paymentTotal =
    document.getElementById(
        "paymentTotal"
    );

const confirmPaymentButton =
    document.getElementById(
        "confirmPaymentButton"
    );

const paymentSuccess =
    document.getElementById(
        "paymentSuccess"
    );

const paymentMessage =
    document.getElementById(
        "paymentMessage"
    );

const finishButton =
    document.getElementById(
        "finishButton"
    );


// =========================
// DISPLAY BILL
// =========================

if (
    billItems &&
    paymentTotal
) {

    const selectedCommodities =
        JSON.parse(
            localStorage.getItem(
                "selectedCommodities"
            )
        ) || {};


    const totalAmount =
        Number(
            localStorage.getItem(
                "totalAmount"
            )
        ) || 0;


    const commodityNames = {

        rice: "Rice",
        wheat: "Wheat",
        sugar: "Sugar",
        dal: "Dal",
        oil: "Cooking Oil"

    };


    const prices = {

        rice: 2,
        wheat: 3,
        sugar: 25,
        dal: 20,
        oil: 50

    };


    for (
        const item in selectedCommodities
    ) {

        const quantity =
            selectedCommodities[item];

        const price =
            prices[item];

        const itemTotal =
            quantity * price;


        const billItem =
            document.createElement(
                "div"
            );


        billItem.className =
            "bill-item";


        billItem.innerHTML = `

            <span>
                ${commodityNames[item]}
                × ${quantity}
            </span>

            <strong>
                ₹${itemTotal}
            </strong>

        `;


        billItems.appendChild(
            billItem
        );

    }


    paymentTotal.textContent =
        "₹" + totalAmount;

}


// =========================
// PAYMENT CONFIRMATION
// =========================

if (confirmPaymentButton) {
    confirmPaymentButton.addEventListener("click", async function () {
        const selectedCommodities = JSON.parse(localStorage.getItem("selectedCommodities") || '{}');
        const totalAmount = Number(localStorage.getItem("totalAmount") || 0);
        const cardId = Number(localStorage.getItem("selectedCardId") || 1);
        const memberId = Number(localStorage.getItem("selectedMemberId") || 1);
        const workerId = Number(localStorage.getItem("loggedInUser") || 1);

        const items = Object.entries(selectedCommodities).map(([key, value]) => ({
            productId: Number(value.productId || 1),
            quantityOrdered: Number(value.quantity || 0),
            pricePerUnit: Number(value.price || 0)
        })).filter(item => item.quantityOrdered > 0);

        if (items.length === 0) {
            paymentMessage.textContent = 'No commodities selected.';
            return;
        }

        confirmPaymentButton.style.display = "none";
        paymentMessage.style.display = "block";
        paymentMessage.textContent = "Verifying payment...";

        try {
            const response = await fetch(`${API_BASE_URL}/api/transaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cardId,
                    memberId,
                    workerId,
                    paymentMethod: 'upi',
                    amountReceived: totalAmount,
                    items
                })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Transaction failed');
            }

            paymentMessage.style.display = "none";
            paymentSuccess.style.display = "block";
        } catch (error) {
            paymentMessage.textContent = error.message || 'Payment verification failed.';
            confirmPaymentButton.style.display = "block";
        }
    });
}


// =========================
// FINISH PAYMENT
// =========================

if (finishButton) {

    finishButton.addEventListener(
        "click",
        function () {

            localStorage.removeItem(
                "selectedCommodities"
            );

            localStorage.removeItem(
                "totalAmount"
            );


            /*
             * loggedInUser is NOT removed.
             *
             * So user stays logged in.
             */


            window.location.replace(
                "verify.html"
            );

        }
    );

}