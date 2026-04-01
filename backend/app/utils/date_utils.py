from datetime import date, timedelta

# Working days: Sunday(6), Monday(0), Tuesday(1), Wednesday(2), Thursday(3)
_WORKING_WEEKDAYS = {6, 0, 1, 2, 3}


def _is_working_day(d: date) -> bool:
    """Check if a date falls on a working day (Sun-Thu)."""
    return d.weekday() in _WORKING_WEEKDAYS


def count_working_days(start: date, end: date) -> int:
    """Count working days (Sun-Thu) between start and end dates, inclusive."""
    if end < start:
        return 0
    count = 0
    current = start
    while current <= end:
        if _is_working_day(current):
            count += 1
        current += timedelta(days=1)
    return count


def iter_working_days(start: date, end: date):
    """Yield each working day (Sun-Thu) between start and end, inclusive."""
    current = start
    while current <= end:
        if _is_working_day(current):
            yield current
        current += timedelta(days=1)


def iter_week_starts(start: date, end: date):
    """Yield the Sunday of each week that overlaps [start, end].

    The first yielded date is the Sunday of the week containing *start*.
    """
    sunday = start - timedelta(days=(start.weekday() + 1) % 7)
    while sunday <= end:
        yield sunday
        sunday += timedelta(days=7)
