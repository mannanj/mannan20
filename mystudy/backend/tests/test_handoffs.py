import logging

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.repositories.handoffs import handoff_repository

client = TestClient(app)


def valid_handoff_payload() -> dict[str, object]:
    return {
        "locale": "en-GB",
        "source": "study-website",
        "campaign": "summer-search",
        "selectedSiteId": "site-london",
        "precheckOutcome": "potentialMatch",
    }


def test_create_handoff() -> None:
    handoff_repository.clear()
    response = client.post(
        "/studies/study-trd-301/handoffs",
        json=valid_handoff_payload(),
    )

    assert response.status_code == 201
    assert isinstance(response.json()["handoffId"], str)


def test_handoff_record_has_no_answers_field() -> None:
    handoff_repository.clear()

    response = client.post(
        "/studies/study-trd-301/handoffs",
        json=valid_handoff_payload(),
    )

    assert response.status_code == 201
    [record] = handoff_repository.all()
    assert "answers" not in vars(record)


def test_rejects_quick_check_answers_without_logging_or_persisting_them(
    caplog: pytest.LogCaptureFixture,
) -> None:
    handoff_repository.clear()
    caplog.set_level(logging.INFO, logger="app.api.routes.handoffs")
    sensitive_answer = "sensitive-answer-marker"
    payload = valid_handoff_payload()
    payload["answers"] = {"age": sensitive_answer}

    response = client.post(
        "/studies/study-trd-301/handoffs",
        json=payload,
    )

    assert response.status_code == 422
    assert handoff_repository.all() == []
    assert sensitive_answer not in repr([record.__dict__ for record in caplog.records])
