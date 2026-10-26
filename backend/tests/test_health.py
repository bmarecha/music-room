from fastapi.testclient import TestClient

from app.main import app


def test_openapi_is_served():
    client = TestClient(app)
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Music Room API"
