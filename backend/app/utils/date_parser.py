"""
Natural language date parsing utilities for task management.

This module provides functions to parse natural language dates like "tomorrow",
"next Monday", "in 3 days", and convert them to Python datetime objects.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple
import dateparser


def parse_natural_date(
    date_string: str,
    prefer_future: bool = True,
    timezone: str = "UTC"
) -> Optional[datetime]:
    """
    Parse natural language date string to datetime object.

    Handles a wide variety of date formats including:
    - Relative dates: "tomorrow", "in 3 days", "next week"
    - Weekday names: "Monday", "Friday" (defaults to next occurrence)
    - Absolute dates: "January 15", "Jan 15 2026", "2026-01-15"
    - Time expressions: "tomorrow at 3pm", "Friday morning"
    - ISO 8601 strings: "2026-01-15T10:30:00"

    Args:
        date_string: Natural language date string to parse
        prefer_future: If True, ambiguous dates default to future dates
                      (e.g., "Monday" = next Monday, not last Monday)
        timezone: Timezone for parsing (default: UTC)

    Returns:
        Naive UTC datetime object, or None if parsing fails

    Examples:
        >>> parse_natural_date("Monday")
        datetime(2026, 1, 6, 0, 0, 0)  # Next Monday

        >>> parse_natural_date("tomorrow at 3pm")
        datetime(2026, 1, 5, 15, 0, 0)  # Tomorrow at 3pm

        >>> parse_natural_date("in 3 days")
        datetime(2026, 1, 7, 0, 0, 0)  # 3 days from now

        >>> parse_natural_date("not a date")
        None  # Parsing failed
    """
    if not date_string or not date_string.strip():
        return None

    try:
        # Configure dateparser settings
        settings = {
            'PREFER_DATES_FROM': 'future' if prefer_future else 'current_period',
            'TIMEZONE': timezone,
            'RETURN_AS_TIMEZONE_AWARE': False,  # Return naive datetime (UTC)
            'TO_TIMEZONE': 'UTC',
        }

        # Parse the date string
        parsed = dateparser.parse(
            date_string,
            settings=settings
        )

        if parsed is None:
            return None

        # Ensure we return naive UTC datetime
        # (dateparser may return timezone-aware in some cases)
        if parsed.tzinfo is not None:
            # Convert to UTC and make naive
            parsed = parsed.replace(tzinfo=None)

        return parsed

    except (ValueError, TypeError, AttributeError):
        # Parsing failed - return None for graceful degradation
        return None


def validate_date_not_past(
    dt: datetime,
    require_confirmation: bool = True,
    allow_today: bool = True
) -> Tuple[bool, Optional[str]]:
    """
    Validate that a date is not in the past.

    Args:
        dt: Datetime object to validate
        require_confirmation: If True, return warning for past dates.
                            If False, silently allow past dates.
        allow_today: If True, allow dates from today (even if time has passed).
                    If False, only allow future dates.

    Returns:
        Tuple of (is_valid, warning_message)
        - is_valid: True if date passes validation or confirmation not required
        - warning_message: None if valid, str warning message if confirmation needed

    Examples:
        >>> from datetime import datetime, timedelta
        >>> past = datetime.utcnow() - timedelta(days=1)
        >>> validate_date_not_past(past, require_confirmation=True)
        (False, "This date is in the past")

        >>> future = datetime.utcnow() + timedelta(days=1)
        >>> validate_date_not_past(future, require_confirmation=True)
        (True, None)
    """
    now = datetime.utcnow()

    # Check if date is in the past
    if allow_today:
        # Allow any time today or later
        is_past = dt.date() < now.date()
    else:
        # Only allow future datetimes
        is_past = dt < now

    if is_past:
        if require_confirmation:
            return (False, "This date is in the past")
        else:
            # Allow past dates without warning
            return (True, None)

    # Date is in the future - valid
    return (True, None)


def format_date_for_user(dt: datetime) -> str:
    """
    Format datetime for user-friendly display.

    Provides context-aware formatting:
    - If today: "Today at 3:00 PM"
    - If tomorrow: "Tomorrow at 3:00 PM"
    - If this week: "Monday at 3:00 PM"
    - Otherwise: "Jan 15 at 3:00 PM" or "Jan 15, 2026 at 3:00 PM" (if not current year)

    Args:
        dt: Datetime object to format

    Returns:
        User-friendly date string

    Examples:
        >>> from datetime import datetime
        >>> dt = datetime(2026, 1, 5, 15, 30)
        >>> format_date_for_user(dt)  # If today is Jan 4, 2026
        "Tomorrow at 3:30 PM"

        >>> dt = datetime(2026, 1, 6, 9, 0)
        >>> format_date_for_user(dt)  # If today is Jan 4, 2026
        "Monday at 9:00 AM"
    """
    now = datetime.utcnow()
    delta = dt.date() - now.date()
    days_diff = delta.days

    # Format time part (always show time if not midnight)
    if dt.hour == 0 and dt.minute == 0:
        time_str = ""
    else:
        time_str = dt.strftime(" at %I:%M %p").replace(" 0", " ")  # Remove leading zero from hour

    # Determine date part based on proximity
    if days_diff == 0:
        return f"Today{time_str}"
    elif days_diff == 1:
        return f"Tomorrow{time_str}"
    elif days_diff == -1:
        return f"Yesterday{time_str}"
    elif 0 < days_diff <= 6:
        # This week - show weekday name
        weekday = dt.strftime("%A")
        return f"{weekday}{time_str}"
    elif -6 <= days_diff < 0:
        # Last week - show "Last Monday", etc.
        weekday = dt.strftime("%A")
        return f"Last {weekday}{time_str}"
    else:
        # Further out - show month and day
        if dt.year == now.year:
            # Same year - omit year
            return dt.strftime(f"%b %d{time_str}")
        else:
            # Different year - include year
            return dt.strftime(f"%b %d, %Y{time_str}")


def get_weekday_name(dt: datetime) -> str:
    """
    Get the weekday name for a datetime.

    Args:
        dt: Datetime object

    Returns:
        Weekday name (e.g., "Monday", "Tuesday")
    """
    return dt.strftime("%A")
