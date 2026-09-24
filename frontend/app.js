const API_BASE_URL =
    window.location.hostname.endsWith("github.io")
        ? "https://market-risk-kdog.duckdns.org"
        : "";


function apiFetch(path, options = {}) {
    return window.fetch(
        `${API_BASE_URL}${path}`,
        options
    );
}

const bondMetadata = {
    BND: {
        segment: "aggregate",
        segmentName: "Aggregate Bond Market"
    },
    TLT: {
        segment: "treasury",
        segmentName: "Long-Term Treasury"
    },
    IEF: {
        segment: "treasury",
        segmentName: "Intermediate Treasury"
    },
    HYG: {
        segment: "high-yield",
        segmentName: "High-Yield Corporate"
    },
    LQD: {
        segment: "corporate",
        segmentName: "Investment-Grade Corporate"
    },
    BGRN: {
        segment: "green",
        segmentName: "Green Bonds"
    }
};


const featuredTickers = [
    "SPY",
    "QQQ",
    "AAPL",
    "TLT",
    "GLD",
    "^VIX"
];


const rangeLabels = {
    22: "1M",
    66: "3M",
    132: "6M",
    252: "1Y",
    756: "3Y",
    1260: "5Y",
    5000: "ALL"
};


// --------------------------------------------------
// State
// --------------------------------------------------

let assets = [];

let currentTicker = null;
let currentAsset = null;

let currentAssetFilter = "all";
let currentBondSegment = "all";

let priceRange = 132;
let comparisonRange = 132;

let comparisonTickerA = null;
let comparisonTickerB = null;

let priceChart = null;
let comparisonChart = null;

const miniCharts = new Map();


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatNumber(value, decimals = 2) {
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "N/A";
    }

    return Number(value).toFixed(decimals);
}


function formatPercent(value) {
    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {
        return "N/A";
    }

    return `${Number(value).toFixed(2)}%`;
}


function formatClose(asset) {
    if (
        !asset ||
        asset.close === null ||
        asset.close === undefined
    ) {
        return "N/A";
    }

    // Indices such as ^VIX, ^GSPC and ^TNX
    // are not displayed as dollar prices.
    if (asset.ticker?.startsWith("^")) {
        return formatNumber(asset.close);
    }

    return `$${formatNumber(asset.close)}`;
}


function humanizeAssetType(assetType) {
    if (!assetType) {
        return "Other";
    }

    return assetType
        .replaceAll("_", " ")
        .replace(/\b\w/g, letter =>
            letter.toUpperCase()
        );
}


function classifyAsset(asset) {
    const rawType =
        (asset.asset_type || "").toLowerCase();

    const ticker =
        asset.ticker || "";


    if (
        ticker.startsWith("^") ||
        rawType.includes("index")
    ) {
        return "index";
    }


    if (rawType.includes("bond")) {
        return "bond";
    }


    if (
        rawType.includes("stock") ||
        rawType.includes("equity_stock")
    ) {
        return "stock";
    }


    if (
        rawType.includes("equity") ||
        rawType.includes("market_etf")
    ) {
        return "equity";
    }


    if (rawType === "etf") {
        return "equity";
    }


    return "other";
}


function getAssetCategoryLabel(asset) {
    const bondInfo =
        bondMetadata[asset.ticker];


    if (bondInfo) {
        return bondInfo.segmentName;
    }


    const group =
        classifyAsset(asset);


    const labels = {
        stock: "Stock",
        equity: "Equity ETF",
        bond: "Bond ETF",
        index: "Market Index",
        other: humanizeAssetType(
            asset.asset_type
        )
    };


    return (
        labels[group] ||
        humanizeAssetType(asset.asset_type)
    );
}


function setSignedValueClass(
    element,
    value
) {
    element.classList.remove(
        "positive",
        "negative"
    );


    const numeric =
        Number(value);


    if (Number.isNaN(numeric)) {
        return;
    }


    if (numeric > 0) {
        element.classList.add(
            "positive"
        );
    }

    else if (numeric < 0) {
        element.classList.add(
            "negative"
        );
    }
}


// --------------------------------------------------
// Tabs
// --------------------------------------------------

