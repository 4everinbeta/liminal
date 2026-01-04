"""
Unit tests for date parsing utilities.

Tests use freezegun to freeze time for deterministic results.
"""

import pytest
from datetime import datetime, timedelta
from freezegun import freeze_time
from app.utils.date_parser import (
    parse_natural_date,
    validate_date_not_past,
    format_date_for_user,
    get_weekday_name
)


# Freeze time to a known date for all tests
TEST_NOW = "2026-01-04 12:00:00"  # Sunday, January 4, 2026 at noon UTC


class TestParseNaturalDate:
    """Test parse_natural_date() function."""

    @freeze_time(TEST_NOW)
    def test_parse_relative_tomorrow(self):
        """Test parsing 'tomorrow'."""
        result = parse_natural_date("tomorrow")
        assert result is not None
        assert result.date() == datetime(2026, 1, 5).date()

    @freeze_time(TEST_NOW)
    def test_parse_relative_in_days(self):
        """Test parsing 'in X days'."""
        result = parse_natural_date("in 3 days")
        assert result is not None
        # Should be 3 days from now
        expected = datetime(2026, 1, 7)
        assert result.date() == expected.date()

    @freeze_time(TEST_NOW)
    def test_parse_relative_next_week(self):
        """Test parsing 'next week'."""
        result = parse_natural_date("next week")
        assert result is not None
        # Should be roughly 7 days ahead
        assert result.date() > datetime(2026, 1, 10).date()

    @freeze_time(TEST_NOW)
    def test_parse_weekday_monday(self):
        """Test parsing weekday name 'Monday'."""
        result = parse_natural_date("Monday")
        assert result is not None
        assert result.weekday() == 0  # Monday
        # Should be next Monday (future), not last Monday
        assert result > datetime.utcnow()
        # From Sunday Jan 4, "Monday" could be tomorrow (Jan 5) or next week
        # dateparser interprets it as the soonest Monday, which is Jan 5
        assert result.date() >= datetime(2026, 1, 5).date()

    @freeze_time(TEST_NOW)
    def test_parse_weekday_friday(self):
        """Test parsing weekday name 'Friday'."""
        result = parse_natural_date("Friday")
        assert result is not None
        assert result.weekday() == 4  # Friday
        # Should be in the future
        assert result > datetime.utcnow()

    @freeze_time(TEST_NOW)
    def test_parse_absolute_date_monthday(self):
        """Test parsing absolute date 'January 15'."""
        result = parse_natural_date("January 15")
        assert result is not None
        assert result.month == 1
        assert result.day == 15
        # Should default to current year or next occurrence
        assert result.year >= 2026

    @freeze_time(TEST_NOW)
    def test_parse_absolute_date_full(self):
        """Test parsing absolute date with year 'January 15, 2026'."""
        result = parse_natural_date("January 15, 2026")
        assert result is not None
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 15

    @freeze_time(TEST_NOW)
    def test_parse_iso_date(self):
        """Test parsing ISO 8601 date string."""
        result = parse_natural_date("2026-01-15")
        assert result is not None
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 15

    @freeze_time(TEST_NOW)
    def test_parse_iso_datetime(self):
        """Test parsing ISO 8601 datetime string."""
        result = parse_natural_date("2026-01-15T14:30:00")
        assert result is not None
        assert result.year == 2026
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 14
        assert result.minute == 30

    @freeze_time(TEST_NOW)
    def test_parse_with_time_afternoon(self):
        """Test parsing date with time 'tomorrow at 3pm'."""
        result = parse_natural_date("tomorrow at 3pm")
        assert result is not None
        assert result.date() == datetime(2026, 1, 5).date()
        assert result.hour == 15  # 3pm = 15:00

    @freeze_time(TEST_NOW)
    def test_parse_with_time_morning(self):
        """Test parsing date with time 'Friday morning'."""
        # Note: "Friday morning" may not parse reliably with all date parsers
        # Test with a more specific time instead
        result = parse_natural_date("Friday at 9am")
        assert result is not None
        assert result.weekday() == 4  # Friday
        assert result.hour == 9

    @freeze_time(TEST_NOW)
    def test_parse_invalid_string(self):
        """Test parsing invalid date string."""
        result = parse_natural_date("not a date")
        assert result is None

    @freeze_time(TEST_NOW)
    def test_parse_invalid_garbage(self):
        """Test parsing garbage input."""
        result = parse_natural_date("foobar123")
        assert result is None

    @freeze_time(TEST_NOW)
    def test_parse_empty_string(self):
        """Test parsing empty string."""
        result = parse_natural_date("")
        assert result is None

    @freeze_time(TEST_NOW)
    def test_parse_whitespace_only(self):
        """Test parsing whitespace-only string."""
        result = parse_natural_date("   ")
        assert result is None

    @freeze_time(TEST_NOW)
    def test_parse_prefer_future_default(self):
        """Test that prefer_future defaults to True."""
        # "Monday" should be next Monday, not last Monday
        result = parse_natural_date("Monday")
        assert result is not None
        assert result > datetime.utcnow()

    @freeze_time(TEST_NOW)
    def test_parse_returns_naive_datetime(self):
        """Test that parsed datetime is naive (no timezone info)."""
        result = parse_natural_date("tomorrow")
        assert result is not None
        assert result.tzinfo is None  # Should be naive


