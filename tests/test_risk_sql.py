import os
from pathlib import Path
import pytest
from sqlalchemy import text
from app.database import engine


@pytest.fixture
def real_risk_view():
    if os.getenv("DB_NAME") != "market_risk_test":
        pytest.skip("Requires isolated test database")

    view_sql = Path(
        "sql/asset_risk_summary.sql"
    ).read_text()

    prices = [
        100 * (2 ** i)
        for i in range(61)
    ]

    price_rows = []

    for i, price in enumerate(prices):
        price_rows.append(
            {
                "asset_id": 1,
                "date": f"2026-01-{(i % 28) + 1:02d}",
                "open": price,
                "high": price,
                "low": price,
                "close": price,
                "volume": 1000000
            }
        )

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                DROP VIEW IF EXISTS asset_risk_summary;
                """
            )
        )
        connection.execute(
            text(
                """
                DROP TABLE IF EXISTS prices;
                """
            )
        )
        connection.execute(
            text(
                """
                DROP TABLE IF EXISTS assets;
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE assets (
                    asset_id INTEGER PRIMARY KEY,
                    ticker VARCHAR(20) UNIQUE NOT NULL,
                    company_name VARCHAR(255),
                    asset_type VARCHAR(50)
                );
                """
            )
        )
        connection.execute(
            text(
                """
                CREATE TABLE prices (
                    price_id BIGSERIAL PRIMARY KEY,
                    asset_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    open NUMERIC,
                    high NUMERIC,
                    low NUMERIC,
                    close NUMERIC,
                    volume BIGINT
                );
                """
            )
        )
        connection.execute(
            text(
                """
                INSERT INTO assets (
                    asset_id,
                    ticker,
                    company_name,
                    asset_type
                )
                VALUES (
                    1,
                    'TEST',
                    'Test Bond ETF',
                    'bond_etf'
                );
                """
            )
        )
        for i, price in enumerate(prices):
            connection.execute(
                text(
                    """
                    INSERT INTO prices (
                        asset_id,
                        date,
                        open,
                        high,
                        low,
                        close,
                        volume
                    )
                    VALUES (
                        1,
                        DATE '2026-01-01' + :day_number,
                        :price,
                        :price,
                        :price,
                        :price,
                        1000000
                    );
                    """
                ),
                {
                    "day_number": i,
                    "price": price
                }
            )
        connection.execute(text(view_sql))
    return prices
def test_real_risk_calculations(real_risk_view):
    prices = real_risk_view

    with engine.connect() as connection:
        row = connection.execute(
            text(
                """
                SELECT
                    ticker,
                    close,
                    daily_return_pct,
                    moving_avg_20d,
                    volatility_20d_pct,
                    volatility_60d_pct
                FROM asset_risk_summary
                WHERE ticker = 'TEST';
                """
            )
        ).mappings().one()

    expected_close = prices[-1]

    expected_moving_average_20d = (
        sum(prices[-20:]) / 20
    )

    assert row["ticker"] == "TEST"

    assert float(row["close"]) == pytest.approx(
        expected_close
    )

    assert float(
        row["daily_return_pct"]
    ) == pytest.approx(
        100.0,
        abs=0.000001
    )

    assert float(
        row["moving_avg_20d"]
    ) == pytest.approx(
        expected_moving_average_20d
    )

    assert float(
        row["volatility_20d_pct"]
    ) == pytest.approx(
        0.0,
        abs=0.000001
    )

    assert float(
        row["volatility_60d_pct"]
    ) == pytest.approx(
        0.0,
        abs=0.000001
    )