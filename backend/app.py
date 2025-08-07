from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from models import db, Course, Instructor, Room, Timetable, Faculty, Department
from config import Config
from generator import TimetableGenerator
from flask_migrate import Migrate
import logging
import json

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
app.config.from_object(Config)

# Initialize database and CORS
db.init_app(app)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"], supports_credentials=True)
migrate = Migrate(app, db)

# Create tables
with app.app_context():
    db.create_all()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ----------------- COURSES -----------------

@app.route("/api/courses", methods=["GET"])
def get_courses():
    try:
        courses = Course.query.all()
        result = [{
            "id": c.id,
            "code": c.code,
            "name": c.name,
            "credit_hours": c.credit_hours,
            "level": c.level,
            "faculty": c.faculty,
            "department": c.department,
            "semester": c.semester,
            "num_students": c.num_students,
            "duration": c.duration
        } for c in courses]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch courses: {str(e)}"}), 500

@app.route("/api/courses", methods=["POST"])
def add_course():
    data = request.json
    try:
        required = ["code", "name", "credit_hours", "level", "faculty", "department", "semester", "num_students", "duration"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required."}), 400

        if Course.query.filter_by(code=data["code"].upper()).first():
            return jsonify({"error": "Course with this code already exists."}), 400

        course = Course(
            code=data["code"].upper(),
            name=data["name"],
            credit_hours=int(data["credit_hours"]),
            level=str(data["level"]),
            faculty=data["faculty"],
            department=data["department"],
            semester=data["semester"],
            num_students=int(data["num_students"]),
            duration=int(data["duration"])
        )
        db.session.add(course)
        db.session.commit()

        return jsonify({
            "id": course.id,
            "code": course.code,
            "name": course.name,
            "credit_hours": course.credit_hours,
            "level": course.level,
            "faculty": course.faculty,
            "department": course.department,
            "semester": course.semester,
            "num_students": course.num_students,
            "duration": course.duration
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add course: {str(e)}"}), 500

@app.route("/api/courses/<int:course_id>", methods=["DELETE"])
def delete_course(course_id):
    try:
        course = Course.query.get(course_id)
        if not course:
            return jsonify({"error": "Course not found."}), 404
        db.session.delete(course)
        db.session.commit()
        return jsonify({"message": "Course deleted."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete course: {str(e)}"}), 500

@app.route("/api/courses/<int:course_id>", methods=["PUT"])
def update_course(course_id):
    data = request.get_json()
    course = Course.query.get(course_id)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    # Update fields
    course.name = data.get("name", course.name)
    course.credit_hours = data.get("credit_hours", course.credit_hours)
    course.level = data.get("level", course.level)
    course.faculty = data.get("faculty", course.faculty)
    course.department = data.get("department", course.department)
    course.semester = data.get("semester", course.semester)
    course.num_students = data.get("num_students", course.num_students)
    course.duration = data.get("duration", course.duration)
    db.session.commit()
    return jsonify({
        "id": course.id,
        "code": course.code,
        "name": course.name,
        "credit_hours": course.credit_hours,
        "level": course.level,
        "faculty": course.faculty,
        "department": course.department,
        "semester": course.semester,
        "num_students": course.num_students,
        "duration": course.duration
    })

# ----------------- FACULTIES -----------------

@app.route("/api/faculties", methods=["GET"])
def get_faculties():
    faculties = Faculty.query.all()
    return jsonify([{"id": f.id, "name": f.name} for f in faculties])

@app.route("/api/faculties", methods=["POST"])
def add_faculty():
    try:
        if not request.is_json:
            logger.warning("Request is not JSON")
            return jsonify({"error": "Request must be JSON."}), 400

        data = request.get_json(force=True)
        logger.info(f"Received JSON data: {data}")

        name = data.get("name")
        if not name:
            logger.warning("Faculty name missing in request")
            return jsonify({"error": "Faculty name is required."}), 400

        if Faculty.query.filter_by(name=name).first():
            logger.warning(f"Faculty '{name}' already exists")
            return jsonify({"error": "Faculty already exists."}), 400

        faculty = Faculty(name=name)
        db.session.add(faculty)
        db.session.commit()
        logger.info(f"Faculty '{name}' added with id {faculty.id}")
        return jsonify({"id": faculty.id, "name": faculty.name}), 201

    except Exception as e:
        logger.exception("Error in /api/faculties POST")
        db.session.rollback()
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500


@app.route("/api/faculties/<int:faculty_id>", methods=["PUT"])
def edit_faculty(faculty_id):
    data = request.json
    name = data.get("name")
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404
    faculty.name = name
    db.session.commit()
    return jsonify({"id": faculty.id, "name": faculty.name})

@app.route("/api/faculties/<int:faculty_id>", methods=["DELETE"])
def delete_faculty(faculty_id):
    faculty = Faculty.query.get(faculty_id)
    if not faculty:
        return jsonify({"error": "Faculty not found."}), 404
    db.session.delete(faculty)
    db.session.commit()
    return jsonify({"message": "Faculty deleted."})

# ----------------- DEPARTMENTS -----------------

@app.route("/api/departments", methods=["GET"])
def get_departments():
    faculty_id = request.args.get("faculty_id")
    if faculty_id:
        departments = Department.query.filter_by(faculty_id=faculty_id).all()
    else:
        departments = Department.query.all()
    return jsonify([
        {"id": d.id, "name": d.name, "faculty_id": d.faculty_id, "faculty": d.faculty.name}
        for d in departments
    ])

@app.route("/api/departments", methods=["POST"])
def add_department():
    data = request.json
    name = data.get("name")
    faculty_id = data.get("faculty_id")
    if not name or not faculty_id:
        return jsonify({"error": "Department name and faculty_id are required."}), 400
    if Department.query.filter_by(name=name, faculty_id=faculty_id).first():
        return jsonify({"error": "Department already exists."}), 400
    department = Department(name=name, faculty_id=faculty_id)
    db.session.add(department)
    db.session.commit()
    return jsonify({
        "id": department.id,
        "name": department.name,
        "faculty_id": department.faculty_id,
        "faculty": department.faculty.name
    }), 201

@app.route("/api/departments/<int:department_id>", methods=["PUT"])
def edit_department(department_id):
    data = request.json
    name = data.get("name")
    department = Department.query.get(department_id)
    if not department:
        return jsonify({"error": "Department not found."}), 404
    department.name = name
    db.session.commit()
    return jsonify({
        "id": department.id,
        "name": department.name,
        "faculty_id": department.faculty_id,
        "faculty": department.faculty.name
    })

@app.route("/api/departments/<int:department_id>", methods=["DELETE"])
def delete_department(department_id):
    department = Department.query.get(department_id)
    if not department:
        return jsonify({"error": "Department not found."}), 404
    db.session.delete(department)
    db.session.commit()
    return jsonify({"message": "Department deleted."})

# ----------------- ROOMS -----------------

@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    try:
        rooms = Room.query.all()
        result = [{
            "id": r.id,
            "name": r.name,
            "capacity": r.capacity,
            "type": r.type,
            "faculty": r.faculty
        } for r in rooms]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch rooms: {str(e)}"}), 500

@app.route("/api/rooms", methods=["POST"])
def add_room():
    data = request.json
    try:
        required = ["name", "capacity", "type", "faculty"]  # removed "department"
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required."}), 400

        if Room.query.filter_by(
            name=data["name"],
            type=data["type"],
            faculty=data["faculty"]
        ).first():
            return jsonify({"error": "Room already exists."}), 400

        room = Room(
            name=data["name"],
            capacity=int(data["capacity"]),
            type=data["type"],
            faculty=data["faculty"]
        )
        db.session.add(room)
        db.session.commit()
        return jsonify({
            "id": room.id,
            "name": room.name,
            "capacity": room.capacity,
            "type": room.type,
            "faculty": room.faculty
        }), 201
    except Exception as e:
        logger.exception("Error in /api/rooms POST")
        db.session.rollback()
        return jsonify({"error": f"Failed to add room: {str(e)}"}), 500

@app.route("/api/rooms/<int:room_id>", methods=["DELETE"])
def delete_room(room_id):
    try:
        room = Room.query.get(room_id)
        if not room:
            return jsonify({"error": "Room not found."}), 404
        db.session.delete(room)
        db.session.commit()
        return jsonify({"message": "Room deleted."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete room: {str(e)}"}), 500

# ----------------- INSTRUCTORS -----------------

@app.route("/api/instructors", methods=["GET"])
def get_instructors():
    try:
        instructors = Instructor.query.all()
        result = [{
            "id": i.id,
            "name": i.name,
            "faculty": i.faculty,
            "department": i.department,
            "courses": i.courses.split(",") if i.courses else []
        } for i in instructors]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Failed to fetch instructors: {str(e)}"}), 500

@app.route("/api/instructors", methods=["POST"])
def add_instructor():
    data = request.json
    try:
        required = ["name", "faculty", "department", "courses"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Field '{field}' is required."}), 400

        instructor = Instructor(
            name=data["name"],
            faculty=data["faculty"],
            department=data["department"],
            courses=",".join(data["courses"]) if isinstance(data["courses"], list) else data["courses"]
        )
        db.session.add(instructor)
        db.session.commit()
        return jsonify({
            "id": instructor.id,
            "name": instructor.name,
            "faculty": instructor.faculty,
            "department": instructor.department,
            "courses": instructor.courses.split(",") if instructor.courses else []
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to add instructor: {str(e)}"}), 500

@app.route("/api/instructors/<int:instructor_id>", methods=["PUT"])
def update_instructor(instructor_id):
    data = request.json
    instructor = Instructor.query.get(instructor_id)
    if not instructor:
        return jsonify({"error": "Instructor not found."}), 404
    instructor.name = data.get("name", instructor.name)
    instructor.faculty = data.get("faculty", instructor.faculty)
    instructor.department = data.get("department", instructor.department)
    courses = data.get("courses")
    if courses is not None:
        instructor.courses = ",".join(courses) if isinstance(courses, list) else courses
    db.session.commit()
    return jsonify({
        "id": instructor.id,
        "name": instructor.name,
        "faculty": instructor.faculty,
        "department": instructor.department,
        "courses": instructor.courses.split(",") if instructor.courses else []
    })

@app.route("/api/instructors/<int:instructor_id>", methods=["DELETE"])
def delete_instructor(instructor_id):
    instructor = Instructor.query.get(instructor_id)
    if not instructor:
        return jsonify({"error": "Instructor not found."}), 404
    db.session.delete(instructor)
    db.session.commit()
    return jsonify({"message": "Instructor deleted."})

# ----------------- TIMETABLE GENERATION -----------------

@app.route('/api/generate', methods=['POST'])
def generate_timetable():
    data = request.json
    print("Received data for generation:", data)  # Add this line for debugging
    try:
        generator = TimetableGenerator(
            courses=data["courses"],
            instructors=data["instructors"],
            rooms=data["rooms"],
            constraints={
                "faculty": data["faculty"],
                "semester": data["semester"],
                "session": data["session"],
                "time_frame": data.get("time_frame"),
                "break": data.get("break")
            }
        )
        result = generator.generate()
        if "error" in result:
            print("Generation error:", result["error"], result.get("conflicts"))
            return jsonify(result), 400
        return jsonify(result)
    except Exception as e:
        print("Exception in /api/generate:", str(e))
        return jsonify({"error": str(e)}), 500

# ----------------- TIMETABLES -----------------

@app.route('/api/timetables', methods=['POST'])
def save_timetable():
    data = request.json
    try:
        name = f"{data.get('faculty', '')} {data.get('semester', '')} {data.get('session', '')}"
        timetable = Timetable(
            name=name,
            session=data.get('session', ''),
            semester=data.get('semester', ''),
            faculty=data.get('faculty', ''),
            department=data.get('department', ''),
            schedule_data=json.dumps(data.get('schedule', {}))
        )
        db.session.add(timetable)
        db.session.commit()
        return jsonify({"message": "Timetable saved.", "id": timetable.id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/timetables', methods=['GET'])
def get_timetables():
    faculty = request.args.get('faculty')
    department = request.args.get('department')
    semester = request.args.get('semester')
    session = request.args.get('session')
    query = Timetable.query
    if faculty:
        query = query.filter_by(faculty=faculty)
    if department:
        query = query.filter_by(department=department)
    if semester:
        query = query.filter_by(semester=semester)
    if session:
        query = query.filter_by(session=session)
    timetables = query.order_by(Timetable.created_at.desc()).all()
    return jsonify([
        {
            "id": t.id,
            "name": t.name,
            "faculty": t.faculty,
            "department": t.department,
            "semester": t.semester,
            "session": t.session,
            "schedule": json.loads(t.schedule_data),
            "created_at": t.created_at.isoformat()
        }
        for t in timetables
    ])

@app.route("/api/timetables/<int:timetable_id>", methods=["DELETE"])
@cross_origin(origins=["http://localhost:3000", "http://127.0.0.1:3000"], methods=["DELETE", "OPTIONS"])
def delete_timetable(timetable_id):
    try:
        timetable = Timetable.query.get(timetable_id)
        if not timetable:
            return jsonify({"error": "Timetable not found."}), 404
        db.session.delete(timetable)
        db.session.commit()
        return jsonify({"message": "Timetable deleted."})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to delete timetable: {str(e)}"}), 500

# ----------------- SESSIONS -----------------

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    # Get all unique session values from Timetable table
    sessions = db.session.query(Timetable.session).distinct().all()
    # Flatten and filter out empty/null sessions
    session_list = [s[0] for s in sessions if s[0]]
    return jsonify(sorted(session_list))

# ----------------- ERROR HANDLER -----------------

@app.errorhandler(Exception)
def handle_exception(e):
    logger.exception("Unhandled Exception")
    return jsonify({"error": "Internal Server Error", "details": str(e)}), 500

# ----------------- HEALTH CHECK -----------------

@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})

# ----------------- RUN APP -----------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