class TestValidateDateNotPast:
    """Test validate_date_not_past() function."""

    @freeze_time(TEST_NOW)
    def test_validate_future_date_valid(self):
        """Test that future dates are valid."""
        future = datetime(2026, 1, 10, 12, 0)  # 6 days in the future
        is_valid, warning = validate_date_not_past(future, require_confirmation=True)
        assert is_valid is True
        assert warning is None

    @freeze_time(TEST_NOW)
    def test_validate_past_date_requires_confirmation(self):
        """Test that past dates require confirmation."""
        past = datetime(2026, 1, 1, 12, 0)  # 3 days in the past
        is_valid, warning = validate_date_not_past(past, require_confirmation=True)
        assert is_valid is False
        assert warning == "This date is in the past"

    @freeze_time(TEST_NOW)
    def test_validate_past_date_no_confirmation_required(self):
        """Test that past dates are allowed when confirmation not required."""
        past = datetime(2026, 1, 1, 12, 0)  # 3 days in the past
        is_valid, warning = validate_date_not_past(past, require_confirmation=False)
        assert is_valid is True
        assert warning is None

    @freeze_time(TEST_NOW)
    def test_validate_today_allowed_by_default(self):
        """Test that dates from today are allowed when allow_today=True."""
        today_morning = datetime(2026, 1, 4, 8, 0)  # Earlier today
        is_valid, warning = validate_date_not_past(today_morning, require_confirmation=True, allow_today=True)
        assert is_valid is True
        assert warning is None

    @freeze_time(TEST_NOW)
    def test_validate_today_rejected_when_disallowed(self):
        """Test that past times today are rejected when allow_today=False."""
        today_morning = datetime(2026, 1, 4, 8, 0)  # Earlier today (current time is noon)
        is_valid, warning = validate_date_not_past(today_morning, require_confirmation=True, allow_today=False)
        assert is_valid is False
        assert warning == "This date is in the past"

    @freeze_time(TEST_NOW)
    def test_validate_exact_now(self):
        """Test validation of current moment."""
        now = datetime.utcnow()
        is_valid, warning = validate_date_not_past(now, require_confirmation=True, allow_today=True)
        assert is_valid is True  # Same day, should be allowed
        assert warning is None


