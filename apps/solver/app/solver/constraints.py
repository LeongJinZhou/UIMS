"""
Constraint definitions for the timetable solver.
Based on Section 6.6 of the UIMS Blueprint.
"""


# ============================================
# HARD CONSTRAINTS (never violated)
# ============================================

HARD_CONSTRAINTS = {
    "no_student_clash": {
        "description": "No student assigned to two concurrent classes",
        "priority": 1,
    },
    "no_lecturer_clash": {
        "description": "No lecturer assigned to two concurrent classes",
        "priority": 1,
    },
    "room_capacity": {
        "description": "Room capacity not exceeded (combined headcount for merged classes)",
        "priority": 1,
    },
    "room_equipment": {
        "description": "Required room equipment available (labs, AV, computer suites)",
        "priority": 1,
    },
    "room_not_blocked": {
        "description": "Room not blocked for maintenance or university events",
        "priority": 1,
    },
    "prerequisites_satisfied": {
        "description": "All prerequisite relationships satisfied before subject appears",
        "priority": 1,
    },
    "credit_limits": {
        "description": "Credit limits enforced per student (20 long / 10 short / 21 appeal)",
        "priority": 1,
    },
    "offering_schedule": {
        "description": "Only subjects on HoP Course Offering Schedule can be timetabled",
        "priority": 1,
    },
}


# ============================================
# SOFT CONSTRAINTS (score-optimised)
# ============================================

SOFT_CONSTRAINTS = {
    "minimise_campus_days": {
        "description": "Minimise number of campus days per student per week",
        "weight": 100,  # Highest priority soft constraint
    },
    "avoid_idle_gaps": {
        "description": "Avoid long idle gaps between student's classes within same day",
        "weight": 80,
    },
    "distribute_across_week": {
        "description": "Distribute classes across the week (not concentrated in 2 days)",
        "weight": 60,
    },
    "student_time_preference": {
        "description": "Honour student preferences (early morning vs late afternoon)",
        "weight": 30,
    },
    "maximise_room_utilisation": {
        "description": "Maximise room utilisation, minimise empty room-hours",
        "weight": 50,
    },
    "lecturer_back_to_back_limit": {
        "description": "Avoid more than 2 consecutive back-to-back classes for lecturers",
        "weight": 70,
    },
    "merged_class_room_clustering": {
        "description": "Cluster merged cross-programme classes in larger rooms",
        "weight": 40,
    },
}
