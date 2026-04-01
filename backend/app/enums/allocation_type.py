from enum import StrEnum


class PhaseAllocationType(StrEnum):
    HOURS = "hours"
    HEADCOUNT = "headcount"
    HOURS_AND_HEADCOUNT = "hours_and_headcount"


class AssignmentAllocationType(StrEnum):
    HOURS = "hours"
    PERCENTAGE = "percentage"
