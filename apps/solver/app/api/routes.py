"""
Solver API routes.
"""

from fastapi import APIRouter, HTTPException

from app.solver.models import SolverRequest, SolverResponse
from app.solver.engine import solve_timetable
from app.config import settings

router = APIRouter()


@router.post("/generate", response_model=SolverResponse)
async def generate_timetable(request: SolverRequest):
    """
    Generate a conflict-free timetable.

    Accepts course offerings, venue data, lecturer availability,
    and student enrolments. Returns an optimised timetable assignment.
    """
    try:
        result = solve_timetable(
            request,
            time_limit=settings.solver_time_limit_seconds,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Solver error: {str(e)}"
        )


@router.post("/validate", response_model=dict)
async def validate_timetable(request: SolverRequest):
    """
    Validate a timetable request without solving.
    Checks that all inputs are consistent and complete.
    """
    errors = []

    # Check all offerings reference valid lecturers
    lecturer_ids = {la.lecturer_id for la in request.lecturer_availability}
    for offering in request.offerings:
        if offering.lecturer_id not in lecturer_ids:
            errors.append(
                f"Offering {offering.id}: lecturer {offering.lecturer_id} "
                "not found in availability data"
            )

    # Check all student enrolments reference valid offerings
    offering_ids = {o.id for o in request.offerings}
    for enrolment in request.student_enrolments:
        for oid in enrolment.offering_ids:
            if oid not in offering_ids:
                errors.append(
                    f"Student {enrolment.student_id}: "
                    f"offering {oid} not found"
                )

    # Check merged classes reference valid offerings
    for merge in request.merged_classes:
        if merge.primary_offering_id not in offering_ids:
            errors.append(
                f"Merge: primary offering {merge.primary_offering_id} not found"
            )
        for mid in merge.merged_offering_ids:
            if mid not in offering_ids:
                errors.append(f"Merge: merged offering {mid} not found")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "offerings_count": len(request.offerings),
        "venues_count": len(request.venues),
        "students_count": len(request.student_enrolments),
    }
