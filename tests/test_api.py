from fastapi.testclient import TestClient
from app.main import app
import os
import pytest
from sqlalchemy import text
from app.database import engine
client = TestClient(app)

@pytest.fixture
def seeded_assets():
    if os.getenv("DB_NAME") != "market_risk_test":
        pytest.skip("Requires isolated test database")

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS assets (
                    asset_id SERIAL PRIMARY KEY,
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
                TRUNCATE TABLE assets RESTART IDENTITY;
                """
            )
        )

        connection.execute(
            text(
                """
                INSERT INTO assets (
                    ticker,
                    company_name,
                    asset_type
                )
                VALUES
                    ('TLT', 'iShares 20+ Year Treasury Bond ETF', 'bond_etf'),
                    ('BND', 'Vanguard Total Bond Market ETF', 'bond_etf');
                """
            )
        )

@pytest.fixture
def seeded_bond_risk_summary():
    if os.getenv("DB_NAME") != "market_risk_test":
        pytest.skip("Requires isolated test database")

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
                CREATE VIEW asset_risk_summary AS

                SELECT *
                FROM (
                    VALUES
                        (
                            1,
                            'TLT',
                            'iShares 20+ Year Treasury Bond ETF',
                            'bond_etf',
                            DATE '2026-09-15',
                            100.00::numeric,
                            -0.50::numeric,
                            101.00::numeric,
                            12.00::numeric,
                            11.00::numeric
                        ),
                        (
                            2,
                            'IEF',
                            'iShares 7-10 Year Treasury Bond ETF',
                            'bond_etf',
                            DATE '2026-09-15',
                            95.00::numeric,
                            0.20::numeric,
                            94.50::numeric,
                            7.00::numeric,
                            6.50::numeric
                        ),
                        (
                            3,
                            'BND',
                            'Vanguard Total Bond Market ETF',
                            'bond_etf',
                            DATE '2026-09-15',
                            75.00::numeric,
                            0.10::numeric,
                            74.80::numeric,
                            4.00::numeric,
                            4.50::numeric
                        )
                ) AS risk_data (
                    asset_id,
                    ticker,
                    company_name,
                    asset_type,
                    date,
                    close,
                    daily_return_pct,
                    moving_avg_20d,
                    volatility_20d_pct,
                    volatility_60d_pct
                );
                """
            )
        )

def test_root():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "message": "Market Risk API is running"
    }

def test_version():
    response = client.get("/version")

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Market Risk API"
    assert data["version"] == "1.1.0"

def test_health():
    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"
    assert data["database"] == os.getenv("DB_NAME")
def test_get_assets(seeded_assets):
    response = client.get("/assets")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    assert data[0]["ticker"] == "BND"
    assert data[1]["ticker"] == "TLT"

    assert data[0]["asset_type"] == "bond_etf"
    assert data[1]["asset_type"] == "bond_etf"

def test_get_bonds(seeded_bond_risk_summary):
    response = client.get("/bonds")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 3

    assert data[0]["ticker"] == "TLT"
    assert data[0]["risk_level"] == "HIGH"

    assert data[1]["ticker"] == "IEF"
    assert data[1]["risk_level"] == "MEDIUM"

    assert data[2]["ticker"] == "BND"
    assert data[2]["risk_level"] == "LOW"

def test_get_asset_not_found(seeded_bond_risk_summary):
    response = client.get("/assets/NOTREAL")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Ticker not found"
    }

def test_get_asset_history(seeded_assets):
    with engine.begin() as connection:
        result = connection.execute(
            text("""
                SELECT asset_id
                FROM assets
                WHERE ticker = 'TLT';
            """)
        ).scalar_one()

        connection.execute(
            text("""
                INSERT INTO prices (
                    asset_id,
                    date,
                    open,
                    high,
                    low,
                    close,
                    volume
                )
                VALUES
                    (:asset_id, '2026-09-01', 100, 100, 100, 100, 1000),
                    (:asset_id, '2026-09-02', 101, 101, 101, 101, 1000),
                    (:asset_id, '2026-09-03', 102, 102, 102, 102, 1000);
            """),
            {"asset_id": result}
        )

    response = client.get("/assets/TLT/history?limit=2")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2
    assert data[0]["date"] == "2026-09-02"
    assert data[0]["close"] == 101
    assert data[1]["date"] == "2026-09-03"
    assert data[1]["close"] == 102