function switchToTab(tabId) {

    document
        .querySelectorAll(".tab-button")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tabId
            );
        });


    document
        .querySelectorAll(".tab-page")
        .forEach(page => {

            page.classList.toggle(
                "active",
                page.id === tabId
            );
        });
}


document
    .querySelectorAll(".tab-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                switchToTab(
                    button.dataset.tab
                );
            }
        );
    });


// --------------------------------------------------
// Search
// --------------------------------------------------

const tickerInput =
    document.getElementById(
        "tickerInput"
    );


const searchButton =
    document.getElementById(
        "searchButton"
    );


const assetSection =
    document.getElementById(
        "assetSection"
    );


const errorMessage =
    document.getElementById(
        "errorMessage"
    );


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


// --------------------------------------------------
// Display selected asset
// --------------------------------------------------

async function showAsset(ticker) {

    currentTicker = ticker;

    errorMessage.textContent = "";


    try {

        const [
            assetResponse,
            historyResponse
        ] = await Promise.all([

            apiFetch(
                `/assets/${encodeURIComponent(ticker)}`
            ),

            apiFetch(
                `/assets/${encodeURIComponent(ticker)}/history?limit=${priceRange}`
            )
        ]);


        if (!assetResponse.ok) {
            throw new Error(
                "Ticker not found."
            );
        }


        if (!historyResponse.ok) {
            throw new Error(
                "Price history unavailable."
            );
        }


        const asset =
            await assetResponse.json();


        const history =
            await historyResponse.json();


        currentAsset =
            asset;


        displayAsset(asset);

        displayPriceChart(
            asset,
            history
        );


        assetSection
            .classList
            .remove("hidden");


        assetSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

    catch (error) {

        assetSection
            .classList
            .add("hidden");


        errorMessage.textContent =
            error.message;
    }
}


function displayAsset(asset) {

    document
        .getElementById("assetTitle")
        .textContent =
            `${asset.ticker} — ${asset.company_name}`;


    document
        .getElementById("assetCategory")
        .textContent =
            getAssetCategoryLabel(asset);


    document
        .getElementById("close")
        .textContent =
            formatClose(asset);


    const dailyReturn =
        document.getElementById(
            "dailyReturn"
        );


    dailyReturn.textContent =
        formatPercent(
            asset.daily_return_pct
        );


    setSignedValueClass(
        dailyReturn,
        asset.daily_return_pct
    );


    document
        .getElementById(
            "movingAverage"
        )
        .textContent =
            asset.ticker?.startsWith("^")
                ? formatNumber(
                    asset.moving_avg_20d
                )
                : `$${formatNumber(
                    asset.moving_avg_20d
                )}`;


    document
        .getElementById(
            "volatility20"
        )
        .textContent =
            formatPercent(
                asset.volatility_20d_pct
            );


    document
        .getElementById(
            "volatility60"
        )
        .textContent =
            formatPercent(
                asset.volatility_60d_pct
            );
}


// --------------------------------------------------
// Main price chart
// --------------------------------------------------

function displayPriceChart(
    asset,
    history
) {

    const labels =
        history.map(
            row => row.date
        );


    const prices =
        history.map(
            row => Number(row.close)
        );


    if (priceChart) {
        priceChart.destroy();
    }


    document
        .getElementById(
            "priceChartSubtitle"
        )
        .textContent =
            `${asset.ticker} closing price · ${
                rangeLabels[priceRange] ||
                "Custom"
            }`;


    priceChart =
        new Chart(

            document.getElementById(
                "priceChart"
            ),

            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                `${asset.ticker} closing price`,

                            data:
                                prices,

                            tension:
                                0.25,

                            pointRadius:
                                0,

                            borderWidth:
                                2
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        intersect:
                            false,

                        mode:
                            "index"
                    },

                    plugins: {

                        legend: {
                            display:
                                false
                        }
                    },

                    scales: {

                        y: {
                            beginAtZero:
                                false
                        }
                    }
                }
            }
        );
}


// --------------------------------------------------
// Main chart date range buttons
// --------------------------------------------------

