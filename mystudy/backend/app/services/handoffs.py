from typing import Any
from uuid import uuid4

from app.domain.handoffs import HandoffRecord
from app.repositories.handoffs import (
    InMemoryHandoffRepository,
    handoff_repository,
)
from app.services.study_configuration import (
    StudyConfigurationService,
    study_configuration_service,
)


class HandoffService:
    def __init__(
        self,
        repository: InMemoryHandoffRepository,
        study_configuration: StudyConfigurationService,
    ) -> None:
        self.repository = repository
        self.study_configuration = study_configuration

    def create(self, study_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        precheck_outcome = payload["precheckOutcome"]

        record = HandoffRecord(
            handoff_id=str(uuid4()),
            study_id=study_id,
            locale=payload["locale"],
            source=payload["source"],
            campaign=payload.get("campaign"),
            selected_site_id=payload["selectedSiteId"],
            precheck_outcome=precheck_outcome,
            eligibility_status=(
                "eligible" if precheck_outcome == "potentialMatch" else "ineligible"
            ),
            answers=dict(payload.get("answers", {})),
        )
        self.repository.add(record)

        return {
            "handoffId": record.handoff_id,
            "studyId": record.study_id,
            "selectedSiteId": record.selected_site_id,
            "eligibilityStatus": record.eligibility_status,
            "createdAt": record.created_at,
        }


handoff_service = HandoffService(
    repository=handoff_repository,
    study_configuration=study_configuration_service,
)
