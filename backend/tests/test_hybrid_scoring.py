import pytest
from datetime import datetime, timedelta
from app.agents.prioritization import AIPrioritizationService
from app.models import Task, Priority, TaskStatus

def test_calculate_hybrid_score():
    """
    Test the hybrid scoring formula.
    Formula: 0.5 * AI + 0.3 * Urgency + 0.2 * Priority
    """
    from app.agents.prioritization import calculate_hybrid_score
    
    now = datetime.utcnow()
    
    # 1. High AI, Low Urgency, High Priority
    # AI=100, Urgency=0 (far future), Priority=100 (High)
    # Expected: 0.5*100 + 0.3*0 + 0.2*100 = 50 + 0 + 20 = 70
    score1 = calculate_hybrid_score(
        ai_score=100,
        due_date=now + timedelta(days=30),
        priority_score=100
    )
    assert score1 == 70

    # 2. Low AI, High Urgency, Low Priority
    # AI=0, Urgency=100 (overdue), Priority=0 (Low)
    # Expected: 0.5*0 + 0.3*100 + 0.2*0 = 30
    score2 = calculate_hybrid_score(
        ai_score=0,
        due_date=now - timedelta(days=1),
        priority_score=0
    )
    assert score2 == 30

    # 3. Mid everything
    # AI=50, Urgency=50 (due in 2.5 days if 5 days is 'mid'), Priority=50
    # Let's say 3 days is ~50 score
    score3 = calculate_hybrid_score(
        ai_score=50,
        due_date=now + timedelta(days=3),
        priority_score=50
    )
    # Urgency for 3 days: max(0, 100 * (1 - 3/7)) = 100 * (4/7) = 57
    # 0.5*50 + 0.3*57 + 0.2*50 = 25 + 17.1 + 10 = 52.1 -> 52
    assert 50 <= score3 <= 55

def test_urgency_score_calculation():
    """Verify urgency score mapping."""
    from app.agents.prioritization import calculate_urgency_score
    now = datetime.utcnow()
    
    # Overdue or due now
    assert calculate_urgency_score(now - timedelta(hours=1)) == 100
    assert calculate_urgency_score(now) == 100
    
    # Due in 1 day
    # (1 - 1/7) * 100 = 85.7 -> 86
    assert calculate_urgency_score(now + timedelta(days=1)) == 86
    
    # Due in 7 days or more
    assert calculate_urgency_score(now + timedelta(days=7)) == 0
    assert calculate_urgency_score(now + timedelta(days=10)) == 0
    assert calculate_urgency_score(None) == 0
