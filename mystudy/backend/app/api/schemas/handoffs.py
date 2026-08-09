from datetime import datetime
from typing import Literal

from app.api.schemas.base import ApiSchema


class HandoffResponse(ApiSchema):
    handoff_id: str
    study_id: str
    locale: str
    selected_site_id: str
    precheck_outcome: Literal["potentialMatch", "unlikelyMatch"]
    created_at: datetime
