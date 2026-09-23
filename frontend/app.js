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


const featuredTickers = [
    "SPY",
    "QQQ",
    "TLT",
    "HYG",
    "GLD",
    "^VIX"
];


let bonds = [];

let priceChart = null;
let comparisonChart = null;


/* -----------------------------
   Tabs
----------------------------- */

document
    .querySelectorAll(".tab-button")
    .forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".tab-button")
                .forEach(item =>
                    item.classList.remove("active")
                );

            document
                .querySelectorAll(".tab-page")
                .forEach(page =>
                    page.classList.remove("active")
                );

            button.classList.add("active");

            const tab = button.dataset.tab;

            document
                .getElementById(tab)
                .classList.add("active");
        });
    });


/* -----------------------------
   Search
----------------------------- */

const tickerInput =
    document.getElementById("tickerInput");

const searchButton =
    document.getElementById("searchButton");

const assetSection =
    document.getElementById("assetSection");

const errorMessage =
    document.getElementById("errorMessage");


searchButton.addEventListener(
    "click",
    searchTicker
);


tickerInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            searchTicker();
        }
    }
);


async function searchTicker() {

    const ticker =
        tickerInput.value
            .trim()
            .toUpperCase();

    if (!ticker) {
        return;
    }

    await showAsset(ticker);
}


async function showAsset(ticker) {

    errorMessage.textContent = "";

    try {

        const assetResponse =
            await fetch(`/assets/${encodeURIComponent(ticker)}`);

        if (!assetResponse.ok) {
            throw new Error("Ticker not found.");
        }

        const asset =
            await assetResponse.json();


        const historyResponse =
            await fetch(
                `/assets/${encodeURIComponent(ticker)}/history?limit=90`
            );

        if (!historyResponse.ok) {
            throw new Error(
                "Price history unavailable."
            );
        }

        const history =
            await historyResponse.json();


        displayAsset(asset);

        displayChart(
            ticker,
            history
        );


        assetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {

        assetSection.classList.add("hidden");

        errorMessage.textContent =
            error.message;
    }
}


/* -----------------------------
   Asset details
----------------------------- */

function formatNumber(
    value,
    decimals = 2
) {

    if (
        value === null ||
        value === undefined
    ) {
        return "N/A";
    }

    return Number(value)
        .toFixed(decimals);
}


function displayAsset(asset) {

    document
        .getElementById("assetTitle")
        .textContent =
            `${asset.ticker} — ${asset.company_name}`;


    document
        .getElementById("close")
        .textContent =
            `$${formatNumber(asset.close)}`;


    document
        .getElementById("dailyReturn")
        .textContent =
            `${formatNumber(
                asset.daily_return_pct
            )}%`;


    document
        .getElementById("movingAverage")
        .textContent =
            `$${formatNumber(
                asset.moving_avg_20d
            )}`;


    document
        .getElementById("volatility20")
        .textContent =
            `${formatNumber(
                asset.volatility_20d_pct
            )}%`;


    document
        .getElementById("volatility60")
        .textContent =
            `${formatNumber(
                asset.volatility_60d_pct
            )}%`;


    assetSection.classList.remove("hidden");
}


function displayChart(
    ticker,
    history
) {

    const labels =
        history.map(row => row.date);

    const prices =
        history.map(
            row => Number(row.close)
        );


    if (priceChart) {
        priceChart.destroy();
    }


    priceChart =
        new Chart(
            document
                .getElementById("priceChart"),

            {
                type: "line",

                data: {

                    labels,

                    datasets: [{
                        label:
                            `${ticker} closing price`,

                        data: prices,

                        tension: 0.25,

                        pointRadius: 0,

                        borderWidth: 2
                    }]
                },

                options: {

                    responsive: true,

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    scales: {

                        y: {
                            beginAtZero: false
                        }
                    }
                }
            }
        );
}


/* -----------------------------
   Featured markets
----------------------------- */

async function loadFeaturedMarkets() {

    const container =
        document.getElementById(
            "featuredMarkets"
        );


    for (
        const ticker of featuredTickers
    ) {

        try {

            const response =
                await fetch(
                    `/assets/${encodeURIComponent(ticker)}`
                );

            if (!response.ok) {
                continue;
            }

            const asset =
                await response.json();


            const card =
                document.createElement("div");


            card.className =
                "feature-card";


            card.innerHTML = `
                <h3>${asset.ticker}</h3>

                <div class="card-subtitle">
                    ${asset.company_name}
                </div>

                <div class="card-price">
                    $${formatNumber(asset.close)}
                </div>

                <div class="bond-metric">
                    <span>Daily return</span>
                    <strong>
                        ${formatNumber(asset.daily_return_pct)}%
                    </strong>
                </div>

                <div class="bond-metric">
                    <span>20D volatility</span>
                    <strong>
                        ${formatNumber(asset.volatility_20d_pct)}%
                    </strong>
                </div>
            `;


            card.addEventListener(
                "click",
                () => {

                    tickerInput.value =
                        ticker;

                    showAsset(ticker);
                }
            );


            container.appendChild(card);

        } catch (error) {

            console.error(
                `Unable to load ${ticker}`,
                error
            );
        }
    }
}


/* -----------------------------
   Bonds
----------------------------- */

async function loadBonds() {

    try {

        const response =
            await fetch("/bonds");


        if (!response.ok) {

            throw new Error(
                "Unable to load bonds"
            );
        }


        bonds =
            await response.json();


        renderBonds(bonds);

        populateBondSelectors();

    } catch (error) {

        console.error(error);
    }
}


function renderBonds(
    bondsToRender
) {

    const bondList =
        document.getElementById(
            "bondList"
        );


    bondList.innerHTML = "";


    bondsToRender.forEach(
        bond => {

            const metadata =
                bondMetadata[bond.ticker];


            if (!metadata) {
                return;
            }


            const card =
                document.createElement("div");


            card.className =
                "bond-card";


            card.innerHTML = `
                <h3>${bond.ticker}</h3>

                <div class="bond-category">
                    ${metadata.categoryName}
                </div>

                <p>
                    ${bond.company_name}
                </p>

                <div class="bond-metric">
                    <span>20D volatility</span>

                    <strong>
                        ${formatNumber(
                            bond.volatility_20d_pct
                        )}%
                    </strong>
                </div>

                <div class="bond-metric">
                    <span>60D volatility</span>

                    <strong>
                        ${formatNumber(
                            bond.volatility_60d_pct
                        )}%
                    </strong>
                </div>

                <div class="bond-metric">
                    <span>Risk level</span>

                    <strong>
                        ${bond.risk_level}
                    </strong>
                </div>
            `;


            card.addEventListener(
                "click",
                () => {

                    tickerInput.value =
                        bond.ticker;

                    showAsset(
                        bond.ticker
                    );
                }
            );


            bondList.appendChild(card);
        }
    );
}


/* -----------------------------
   Bond filters
----------------------------- */

document
    .querySelectorAll(".bond-filter")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".bond-filter"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                const type =
                    button.dataset.type;


                if (type === "all") {

                    renderBonds(bonds);

                    return;
                }


                const filtered =
                    bonds.filter(
                        bond => {

                            const metadata =
                                bondMetadata[
                                    bond.ticker
                                ];


                            return (
                                metadata &&
                                metadata.category
                                    === type
                            );
                        }
                    );


                renderBonds(filtered);
            }
        );
    });


