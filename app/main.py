from fastapi import FastAPI, HTTPException, Header
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from app.database import engine
import os 
import secrets
from fastapi.middleware.cors import CORSMiddleware
from app.yahoo_service import update_market_data
app = FastAPI(
    title="Market Risk API",
    version="1.1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kdog428.github.io"
    ],
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
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
        raise HTTPException(
            status_code=404,
            detail="Ticker not found")

    return dict(result)
def require_update_api_key(
    x_api_key: str | None = Header(default=None)
):
    expected_key = os.getenv("UPDATE_API_KEY")

    if not expected_key:
        raise HTTPException(
            status_code=503,
            detail="Update endpoint is not configured"
        )

    if (
        not x_api_key
        or not secrets.compare_digest(
            x_api_key,
            expected_key
        )
    ):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )
    
@app.post("/update")
def update(
    x_api_key: str | None = Header(default=None)
):
    require_update_api_key(x_api_key)

    return update_market_data()

@app.get("/version")
def version():
    return {
        "name": "Market Risk API",
        "version": "1.1.0"
    }
@app.get("/assets/{ticker}/history")
def get_asset_history(ticker: str, limit: int = 90):
    ticker = ticker.upper()

    query = text("""
        SELECT
            p.date,
            p.close
        FROM prices p
        JOIN assets a
            ON p.asset_id = a.asset_id
        WHERE a.ticker = :ticker
        ORDER BY p.date DESC
        LIMIT :limit;
    """)

    with engine.connect() as connection:
        rows = connection.execute(
            query,
            {
                "ticker": ticker,
                "limit": limit
            }
        ).mappings().all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Ticker not found"
        )

    return list(reversed(rows))

app.mount(
    "/dashboard",
    StaticFiles(
        directory="frontend",
        html=True
    ),
    name="dashboard"
)