document
    .querySelectorAll(
        "#priceRangeSelector button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                document
                    .querySelectorAll(
                        "#priceRangeSelector button"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                priceRange =
                    Number(
                        button.dataset.range
                    );


                if (
                    !currentTicker ||
                    !currentAsset
                ) {
                    return;
                }


                try {

                    const response =
                        await apiFetch(
                            `/assets/${encodeURIComponent(currentTicker)}/history?limit=${priceRange}`
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Unable to load this date range."
                        );
                    }


                    const history =
                        await response.json();


                    displayPriceChart(
                        currentAsset,
                        history
                    );

                }

                catch (error) {

                    errorMessage.textContent =
                        error.message;
                }
            }
        );
    });


// --------------------------------------------------
// Featured markets
// --------------------------------------------------

async function loadFeaturedMarkets() {

    const container =
        document.getElementById(
            "featuredMarkets"
        );


    container.innerHTML = "";


    const results =
        await Promise.allSettled(

            featuredTickers.map(
                async ticker => {

                    const [
                        assetResponse,
                        historyResponse
                    ] = await Promise.all([

                        apiFetch(
                            `/assets/${encodeURIComponent(ticker)}`
                        ),

                        apiFetch(
                            `/assets/${encodeURIComponent(ticker)}/history?limit=30`
                        )
                    ]);


                    if (
                        !assetResponse.ok ||
                        !historyResponse.ok
                    ) {

                        throw new Error(
                            `Unable to load ${ticker}`
                        );
                    }


                    return {

                        asset:
                            await assetResponse.json(),

                        history:
                            await historyResponse.json()
                    };
                }
            )
        );


    results.forEach(result => {

        if (
            result.status !==
            "fulfilled"
        ) {
            return;
        }


        const {
            asset,
            history
        } = result.value;


        renderFeaturedCard(
            asset,
            history
        );
    });
}


function renderFeaturedCard(
    asset,
    history
) {

    const container =
        document.getElementById(
            "featuredMarkets"
        );


    const card =
        document.createElement(
            "article"
        );


    const safeId =
        asset.ticker.replace(
            /[^A-Za-z0-9]/g,
            "_"
        );


    card.className =
        "feature-card";


    card.innerHTML = `

        <div class="feature-card-top">

            <div>

                <h3>
                    ${asset.ticker}
                </h3>

                <div class="card-subtitle">
                    ${asset.company_name}
                </div>

            </div>

            <span class="asset-type-pill">
                ${getAssetCategoryLabel(asset)}
            </span>

        </div>


        <div class="feature-card-stats">

            <div>

                <span>Close</span>

                <strong>
                    ${formatClose(asset)}
                </strong>

            </div>


            <div>

                <span>Daily return</span>

                <strong class="featured-return">
                    ${formatPercent(
                        asset.daily_return_pct
                    )}
                </strong>

            </div>

        </div>


        <div class="mini-chart-wrap">

            <canvas
                id="mini-${safeId}">
            </canvas>

        </div>


        <div class="feature-card-footer">

            <span>
                20D volatility
            </span>

            <strong>
                ${formatPercent(
                    asset.volatility_20d_pct
                )}
            </strong>

        </div>
    `;


    card.addEventListener(
        "click",
        () => {

            switchToTab(
                "overview"
            );


            tickerInput.value =
                asset.ticker;


            showAsset(
                asset.ticker
            );
        }
    );


    container.appendChild(
        card
    );


    const returnElement =
        card.querySelector(
            ".featured-return"
        );


    setSignedValueClass(
        returnElement,
        asset.daily_return_pct
    );


    const canvas =
        document.getElementById(
            `mini-${safeId}`
        );


    const values =
        history.map(
            row =>
                Number(row.close)
        );


    const existing =
        miniCharts.get(
            asset.ticker
        );


    if (existing) {
        existing.destroy();
    }


    const chart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels:
                        history.map(
                            row => row.date
                        ),

                    datasets: [

                        {
                            data:
                                values,

                            pointRadius:
                                0,

                            borderWidth:
                                1.8,

                            tension:
                                0.28
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    animation:
                        false,

                    plugins: {

                        legend: {
                            display:
                                false
                        },

                        tooltip: {
                            enabled:
                                false
                        }
                    },

                    scales: {

                        x: {
                            display:
                                false
                        },

                        y: {
                            display:
                                false
                        }
                    }
                }
            }
        );


    miniCharts.set(
        asset.ticker,
        chart
    );
}


