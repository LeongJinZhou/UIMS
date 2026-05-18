"""
Basic solver tests.
"""

from app.solver.models import (
    SolverRequest,
    SolverOffering,
    SolverVenue,
    SolverLecturerSlot,
    SolverStudentEnrolment,
)
from app.solver.engine import solve_timetable


def test_empty_request():
    """Solver should handle empty input gracefully."""
    request = SolverRequest(
        semester_id="2026-S1",
        offerings=[],
        venues=[],
        lecturer_availability=[],
        student_enrolments=[],
    )
    result = solve_timetable(request, time_limit=10)
    assert result.success is True
    assert len(result.slots) == 0


def test_single_offering():
    """Solver should schedule a single offering."""
    request = SolverRequest(
        semester_id="2026-S1",
        offerings=[
            SolverOffering(
                id="off-1",
                course_code="COMP101",
                credit_hours=3,
                required_slots=1,
                lecturer_id="lec-1",
                section_id="sec-1",
                headcount=30,
            )
        ],
        venues=[
            SolverVenue(id="room-1", capacity=50, equipment=[])
        ],
        lecturer_availability=[
            SolverLecturerSlot(
                lecturer_id="lec-1",
                available_days=[0, 1, 2, 3, 4],
            )
        ],
        student_enrolments=[],
    )
    result = solve_timetable(request, time_limit=10)
    assert result.success is True
    assert len(result.slots) == 1
    assert result.slots[0].offering_id == "off-1"
