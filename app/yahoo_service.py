import pandas as pd
import yfinance as yf
from sqlalchemy import text

from app.database import engine


def get_tickers():
    query = text(
        """
        SELECT
            ticker
        FROM assets
        ORDER BY asset_id;
        """
    )

    with engine.connect() as connection:
        result = connection.execute(query)

        tickers = [
            row.ticker
            for row in result
        ]

    return tickers


def download_prices(tickers):
    data = yf.download(
        tickers,
        period="5d",
        auto_adjust=False,
        group_by="ticker"
    )

    return data
def transform_prices(data, tickers):
    asset_lookup = pd.read_sql(
        """
        SELECT
            asset_id,
            ticker
        FROM assets;
        """,
        engine
    )

    ticker_to_id = dict(
        zip(
            asset_lookup["ticker"],
            asset_lookup["asset_id"]
        )
    )

    price_frames = []

    for ticker in tickers:
        ticker_df = data[ticker].copy()

        ticker_df = ticker_df.reset_index()

        ticker_df["ticker"] = ticker

        ticker_df = ticker_df[
            [
                "ticker",
                "Date",
                "Open",
                "High",
                "Low",
                "Close",
                "Volume"
            ]
        ]

        price_frames.append(ticker_df)

    prices_df = pd.concat(
        price_frames,
        ignore_index=True
    )

    prices_df = prices_df.rename(
        columns={
            "Date": "date",
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume"
        }
    )

    prices_df["asset_id"] = prices_df["ticker"].map(
        ticker_to_id
    )

    prices_df = prices_df.dropna(
        subset=[
            "open",
            "high",
            "low",
            "close"
        ]
    )

    prices_df["date"] = pd.to_datetime(
        prices_df["date"]
    ).dt.date

    prices_df["volume"] = pd.to_numeric(
        prices_df["volume"],
        errors="coerce"
    ).astype("Int64")

    prices_df = prices_df[
        [
            "asset_id",
            "date",
            "open",
            "high",
            "low",
            "close",
            "volume"
        ]
    ]

    return prices_df
def remove_existing_prices(prices_df):
    existing_prices = pd.read_sql(
        """
        SELECT
            asset_id,
            date
        FROM prices
        WHERE date >= CURRENT_DATE - INTERVAL '10 days';
        """,
        engine
    )

    existing_prices["date"] = pd.to_datetime(
        existing_prices["date"]
    ).dt.date

    merged = prices_df.merge(
        existing_prices,
        on=[
            "asset_id",
            "date"
        ],
        how="left",
        indicator=True
    )

    new_prices = merged[
        merged["_merge"] == "left_only"
    ].drop(
        columns=["_merge"]
    )

    return new_prices
def update_market_data():
    tickers = get_tickers()

    data = download_prices(tickers)

    prices_df = transform_prices(
        data,
        tickers
    )

    new_prices = remove_existing_prices(
        prices_df
    )

    if new_prices.empty:
        return {
            "status": "ok",
            "inserted_rows": 0,
            "message": "No new market data"
        }

    inserted = new_prices.to_sql(
        name="prices",
        con=engine,
        schema="public",
        if_exists="append",
        index=False,
        chunksize=5000
    )

    return {
        "status": "ok",
        "inserted_rows": inserted
    }