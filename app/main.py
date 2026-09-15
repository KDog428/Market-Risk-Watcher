from fastapi import FastAPI
from sqlalchemy import text
from app.database import engine
from app.yahoo_service import update_market_data
app = FastAPI(
    title="Market Risk API",
    version="1.1.0"
)


@app.get("/")
def root():
    return {
        "message": "Market Risk API is running"
    }


@app.get("/health")
def health():
    with engine.connect() as connection:
        database = connection.execute(
            text("SELECT current_database();")
        ).scalar()

    return {
        "status": "ok",
        "database": database
    }
@app.get("/bonds")
def get_bonds():
    query = text(
        """
        SELECT
            ticker,
            company_name,
            date,
            close,
            daily_return_pct,
            moving_avg_20d,
            volatility_20d_pct,
            volatility_60d_pct,
            CASE
                WHEN volatility_20d_pct < 5 THEN 'LOW'
                WHEN volatility_20d_pct < 10 THEN 'MEDIUM'
                ELSE 'HIGH'
            END AS risk_level
        FROM asset_risk_summary
        WHERE asset_type = 'bond_etf'
        ORDER BY volatility_20d_pct DESC;
        """
    )

    with engine.connect() as connection:
        result = connection.execute(query)

        bonds = [
            dict(row._mapping)
            for row in result
        ]

    return bonds
@app.get("/assets")
def get_assets():
    query = text(
        """
        SELECT
            asset_id,
            ticker,
            company_name,
            asset_type
        FROM assets
        ORDER BY ticker;
        """
    )

    with engine.connect() as connection:
        result = connection.execute(query)

        assets = [
            dict(row._mapping)
            for row in result
        ]

    return assets
@app.get("/assets/{ticker}")
def get_asset(ticker: str):
    query = text(
        """
        SELECT
            ticker,
            company_name,
            asset_type,
            date,
            close,
            daily_return_pct,
            moving_avg_20d,
            volatility_20d_pct,
            volatility_60d_pct
        FROM asset_risk_summary
        WHERE ticker = :ticker;
        """
    )

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "ticker": ticker.upper()
            }
        ).mappings().first()

    if result is None:
        return {
            "error": "Ticker not found"
        }

    return dict(result)
@app.post("/update")
def update_data():
    return update_market_data()

@app.get("/version")
def version():
    return {
        "name": "Market Risk API",
        "version": "1.1.0"
    }
