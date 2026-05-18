"""
Pydantic models for solver input/output.
Mirrors the TypeScript SolverRequest / SolverResponse types.
"""

from pydantic import BaseModel, Field


class BlockedSlot(BaseModel):
    day: int
    start: str
    end: str


class SolverOffering(BaseModel):
    """A course offering to schedule."""
    id: str
    course_code: str
    credit_hours: int
    required_slots: int          # Number of time slots needed per week
    lecturer_id: str
    required_equipment: list[str] = []
    section_id: str
    headcount: int


class SolverVenue(BaseModel):
    """A room/venue available for scheduling."""
    id: str
    capacity: int
    equipment: list[str] = []
    blocked_slots: list[BlockedSlot] = []


class SolverLecturerSlot(BaseModel):
    """Lecturer availability."""
    lecturer_id: str
    available_days: list[int]
    available_start: str = "08:00"
    available_end: str = "18:00"
    max_consecutive: int = 2


class SolverStudentEnrolment(BaseModel):
    """Student's course enrolments for conflict checking."""
    student_id: str
    offering_ids: list[str]
    preferred_early: bool = False


class SolverMerge(BaseModel):
    """Cross-programme class merge definition."""
    primary_offering_id: str
    merged_offering_ids: list[str]
    combined_headcount: int


class SolverRequest(BaseModel):
    """Complete input for the timetable solver."""
    semester_id: str
    offerings: list[SolverOffering]
    venues: list[SolverVenue]
    lecturer_availability: list[SolverLecturerSlot]
    student_enrolments: list[SolverStudentEnrolment]
    merged_classes: list[SolverMerge] = []


class ScheduledSlot(BaseModel):
    """A scheduled timetable slot in the solution."""
    offering_id: str
    section_id: str
    venue_id: str
    day_of_week: int            # 0=Mon, 1=Tue, ..., 4=Fri
    start_time: str             # "08:00"
    end_time: str               # "10:00"
    is_merged_class: bool = False


class SolverResponse(BaseModel):
    """Solver output."""
    success: bool
    score: float = Field(description="Soft constraint optimization score")
    slots: list[ScheduledSlot]
    warnings: list[str] = []
    unscheduled: list[str] = Field(
        default=[],
        description="Offering IDs that could not be scheduled"
    )
    solve_time_seconds: float = 0.0