// --------------------------------------------------
// Market Explorer
// --------------------------------------------------

async function loadAssets() {

    try {

        const response =
            await apiFetch("/assets");


        if (!response.ok) {

            throw new Error(
                "Unable to load assets."
            );
        }


        assets =
            await response.json();


        assets.sort(
            (a, b) =>
                a.ticker.localeCompare(
                    b.ticker
                )
        );


        renderExplorerAssets(
            assets
        );


        populateAssetSelectors();

    }

    catch (error) {

        console.error(
            error
        );
    }
}


function renderExplorerAssets(
    assetsToRender
) {

    const assetList =
        document.getElementById(
            "assetList"
        );


    assetList.innerHTML = "";


    if (
        !assetsToRender.length
    ) {

        assetList.innerHTML = `

            <div class="empty-state">
                No tracked instruments
                match this filter.
            </div>
        `;

        return;
    }


    assetsToRender.forEach(
        asset => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "asset-card";


            card.innerHTML = `

                <div class="asset-card-header">

                    <div>

                        <h3>
                            ${asset.ticker}
                        </h3>

                        <p>
                            ${asset.company_name}
                        </p>

                    </div>

                    <span class="asset-type-pill">
                        ${getAssetCategoryLabel(asset)}
                    </span>

                </div>


                <div class="asset-card-action">
                    View risk profile
                    <span aria-hidden="true">
                        →
                    </span>
                </div>
            `;


            card.addEventListener(
                "click",
                () => {

                    tickerInput.value =
                        asset.ticker;


                    showAsset(
                        asset.ticker
                    );
                }
            );


            assetList.appendChild(
                card
            );
        }
    );
}


// --------------------------------------------------
// Market Explorer filters
// --------------------------------------------------

function applyExplorerFilters() {

    let filtered =
        [...assets];


    if (
        currentAssetFilter !==
        "all"
    ) {

        filtered =
            filtered.filter(
                asset =>
                    classifyAsset(asset)
                    === currentAssetFilter
            );
    }


    if (
        currentAssetFilter ===
            "bond" &&
        currentBondSegment !==
            "all"
    ) {

        filtered =
            filtered.filter(
                asset => {

                    const metadata =
                        bondMetadata[
                            asset.ticker
                        ];


                    return (
                        metadata?.segment ===
                        currentBondSegment
                    );
                }
            );
    }


    renderExplorerAssets(
        filtered
    );
}


document
    .querySelectorAll(
        ".asset-filter"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".asset-filter"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                currentAssetFilter =
                    button.dataset.type;


                const subfilters =
                    document.getElementById(
                        "bondSubfilters"
                    );


                if (
                    currentAssetFilter ===
                    "bond"
                ) {

                    subfilters.classList.remove(
                        "hidden"
                    );
                }

                else {

                    subfilters.classList.add(
                        "hidden"
                    );


                    currentBondSegment =
                        "all";


                    document
                        .querySelectorAll(
                            ".bond-segment-filter"
                        )
                        .forEach(item => {

                            item.classList.toggle(
                                "active",
                                item.dataset.segment ===
                                "all"
                            );
                        });
                }


                applyExplorerFilters();
            }
        );
    });


document
    .querySelectorAll(
        ".bond-segment-filter"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                document
                    .querySelectorAll(
                        ".bond-segment-filter"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                currentBondSegment =
                    button.dataset.segment;


                applyExplorerFilters();
            }
        );
    });


// --------------------------------------------------
// Comparison dropdowns
// --------------------------------------------------

