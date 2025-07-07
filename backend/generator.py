import random
from datetime import datetime, timedelta

class TimetableGenerator:
    def __init__(self, courses, instructors, rooms, constraints):
        self.courses = courses
        self.instructors = instructors
        self.rooms = rooms
        self.constraints = constraints

        self.days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        self.time_frame = constraints.get("time_frame", {"start": "08:00", "end": "18:00"})
        self.break_time = constraints.get("break")  # e.g. "12:00" or None

        # Generate time slots based on time frame and course durations
        self.time_slots = self.generate_time_slots()

    def generate_time_slots(self):
        # Generate all time slots in 1-hour intervals
        start = datetime.strptime(self.time_frame["start"], "%H:%M")
        end = datetime.strptime(self.time_frame["end"], "%H:%M")
        slots = []
        current = start
        while current + timedelta(hours=1) <= end:
            slot_str = current.strftime("%H:%M")
            if not self.break_time or slot_str != self.break_time:
                slots.append(slot_str)
            current += timedelta(hours=1)
        return slots

    def get_course_instructor(self, course_code):
        for instructor in self.instructors:
            if instructor["department"] == course_code.split(" ")[0]:
                return instructor
        return random.choice(self.instructors)

    def get_instructor(self, course):
        # Find instructor for course (by name or code, or assign randomly)
        for inst in self.instructors:
            if course["code"] in inst.get("courses", []):
                return inst
        return random.choice(self.instructors)

    def get_available_days(self, instructor):
        return instructor.get("available_days", self.days)

    def get_available_room(self, course):
        # Find a room with enough capacity
        suitable = [room for room in self.rooms if room["capacity"] >= course["num_students"]]
        return random.choice(suitable) if suitable else None

    def validate_inputs(self):
        errors = []
        if not self.courses:
            errors.append("No courses provided.")
        if not self.instructors:
            errors.append("No instructors provided.")
        if not self.rooms:
            errors.append("No rooms provided.")
        if not self.time_frame.get("start") or not self.time_frame.get("end"):
            errors.append("Time frame (start and end) must be specified.")
        # Check that every course has a duration, num_students, and code
        for course in self.courses:
            if "code" not in course or not course["code"]:
                errors.append("A course is missing its code.")
            if "num_students" not in course or not isinstance(course["num_students"], int):
                errors.append(f"Course {course.get('code', '')} missing or invalid num_students.")
            if "duration" not in course or not isinstance(course["duration"], int):
                errors.append(f"Course {course.get('code', '')} missing or invalid duration.")
        # Check that at least one instructor is available for each course
        for course in self.courses:
            found = False
            for inst in self.instructors:
                if course["code"] in inst.get("courses", []):
                    found = True
                    break
            if not found:
                errors.append(f"No instructor assigned for course {course['code']}.")
        # Check that at least one room can fit each course
        for course in self.courses:
            if not any(room["capacity"] >= course["num_students"] for room in self.rooms):
                errors.append(f"No room can fit course {course['code']} with {course['num_students']} students.")
        return errors

    def get_time_slot_indices(self, start_time, duration_minutes):
        # Returns indices of time slots that would be occupied by a course starting at start_time for duration_minutes
        slot_length = 60  # minutes per slot
        slots_needed = (duration_minutes + slot_length - 1) // slot_length  # round up
        start_idx = self.time_slots.index(start_time)
        return [i for i in range(start_idx, min(start_idx + slots_needed, len(self.time_slots)))]

    def has_conflict(self, schedule, day, start_time, room, instructor, duration_minutes):
        # Check all slots that would be occupied by this course
        slot_indices = self.get_time_slot_indices(start_time, duration_minutes)
        for idx in slot_indices:
            time = self.time_slots[idx]
            for entry in schedule:
                if entry["day"] == day and time == entry["time"]:
                    if entry["room"] == room["name"]:
                        return True
                    if entry["instructor"] == instructor["name"]:
                        return True
        return False

    def create_random_schedule(self):
        schedule = []
        for course in self.courses:
            instructor = self.get_instructor(course)
            available_days = self.get_available_days(instructor)
            room = self.get_available_room(course)
            duration = course.get("duration", 2)  # in hours

            duration_minutes = int(course.get("duration", 60))  # in minutes
            slot_length = 60  # minutes per slot
            slots_needed = (duration_minutes + slot_length - 1) // slot_length  # round up

            assigned = False
            attempts = 0
            while not assigned and attempts < 100:
                day = random.choice(available_days)
                # Only consider start times that allow the full duration to fit
                possible_starts = [
                    t for t in self.time_slots
                    if self.time_slots.index(t) + slots_needed <= len(self.time_slots)
                ]
                if not possible_starts:
                    print(f"No possible start times for {course['code']} on {day} with duration {duration_minutes}")
                    break
                start_time = random.choice(possible_starts)
                # Skip break time
                if self.break_time and start_time == self.break_time:
                    attempts += 1
                    continue
                if not self.has_conflict(schedule, day, start_time, room, instructor, duration_minutes):
                    # Add entries for each slot of the duration
                    slot_indices = self.get_time_slot_indices(start_time, duration_minutes)
                    for idx in slot_indices:
                        time = self.time_slots[idx]
                        schedule.append({
                            "course_code": course["code"],
                            "course_name": course["name"],
                            "level": course["level"],
                            "department": course["department"],
                            "instructor": instructor["name"],
                            "day": day,
                            "time": time,
                            "room": room["name"],
                            "duration": duration_minutes,
                            "num_students": course["num_students"]
                        })
                    assigned = True
                attempts += 1
            if not assigned:
                raise Exception(f"Could not schedule course {course['code']} (no available slot/room/instructor).")
        return schedule

    def initialize_population(self, size):
        return [self.create_random_schedule() for _ in range(size)]

    def evolve_population(self, population):
        # For simplicity, just shuffle and keep best
        population = sorted(population, key=lambda x: self.fitness(x)[0], reverse=True)
        return population[:len(population)//2] * 2

    def generate(self):
        # Validate inputs first
        errors = self.validate_inputs()
        if errors:
            return {
                "schedule": {},
                "score": 0,
                "conflicts": errors,
                "error": "Validation failed"
            }
        try:
            population = self.initialize_population(50)
            best = None
            score = 0
            conflicts = []
            for _ in range(100):
                population = self.evolve_population(population)
                candidate = max(population, key=lambda x: self.fitness(x)[0])
                score, conflicts = self.fitness(candidate)
                if score >= 100:
                    best = candidate
                    break
                best = candidate
            # Group by level for output
            levels = {}
            for entry in best:
                level = str(entry["level"])
                if level not in levels:
                    levels[level] = []
                levels[level].append(entry)
            return {
                "schedule": levels,
                "score": score,
                "conflicts": conflicts
            }
        except Exception as e:
            return {
                "schedule": {},
                "score": 0,
                "conflicts": [str(e)],
                "error": "Generation failed"
            }

    def fitness(self, schedule):
        score = 100
        conflicts = []
        seen = set()
        for entry in schedule:
            key = (entry["day"], entry["time"])
            # Room double-booking
            if (key, entry["room"]) in seen:
                score -= 10
                conflicts.append(f"Room {entry['room']} double-booked at {entry['day']} {entry['time']}")
            seen.add((key, entry["room"]))
            # Instructor double-booking
            if (key, entry["instructor"]) in seen:
                score -= 10
                conflicts.append(f"Instructor {entry['instructor']} double-booked at {entry['day']} {entry['time']}")
            seen.add((key, entry["instructor"]))
        return score, conflicts
