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