function populateAssetSelectors() {

    const assetA =
        document.getElementById(
            "assetA"
        );


    const assetB =
        document.getElementById(
            "assetB"
        );


    assetA.innerHTML =
        `<option value="">
            Select first asset
        </option>`;


    assetB.innerHTML =
        `<option value="">
            Select second asset
        </option>`;


    const groups = [

        ["Stocks", "stock"],

        ["Equity ETFs", "equity"],

        ["Bond ETFs", "bond"],

        ["Indices", "index"],

        ["Other", "other"]
    ];


    groups.forEach(
        ([label, groupName]) => {

            const groupAssets =
                assets.filter(
                    asset =>
                        classifyAsset(asset)
                        === groupName
                );


            if (!groupAssets.length) {
                return;
            }


            const groupA =
                document.createElement(
                    "optgroup"
                );


            const groupB =
                document.createElement(
                    "optgroup"
                );


            groupA.label =
                label;


            groupB.label =
                label;


            groupAssets.forEach(
                asset => {

                    const optionText =
                        `${asset.ticker} — ${asset.company_name}`;


                    const optionA =
                        document.createElement(
                            "option"
                        );


                    optionA.value =
                        asset.ticker;


                    optionA.textContent =
                        optionText;


                    const optionB =
                        document.createElement(
                            "option"
                        );


                    optionB.value =
                        asset.ticker;


                    optionB.textContent =
                        optionText;


                    groupA.appendChild(
                        optionA
                    );


                    groupB.appendChild(
                        optionB
                    );
                }
            );


            assetA.appendChild(
                groupA
            );


            assetB.appendChild(
                groupB
            );
        }
    );
}


// --------------------------------------------------
// Asset comparison
// --------------------------------------------------

document
    .getElementById(
        "compareButton"
    )
    .addEventListener(
        "click",
        compareAssets
    );


