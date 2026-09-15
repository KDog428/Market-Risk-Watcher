from fastapi.testclient import TestClient
from app.main import app
import os
client = TestClient(app)
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