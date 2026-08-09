from dataclasses import dataclass, field
from datetime import UTC, datetime


@dataclass
class HandoffRecord:
    handoff_id: str
    study_id: str
    locale: str
    source: str
    campaign: str | None
    selected_site_id: str
    precheck_outcome: str
    eligibility_status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