class TestFormatDateForUser:
    """Test format_date_for_user() function."""

    @freeze_time(TEST_NOW)
    def test_format_today_with_time(self):
        """Test formatting today's date with time."""
        today = datetime(2026, 1, 4, 15, 30)  # Today at 3:30 PM
        result = format_date_for_user(today)
        assert "Today" in result
        assert "3:30 PM" in result

    @freeze_time(TEST_NOW)
    def test_format_today_midnight(self):
        """Test formatting today at midnight (no time shown)."""
        today = datetime(2026, 1, 4, 0, 0)  # Today at midnight
        result = format_date_for_user(today)
        assert result == "Today"

    @freeze_time(TEST_NOW)
    def test_format_tomorrow_with_time(self):
        """Test formatting tomorrow with time."""
        tomorrow = datetime(2026, 1, 5, 9, 0)  # Tomorrow at 9 AM
        result = format_date_for_user(tomorrow)
        assert "Tomorrow" in result
        assert "9:00 AM" in result

    @freeze_time(TEST_NOW)
    def test_format_yesterday(self):
        """Test formatting yesterday."""
        yesterday = datetime(2026, 1, 3, 14, 0)  # Yesterday at 2 PM
        result = format_date_for_user(yesterday)
        assert "Yesterday" in result
        assert "2:00 PM" in result

    @freeze_time(TEST_NOW)
    def test_format_this_week_monday(self):
        """Test formatting upcoming weekday this week."""
        # From Sunday Jan 4, next Monday is Jan 5
        monday = datetime(2026, 1, 5, 10, 0)  # Tomorrow (Monday) at 10 AM
        result = format_date_for_user(monday)
        # Should show "Tomorrow" since it's the next day
        assert "Tomorrow" in result
        assert "10:00 AM" in result

    @freeze_time(TEST_NOW)
    def test_format_last_week(self):
        """Test formatting weekday from last week."""
        last_monday = datetime(2025, 12, 30, 11, 0)  # Last Monday (5 days ago)
        result = format_date_for_user(last_monday)
        assert "Last" in result
        assert "Tuesday" in result  # Dec 30 was a Tuesday

    @freeze_time(TEST_NOW)
    def test_format_same_year_far_future(self):
        """Test formatting date later this year."""
        march = datetime(2026, 3, 15, 14, 30)  # March 15, 2026
        result = format_date_for_user(march)
        assert "Mar 15" in result
        assert "2026" not in result  # Same year, don't show year
        assert "2:30 PM" in result

    @freeze_time(TEST_NOW)
    def test_format_different_year(self):
        """Test formatting date in different year."""
        next_year = datetime(2027, 2, 20, 16, 45)  # Feb 20, 2027
        result = format_date_for_user(next_year)
        assert "Feb 20, 2027" in result
        assert "4:45 PM" in result

    @freeze_time(TEST_NOW)
    def test_format_no_leading_zero_in_hour(self):
        """Test that formatted time doesn't have leading zero in hour."""
        date = datetime(2026, 1, 5, 9, 0)  # 9 AM
        result = format_date_for_user(date)
        assert "9:00 AM" in result
        assert "09:00" not in result


class TestGetWeekdayName:
    """Test get_weekday_name() function."""

    def test_get_monday(self):
        """Test getting weekday name for Monday."""
        monday = datetime(2026, 1, 5)  # A Monday
        assert get_weekday_name(monday) == "Monday"

    def test_get_friday(self):
        """Test getting weekday name for Friday."""
        friday = datetime(2026, 1, 9)  # A Friday
        assert get_weekday_name(friday) == "Friday"

    def test_get_sunday(self):
        """Test getting weekday name for Sunday."""
        sunday = datetime(2026, 1, 4)  # A Sunday
        assert get_weekday_name(sunday) == "Sunday"


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    @freeze_time("2026-02-28 12:00:00")  # Last day of February (non-leap year in 2026)
    def test_parse_end_of_february(self):
        """Test parsing dates at end of February."""
        result = parse_natural_date("tomorrow")
        assert result is not None
        # Should be March 1
        assert result.month == 3
        assert result.day == 1

    @freeze_time("2026-12-31 23:59:59")  # Last moment of the year
    def test_parse_at_year_boundary(self):
        """Test parsing 'tomorrow' at year boundary."""
        result = parse_natural_date("tomorrow")
        assert result is not None
        # Should be January 1 of next year
        assert result.year == 2027
        assert result.month == 1
        assert result.day == 1

    @freeze_time(TEST_NOW)
    def test_parse_case_insensitive(self):
        """Test that parsing is case-insensitive."""
        result_lower = parse_natural_date("monday")
        result_upper = parse_natural_date("MONDAY")
        result_mixed = parse_natural_date("MoNdAy")

        assert result_lower is not None
        assert result_upper is not None
        assert result_mixed is not None
        # All should parse to the same date
        assert result_lower.date() == result_upper.date() == result_mixed.date()

    @freeze_time(TEST_NOW)
    def test_parse_with_extra_whitespace(self):
        """Test parsing with extra whitespace."""
        result = parse_natural_date("  tomorrow  ")
        assert result is not None
        assert result.date() == datetime(2026, 1, 5).date()
