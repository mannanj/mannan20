import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.handoffs import handoff_service

router = APIRouter(prefix="/studies", tags=["handoffs"])
logger = logging.getLogger(__name__)


@router.post("/{study_id}/handoffs", status_code=201)
def create_handoff(study_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    logger.info("Creating handoff", extra={"study_id": study_id, "payload": payload})

    try:
        return handoff_service.create(study_id, payload)
    except Exception as exc:
        logger.exception(
            "Handoff creation failed",
            extra={"study_id": study_id, "payload": payload},
        )
        raise HTTPException(
            status_code=400,
            detail=f"Unable to create handoff: {exc}",
        ) from exc
