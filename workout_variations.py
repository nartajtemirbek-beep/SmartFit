"""Three rotating workout schedules for each experience/equipment combination.
Simple educational activity suggestions, not medical prescriptions.
"""
PLAN_NAMES = ("Balanced Routine", "Strength & Skills", "Variety & Mobility")

# Every equipment option has three suitable sessions at each experience level.
ACTIVITIES = {
    "No equipment": {
        "Beginner": [
            ["Chair squat", "Wall push-up", "Standing hip hinge", "Bird-dog"],
            ["Supported split squat", "Incline push-up", "Glute bridge", "Dead bug"],
            ["Step-ups on a stable low step", "Calf raises", "Side plank from knees", "Easy walk"],
        ],
        "Intermediate": [
            ["Bodyweight squat", "Incline push-up", "Reverse lunge", "Bird-dog"],
            ["Split squat", "Push-up variation", "Glute bridge", "Side plank"],
            ["Step-up", "Hip hinge", "Controlled mountain climber", "Dead bug"],
        ],
        "Advanced": [
            ["Tempo bodyweight squat", "Push-up variation", "Reverse lunge", "Plank"],
            ["Split squat", "Close-grip push-up variation", "Single-leg bridge", "Side plank"],
            ["Controlled step-up", "Pike push-up variation", "Hip hinge", "Dead bug"],
        ],
    },
    "Home": {
        "Beginner": [
            ["Chair squat", "Wall push-up", "Light resistance-band row", "Gentle mobility"],
            ["Supported lunge", "Incline push-up", "Light band pull-apart", "Glute bridge"],
            ["Low step-up", "Light band overhead press", "Bird-dog", "Calf raises"],
        ],
        "Intermediate": [
            ["Goblet squat with light weight", "Dumbbell floor press", "Resistance-band row", "Dead bug"],
            ["Split squat", "Dumbbell shoulder press", "Band pull-apart", "Glute bridge"],
            ["Light Romanian deadlift", "Incline push-up", "One-arm dumbbell row", "Side plank"],
        ],
        "Advanced": [
            ["Dumbbell squat variation", "Dumbbell floor press", "One-arm row", "Plank"],
            ["Dumbbell split squat", "Standing shoulder press", "Band row", "Hip bridge"],
            ["Dumbbell hip hinge", "Push-up variation", "Reverse lunge", "Side plank"],
        ],
    },
    "Gym": {
        "Beginner": [
            ["Leg press", "Chest press machine", "Seated row", "Easy mobility"],
            ["Assisted squat", "Lat pulldown", "Seated shoulder press", "Glute bridge"],
            ["Leg curl machine", "Incline chest press machine", "Cable row", "Light walking"],
        ],
        "Intermediate": [
            ["Goblet squat or leg press", "Chest press", "Seated row", "Plank"],
            ["Romanian deadlift with manageable load", "Lat pulldown", "Shoulder press", "Calf raise"],
            ["Split squat", "Cable row", "Incline chest press", "Dead bug"],
        ],
        "Advanced": [
            ["Squat variation", "Bench press variation", "Barbell or cable row", "Core stability"],
            ["Deadlift variation with controlled form", "Overhead press", "Lat pulldown", "Calf raise"],
            ["Split squat or leg press", "Incline press", "Seated row", "Side plank"],
        ],
    },
}
EASY_DAY = ["Comfortable walk", "Gentle stretching", "Balance practice", "Easy mobility"]
FOCUS = [
    ("Full body", "Movement and mobility", "Full body balance"),
    ("Lower-body & pulling", "Upper-body & stability", "Full body technique"),
    ("Functional strength", "Movement and endurance", "Full body variety"),
]

def plan_for(profile, variant=0):
    """Return a fresh list in the established dashboard-compatible schema."""
    days = max(1, min(7, int(profile["training_days"])))
    equipment = profile["equipment"] if profile["equipment"] in ACTIVITIES else "No equipment"
    experience = profile["experience"] if profile["experience"] in ACTIVITIES[equipment] else "Beginner"
    variant = int(variant) % len(PLAN_NAMES)
    options = ACTIVITIES[equipment][experience]
    schedule = []
    for i in range(days):
        if i in (3, 6):
            focus = "Active recovery & mobility"
            exercises = EASY_DAY[:]
        else:
            slot = (i - (1 if i >= 4 else 0)) % 3
            which = (slot + variant) % 3
            focus = FOCUS[variant][slot]
            exercises = options[which][:]
            if i in (4, 5):
                exercises[-1] = "Gentle stretching" if i == 5 else "Comfortable walk"
        schedule.append({"day": f"Day {i+1}", "focus": focus, "exercises": exercises})
    return schedule

def next_variant(previous_title):
    """Legacy plans start at variation 2, then rotate 3 -> 1 -> 2."""
    if not previous_title:
        return 0
    if previous_title.startswith("SmartFit Variation "):
        try:
            last = int(previous_title.rsplit(" ", 1)[1])
            if 1 <= last <= len(PLAN_NAMES):
                return last % len(PLAN_NAMES)
        except ValueError:
            pass
    return 1
