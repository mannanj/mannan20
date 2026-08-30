from fastapi.testclient import TestClient

from app.main import app


def test_create_handoff() -> None:
    response = TestClient(app).post(
        "/studies/study-trd-301/handoffs",
        json={
            "locale": "en-GB",
            "source": "study-website",
            "campaign": "summer-search",
            "selectedSiteId": "site-london",
            "precheckOutcome": "potentialMatch",
        },
    )

    assert response.status_code == 201
    assert isinstance(response.json()["handoffId"], str)
