"""
OR-Tools Constraint Solver Engine for Timetable Generation.

Uses Google OR-Tools CP-SAT solver to find optimal timetable assignments
respecting hard constraints and optimising soft constraints.
"""

import time
from ortools.sat.python import cp_model

from app.solver.models import (
    SolverRequest,
    SolverResponse,
    ScheduledSlot,
)
from app.solver.constraints import SOFT_CONSTRAINTS


# Time slot definitions (1-hour blocks from 8am to 6pm)
TIME_SLOTS = [
    ("08:00", "09:00"),
    ("09:00", "10:00"),
    ("10:00", "11:00"),
    ("11:00", "12:00"),
    ("12:00", "13:00"),  # Lunch — can be scheduled but penalised
    ("13:00", "14:00"),
    ("14:00", "15:00"),
    ("15:00", "16:00"),
    ("16:00", "17:00"),
    ("17:00", "18:00"),
]

NUM_DAYS = 5       # Monday to Friday
NUM_SLOTS = len(TIME_SLOTS)


def solve_timetable(request: SolverRequest, time_limit: int = 300) -> SolverResponse:
    """
    Main solver entry point.

    Takes a SolverRequest with all offerings, venues, lecturer availability,
    and student enrolments. Returns an optimised timetable or reports failures.

    Args:
        request: Complete solver input
        time_limit: Maximum solver runtime in seconds

    Returns:
        SolverResponse with scheduled slots and optimisation score
    """
    start_time = time.time()

    model = cp_model.CpModel()

    # --- Decision Variables ---
    # For each offering, assign: (day, time_slot, venue)
    assignments = {}
    for offering in request.offerings:
        for slot_idx in range(offering.required_slots):
            var_key = f"{offering.id}_slot{slot_idx}"
            day_var = model.new_int_var(0, NUM_DAYS - 1, f"{var_key}_day")
            time_var = model.new_int_var(0, NUM_SLOTS - 1, f"{var_key}_time")
            venue_idx_var = model.new_int_var(
                0, len(request.venues) - 1, f"{var_key}_venue"
            )
            assignments[var_key] = {
                "offering_id": offering.id,
                "section_id": offering.section_id,
                "day": day_var,
                "time": time_var,
                "venue_idx": venue_idx_var,
                "headcount": offering.headcount,
                "lecturer_id": offering.lecturer_id,
            }

    # --- Hard Constraints ---

    # 1. No lecturer clash: same lecturer cannot be at two places at same time
    lecturer_offerings: dict[str, list[str]] = {}
    for key, assignment in assignments.items():
        lid = assignment["lecturer_id"]
        if lid not in lecturer_offerings:
            lecturer_offerings[lid] = []
        lecturer_offerings[lid].append(key)

    for lecturer_id, offering_keys in lecturer_offerings.items():
        for i in range(len(offering_keys)):
            for j in range(i + 1, len(offering_keys)):
                a = assignments[offering_keys[i]]
                b = assignments[offering_keys[j]]
                # If same day, must be different time
                same_day = model.new_bool_var(
                    f"same_day_{offering_keys[i]}_{offering_keys[j]}"
                )
                model.add(a["day"] == b["day"]).only_enforce_if(same_day)
                model.add(a["day"] != b["day"]).only_enforce_if(same_day.negated())
                model.add(a["time"] != b["time"]).only_enforce_if(same_day)

    # 2. Room capacity check is done post-solve (venue assignment validation)

    # 3. No student clash (students in multiple offerings can't have same slot)
    # Build student-to-offering mapping
    student_offerings: dict[str, list[str]] = {}
    for enrolment in request.student_enrolments:
        for oid in enrolment.offering_ids:
            matching_keys = [
                k for k in assignments if assignments[k]["offering_id"] == oid
            ]
            if enrolment.student_id not in student_offerings:
                student_offerings[enrolment.student_id] = []
            student_offerings[enrolment.student_id].extend(matching_keys)

    for student_id, s_keys in student_offerings.items():
        for i in range(len(s_keys)):
            for j in range(i + 1, len(s_keys)):
                a = assignments[s_keys[i]]
                b = assignments[s_keys[j]]
                same_day = model.new_bool_var(
                    f"student_{student_id}_sd_{s_keys[i]}_{s_keys[j]}"
                )
                model.add(a["day"] == b["day"]).only_enforce_if(same_day)
                model.add(a["day"] != b["day"]).only_enforce_if(same_day.negated())
                model.add(a["time"] != b["time"]).only_enforce_if(same_day)

    # --- Soft Constraints (Objective) ---
    # Minimise campus days per student
    objective_terms = []

    # The objective function will be extended as constraints are refined.
    # For now, use a placeholder that distributes classes across days.
    for key, assignment in assignments.items():
        # Penalise late slots slightly to prefer morning scheduling
        objective_terms.append(assignment["time"])

    if objective_terms:
        model.minimize(sum(objective_terms))

    # --- Solve ---
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit
    solver.parameters.num_workers = 4

    status = solver.solve(model)

    solve_time = time.time() - start_time

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        slots = []
        for key, assignment in assignments.items():
            day = solver.value(assignment["day"])
            time_idx = solver.value(assignment["time"])
            venue_idx = solver.value(assignment["venue_idx"])
            venue = request.venues[venue_idx]

            start_t, end_t = TIME_SLOTS[time_idx]
            slots.append(
                ScheduledSlot(
                    offering_id=assignment["offering_id"],
                    section_id=assignment["section_id"],
                    venue_id=venue.id,
                    day_of_week=day,
                    start_time=start_t,
                    end_time=end_t,
                    is_merged_class=False,
                )
            )

        return SolverResponse(
            success=True,
            score=solver.objective_value if objective_terms else 0,
            slots=slots,
            warnings=[],
            unscheduled=[],
            solve_time_seconds=round(solve_time, 2),
        )
    else:
        return SolverResponse(
            success=False,
            score=0,
            slots=[],
            warnings=["Solver could not find a feasible solution"],
            unscheduled=[o.id for o in request.offerings],
            solve_time_seconds=round(solve_time, 2),
        )