/* -----------------------------
   Comparison selectors
----------------------------- */

function populateBondSelectors() {

    const bondA =
        document.getElementById(
            "bondA"
        );

    const bondB =
        document.getElementById(
            "bondB"
        );


    bonds.forEach(
        bond => {

            const label =
                `${bond.ticker} — ${
                    bondMetadata[bond.ticker]
                        ?.categoryName || ""
                }`;


            const optionA =
                document.createElement(
                    "option"
                );

            optionA.value =
                bond.ticker;

            optionA.textContent =
                label;


            const optionB =
                document.createElement(
                    "option"
                );

            optionB.value =
                bond.ticker;

            optionB.textContent =
                label;


            bondA.appendChild(
                optionA
            );

            bondB.appendChild(
                optionB
            );
        }
    );
}


/* -----------------------------
   Bond comparison
----------------------------- */

document
    .getElementById("compareButton")
    .addEventListener(
        "click",
        compareBonds
    );


async function compareBonds() {

    const tickerA =
        document
            .getElementById("bondA")
            .value;


    const tickerB =
        document
            .getElementById("bondB")
            .value;


    const error =
        document.getElementById(
            "comparisonError"
        );


    error.textContent = "";


    if (!tickerA || !tickerB) {

        error.textContent =
            "Select two bonds.";

        return;
    }


    if (tickerA === tickerB) {

        error.textContent =
            "Select two different bonds.";

        return;
    }


    try {

        const [
            assetAResponse,
            assetBResponse,
            historyAResponse,
            historyBResponse
        ] = await Promise.all([

            fetch(`/assets/${tickerA}`),

            fetch(`/assets/${tickerB}`),

            fetch(
                `/assets/${tickerA}/history?limit=90`
            ),

            fetch(
                `/assets/${tickerB}/history?limit=90`
            )
        ]);


        if (
            !assetAResponse.ok ||
            !assetBResponse.ok ||
            !historyAResponse.ok ||
            !historyBResponse.ok
        ) {

            throw new Error(
                "Unable to load comparison."
            );
        }


        const [
            assetA,
            assetB,
            historyA,
            historyB
        ] = await Promise.all([

            assetAResponse.json(),
            assetBResponse.json(),
            historyAResponse.json(),
            historyBResponse.json()
        ]);


        renderComparisonTable(
            assetA,
            assetB
        );


        renderComparisonChart(
            tickerA,
            tickerB,
            historyA,
            historyB
        );


        document
            .getElementById(
                "comparisonResult"
            )
            .classList.remove(
                "hidden"
            );

    } catch (err) {

        error.textContent =
            err.message;
    }
}


