from enum import StrEnum


class ProjectStatus(StrEnum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    WAITING_ASSIGNMENT = "waiting_assignment"


class PhaseStatus(StrEnum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"
    WAITING_ASSIGNMENT = "waiting_assignment"
