const bondMetadata = {
    BND: {
        category: "aggregate",
        categoryName: "Aggregate Bond Market"
    },

    TLT: {
        category: "treasury",
        categoryName: "Long-Term Treasury"
    },

    IEF: {
        category: "treasury",
        categoryName: "Intermediate Treasury"
    },

    HYG: {
        category: "high-yield",
        categoryName: "High-Yield Corporate"
    },

    LQD: {
        category: "corporate",
        categoryName: "Investment-Grade Corporate"
    },

    BGRN: {
        category: "green",
        categoryName: "Green Bonds"
    }
};

let bonds = [];
let comparisonChart = null;
const tickerInput = document.getElementById("tickerInput");
const searchButton = document.getElementById("searchButton");

const assetSection = document.getElementById("assetSection");
const errorMessage = document.getElementById("errorMessage");

let priceChart = null;

searchButton.addEventListener("click", searchTicker);

tickerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        searchTicker();
    }
});

async function searchTicker() {

    const ticker = tickerInput.value.trim().toUpperCase();

    if (!ticker) {
        return;
    }

    errorMessage.textContent = "";

    try {

        const assetResponse = await fetch(`/assets/${ticker}`);

        if (!assetResponse.ok) {
            throw new Error("Ticker not found");
        }

        const asset = await assetResponse.json();

        const historyResponse = await fetch(
            `/assets/${ticker}/history?limit=90`
        );

        if (!historyResponse.ok) {
            throw new Error("Price history unavailable");
        }

        const history = await historyResponse.json();

        displayAsset(asset);
        displayChart(ticker, history);

    } catch (error) {

        assetSection.classList.add("hidden");

        errorMessage.textContent = error.message;
    }
}

function formatNumber(value, decimals = 2) {

    if (value === null || value === undefined) {
        return "N/A";
    }

    return Number(value).toFixed(decimals);
}

function displayAsset(asset) {

    document.getElementById("assetTitle").textContent =
        `${asset.ticker} — ${asset.company_name}`;

    document.getElementById("close").textContent =
        `$${formatNumber(asset.close)}`;

    document.getElementById("dailyReturn").textContent =
        `${formatNumber(asset.daily_return_pct)}%`;

    document.getElementById("movingAverage").textContent =
        `$${formatNumber(asset.moving_avg_20d)}`;

    document.getElementById("volatility20").textContent =
        `${formatNumber(asset.volatility_20d_pct)}%`;

    document.getElementById("volatility60").textContent =
        `${formatNumber(asset.volatility_60d_pct)}%`;

    assetSection.classList.remove("hidden");
}

function displayChart(ticker, history) {

    const labels = history.map(row => row.date);

    const prices = history.map(row => Number(row.close));

    if (priceChart) {
        priceChart.destroy();
    }

    const context = document
        .getElementById("priceChart")
        .getContext("2d");

    priceChart = new Chart(context, {
        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: `${ticker} Closing Price`,
                data: prices,
                tension: 0.2
            }]
        },

        options: {
            responsive: true,

            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}
async function loadBonds() {

    try {

        const response = await fetch("/bonds");

        if (!response.ok) {
            throw new Error("Unable to load bonds");
        }

        bonds = await response.json();

        renderBonds(bonds);
        populateBondSelectors();

    } catch (error) {

        console.error(error);
    }
}

loadBonds();
function renderBonds(bondsToRender) {

    const bondList = document.getElementById("bondList");

    bondList.innerHTML = "";

    bondsToRender.forEach(bond => {

        const metadata = bondMetadata[bond.ticker];

        if (!metadata) {
            return;
        }

        const card = document.createElement("div");

        card.className = "bond-card";

        card.innerHTML = `
            <h3>${bond.ticker}</h3>

            <p class="bond-category">
                ${metadata.categoryName}
            </p>

            <p>
                ${bond.company_name}
            </p>

            <div class="bond-metric">
                <span>20D Volatility</span>
                <strong>
                    ${formatNumber(bond.volatility_20d_pct)}%
                </strong>
            </div>

            <div class="bond-metric">
                <span>60D Volatility</span>
                <strong>
                    ${formatNumber(bond.volatility_60d_pct)}%
                </strong>
            </div>

            <div class="bond-metric">
                <span>Risk</span>
                <strong>
                    ${bond.risk_level}
                </strong>
            </div>
        `;

        bondList.appendChild(card);
    });
}
document.querySelectorAll(".bond-filter").forEach(button => {

    button.addEventListener("click", () => {

        document
            .querySelectorAll(".bond-filter")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        const type = button.dataset.type;

        if (type === "all") {
            renderBonds(bonds);
            return;
        }

        const filtered = bonds.filter(bond => {

            const metadata = bondMetadata[bond.ticker];

            return metadata &&
                   metadata.category === type;
        });

        renderBonds(filtered);
    });
});
function populateBondSelectors() {

    const bondA = document.getElementById("bondA");
    const bondB = document.getElementById("bondB");

    bonds.forEach(bond => {

        const optionA = document.createElement("option");
        optionA.value = bond.ticker;
        optionA.textContent = bond.ticker;

        const optionB = document.createElement("option");
        optionB.value = bond.ticker;
        optionB.textContent = bond.ticker;

        bondA.appendChild(optionA);
        bondB.appendChild(optionB);
    });
}