async function compareAssets() {

    const tickerA =
        document
            .getElementById("assetA")
            .value;


    const tickerB =
        document
            .getElementById("assetB")
            .value;


    const comparisonError =
        document.getElementById(
            "comparisonError"
        );


    comparisonError.textContent =
        "";


    if (
        !tickerA ||
        !tickerB
    ) {

        comparisonError.textContent =
            "Select two assets.";

        return;
    }


    if (
        tickerA === tickerB
    ) {

        comparisonError.textContent =
            "Select two different assets.";

        return;
    }


    comparisonTickerA =
        tickerA;


    comparisonTickerB =
        tickerB;


    try {

        const [
            assetAResponse,
            assetBResponse,
            historyAResponse,
            historyBResponse
        ] = await Promise.all([

            apiFetch(
                `/assets/${encodeURIComponent(tickerA)}`
            ),

            apiFetch(
                `/assets/${encodeURIComponent(tickerB)}`
            ),

            apiFetch(
                `/assets/${encodeURIComponent(tickerA)}/history?limit=${comparisonRange}`
            ),

            apiFetch(
                `/assets/${encodeURIComponent(tickerB)}/history?limit=${comparisonRange}`
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
            historyA,
            tickerB,
            historyB
        );


        document
            .getElementById(
                "comparisonResult"
            )
            .classList.remove(
                "hidden"
            );

    }

    catch (error) {

        comparisonError.textContent =
            error.message;
    }
}


// --------------------------------------------------
// Comparison table
// --------------------------------------------------

function renderComparisonTable(
    assetA,
    assetB
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
                    <th>${assetA.ticker}</th>
                    <th>${assetB.ticker}</th>
                </tr>

            </thead>

            <tbody>

                <tr>
                    <td>Asset class</td>
                    <td>${getAssetCategoryLabel(assetA)}</td>
                    <td>${getAssetCategoryLabel(assetB)}</td>
                </tr>

                <tr>
                    <td>Close</td>
                    <td>${formatClose(assetA)}</td>
                    <td>${formatClose(assetB)}</td>
                </tr>

                <tr>
                    <td>Daily return</td>
                    <td>${formatPercent(assetA.daily_return_pct)}</td>
                    <td>${formatPercent(assetB.daily_return_pct)}</td>
                </tr>

                <tr>
                    <td>20D average</td>
                    <td>${formatNumber(assetA.moving_avg_20d)}</td>
                    <td>${formatNumber(assetB.moving_avg_20d)}</td>
                </tr>

                <tr>
                    <td>20D volatility</td>
                    <td>${formatPercent(assetA.volatility_20d_pct)}</td>
                    <td>${formatPercent(assetB.volatility_20d_pct)}</td>
                </tr>

                <tr>
                    <td>60D volatility</td>
                    <td>${formatPercent(assetA.volatility_60d_pct)}</td>
                    <td>${formatPercent(assetB.volatility_60d_pct)}</td>
                </tr>

            </tbody>

        </table>
    `;
}


// --------------------------------------------------
// Normalize comparison histories
// --------------------------------------------------

function buildNormalizedComparison(
    historyA,
    historyB
) {

    const priceA =
        new Map(
            historyA.map(
                row => [
                    row.date,
                    Number(row.close)
                ]
            )
        );


    const priceB =
        new Map(
            historyB.map(
                row => [
                    row.date,
                    Number(row.close)
                ]
            )
        );


    const dates =
        historyA
            .map(row => row.date)
            .filter(
                date =>
                    priceB.has(date)
            );


    if (!dates.length) {

        return {
            dates: [],
            valuesA: [],
            valuesB: []
        };
    }


    const startA =
        priceA.get(
            dates[0]
        );


    const startB =
        priceB.get(
            dates[0]
        );


    return {

        dates,

        valuesA:
            dates.map(
                date =>
                    (
                        priceA.get(date)
                        / startA
                        - 1
                    ) * 100
            ),

        valuesB:
            dates.map(
                date =>
                    (
                        priceB.get(date)
                        / startB
                        - 1
                    ) * 100
            )
    };
}


// --------------------------------------------------
// Comparison chart
// --------------------------------------------------

function renderComparisonChart(
    tickerA,
    historyA,
    tickerB,
    historyB
) {

    const normalized =
        buildNormalizedComparison(
            historyA,
            historyB
        );


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
                        normalized.dates,

                    datasets: [

                        {
                            label:
                                `${tickerA} return %`,

                            data:
                                normalized.valuesA,

                            pointRadius:
                                0,

                            borderWidth:
                                2,

                            tension:
                                0.2
                        },

                        {
                            label:
                                `${tickerB} return %`,

                            data:
                                normalized.valuesB,

                            pointRadius:
                                0,

                            borderWidth:
                                2,

                            tension:
                                0.2
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    interaction: {
                        intersect:
                            false,

                        mode:
                            "index"
                    },

                    plugins: {

                        title: {

                            display:
                                true,

                            text:
                                `${
                                    rangeLabels[
                                        comparisonRange
                                    ] ||
                                    "Custom"
                                } Relative Performance`
                        }
                    },

                    scales: {

                        y: {

                            ticks: {

                                callback:
                                    value =>
                                        `${Number(value).toFixed(1)}%`
                            }
                        }
                    }
                }
            }
        );
}


// --------------------------------------------------
// Comparison chart date ranges
// --------------------------------------------------

document
    .querySelectorAll(
        "#comparisonRangeSelector button"
    )
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                document
                    .querySelectorAll(
                        "#comparisonRangeSelector button"
                    )
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );


                button.classList.add(
                    "active"
                );


                comparisonRange =
                    Number(
                        button.dataset.range
                    );


                if (
                    !comparisonTickerA ||
                    !comparisonTickerB
                ) {
                    return;
                }


                const comparisonError =
                    document.getElementById(
                        "comparisonError"
                    );


                comparisonError.textContent =
                    "";


                try {

                    const [
                        responseA,
                        responseB
                    ] = await Promise.all([

                        apiFetch(
                            `/assets/${encodeURIComponent(comparisonTickerA)}/history?limit=${comparisonRange}`
                        ),

                        apiFetch(
                            `/assets/${encodeURIComponent(comparisonTickerB)}/history?limit=${comparisonRange}`
                        )
                    ]);


                    if (
                        !responseA.ok ||
                        !responseB.ok
                    ) {

                        throw new Error(
                            "Unable to load this date range."
                        );
                    }


                    const [
                        historyA,
                        historyB
                    ] = await Promise.all([

                        responseA.json(),

                        responseB.json()
                    ]);


                    renderComparisonChart(
                        comparisonTickerA,
                        historyA,
                        comparisonTickerB,
                        historyB
                    );

                }

                catch (error) {

                    comparisonError.textContent =
                        error.message;
                }
            }
        );
    });


// --------------------------------------------------
// Start application
// --------------------------------------------------

loadAssets();
loadFeaturedMarkets();