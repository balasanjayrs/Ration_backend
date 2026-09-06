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

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const userId =
                document.getElementById("userId").value.trim();

            const password =
                document.getElementById("password").value.trim();

            const errorMessage =
                document.getElementById("errorMessage");


            // Dummy users

            const users = {

                "user001": "ration123",
                "user002": "smart456",
                "user003": "demo789"

            };


            if (users[userId] === password) {

                localStorage.setItem(
                    "loggedInUser",
                    userId
                );

                window.location.replace(
                    "verify.html"
                );

            } else {

                errorMessage.textContent =
                    "Invalid User ID or Password!";

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


// Initially hide family section

if (familySection) {

    familySection.style.display =
        "none";

}


if (scanButton) {

    scanButton.addEventListener(
        "click",
        function () {

            scanArea.style.display =
                "none";

            scanningMessage.style.display =
                "block";


            // Simulated smart card scan

            setTimeout(
                function () {

                    scanningMessage.style.display =
                        "none";

                    cardDetails.style.display =
                        "block";

                },
                2000
            );

        }
    );

}


// =========================
// SMART CARD CONTINUE
// =========================

if (continueButton) {

    continueButton.addEventListener(
        "click",
        function () {

            // Hide card details

            cardDetails.style.display =
                "none";


            // Show family members

            if (familySection) {

                familySection.style.display =
                    "block";

            }

        }
    );

}


// =========================
// FAMILY MEMBER SELECTION
// =========================

const memberButtons =
    document.querySelectorAll(
        ".select-member"
    );

const fingerprintSection =
    document.getElementById(
        "fingerprintSection"
    );

const selectedMemberName =
    document.getElementById(
        "selectedMemberName"
    );


// Initially hide fingerprint section

if (fingerprintSection) {

    fingerprintSection.style.display =
        "none";

}


memberButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const member =
                    button.getAttribute(
                        "data-member"
                    );


                // Save selected member

                localStorage.setItem(
                    "selectedMember",
                    member
                );


                // Display selected member

                if (selectedMemberName) {

                    selectedMemberName.textContent =
                        member;

                }


                // Hide family section

                if (familySection) {

                    familySection.style.display =
                        "none";

                }


                // Show fingerprint section

                if (fingerprintSection) {

                    fingerprintSection.style.display =
                        "block";

                }

            }
        );

    }
);


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

    fingerprintButton.addEventListener(
        "click",
        function () {

            // Hide scanner

            fingerprintScanner.style.display =
                "none";


            // Show scanning animation

            fingerprintScanning.style.display =
                "block";


            // Simulate fingerprint scanning

            setTimeout(
                function () {

                    fingerprintScanning.style.display =
                        "none";


                    // Show verification

                    fingerprintVerifying.style.display =
                        "block";


                    // Simulate verification

                    setTimeout(
                        function () {

                            fingerprintVerifying.style.display =
                                "none";


                            /*
                             * DEMO MODE
                             *
                             * For now fingerprint is
                             * simulated as correct.
                             */

                            const fingerprintMatched =
                                true;


                            if (
                                fingerprintMatched
                            ) {

                                showFingerprintSuccess();

                            } else {

                                showFingerprintError();

                            }

                        },
                        2000
                    );

                },
                2500
            );

        }
    );

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


            localStorage.setItem(
                "selectedCommodities",
                JSON.stringify(selectedItems)
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

    confirmPaymentButton.addEventListener(
        "click",
        function () {

            confirmPaymentButton.style.display =
                "none";


            paymentMessage.style.display =
                "block";

            paymentMessage.textContent =
                "Verifying payment...";


            setTimeout(
                function () {

                    paymentMessage.style.display =
                        "none";


                    paymentSuccess.style.display =
                        "block";

                },
                1500
            );

        }
    );

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