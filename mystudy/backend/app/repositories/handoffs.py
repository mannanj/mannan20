from app.domain.handoffs import HandoffRecord


class InMemoryHandoffRepository:
    def __init__(self) -> None:
        self._records: list[HandoffRecord] = []

    def add(self, record: HandoffRecord) -> HandoffRecord:
        self._records.append(record)
        return record

    def all(self) -> list[HandoffRecord]:
        return list(self._records)

    def clear(self) -> None:
        self._records.clear()


handoff_repository = InMemoryHandoffRepository()
