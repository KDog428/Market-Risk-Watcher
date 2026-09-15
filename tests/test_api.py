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