function renderComparisonTable(
    a,
    b
) {

    const container =
        document.getElementById(
            "comparisonCards"
        );


    container.innerHTML = `

        <table class="comparison-table">

            <thead>

                <tr>
                    <th>Metric</th>
                    <th>${a.ticker}</th>
                    <th>${b.ticker}</th>
                </tr>

            </thead>

            <tbody>

                <tr>
                    <td>Close</td>
                    <td>$${formatNumber(a.close)}</td>
                    <td>$${formatNumber(b.close)}</td>
                </tr>

                <tr>
                    <td>Daily return</td>

                    <td>
                        ${formatNumber(
                            a.daily_return_pct
                        )}%
                    </td>

                    <td>
                        ${formatNumber(
                            b.daily_return_pct
                        )}%
                    </td>
                </tr>

                <tr>
                    <td>20D volatility</td>

                    <td>
                        ${formatNumber(
                            a.volatility_20d_pct
                        )}%
                    </td>

                    <td>
                        ${formatNumber(
                            b.volatility_20d_pct
                        )}%
                    </td>
                </tr>

                <tr>
                    <td>60D volatility</td>

                    <td>
                        ${formatNumber(
                            a.volatility_60d_pct
                        )}%
                    </td>

                    <td>
                        ${formatNumber(
                            b.volatility_60d_pct
                        )}%
                    </td>
                </tr>

            </tbody>

        </table>
    `;
}


/* -----------------------------
   Normalized comparison chart
----------------------------- */

function normalizeHistory(
    history
) {

    if (!history.length) {
        return [];
    }


    const startingPrice =
        Number(
            history[0].close
        );


    return history.map(
        row => ({

            date: row.date,

            value:
                (
                    Number(row.close)
                    / startingPrice
                    - 1
                ) * 100
        })
    );
}


function renderComparisonChart(
    tickerA,
    tickerB,
    historyA,
    historyB
) {

    const normalizedA =
        normalizeHistory(historyA);

    const normalizedB =
        normalizeHistory(historyB);


    if (comparisonChart) {

        comparisonChart.destroy();
    }


    comparisonChart =
        new Chart(

            document.getElementById(
                "comparisonChart"
            ),

            {

                type: "line",

                data: {

                    labels:
                        normalizedA.map(
                            row => row.date
                        ),

                    datasets: [

                        {
                            label:
                                `${tickerA} return %`,

                            data:
                                normalizedA.map(
                                    row =>
                                        row.value
                                ),

                            pointRadius: 0,

                            borderWidth: 2,

                            tension: 0.2
                        },

                        {
                            label:
                                `${tickerB} return %`,

                            data:
                                normalizedB.map(
                                    row =>
                                        row.value
                                ),

                            pointRadius: 0,

                            borderWidth: 2,

                            tension: 0.2
                        }
                    ]
                },

                options: {

                    responsive: true,

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    plugins: {

                        title: {
                            display: true,
                            text:
                                "90-Day Relative Performance"
                        }
                    },

                    scales: {

                        y: {

                            ticks: {

                                callback:
                                    value =>
                                        `${value.toFixed(1)}%`
                            }
                        }
                    }
                }
            }
        );
}


/* -----------------------------
   Start application
----------------------------- */

loadBonds();
loadFeaturedMarkets();