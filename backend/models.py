from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import PickleType  # or JSON if using PostgreSQL

db = SQLAlchemy()


class Course(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    credit_hours = db.Column(db.Integer, nullable=False)
    level = db.Column(db.String(10), nullable=False)  # e.g. "100", "200"
    faculty = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.String(20), nullable=False)
    num_students = db.Column(db.Integer, nullable=False)
    duration = db.Column(db.Integer, nullable=False)  # <-- Add this: duration in minutes or hours
    # lecturer = db.Column(db.String(100), nullable=False)  # <-- Remove this line


class Instructor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    faculty = db.Column(db.String(128), nullable=False)
    department = db.Column(db.String(128), nullable=False)
    courses = db.Column(db.Text, nullable=True)  # comma-separated string


class Room(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), unique=True, nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    type = db.Column(db.String(20), nullable=False)  # Lecture, Lab, Hall, etc.
    faculty = db.Column(db.String(100), nullable=False)


class Timetable(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    session = db.Column(db.String(50), nullable=True)  # <-- Add this
    semester = db.Column(db.String(20), nullable=False)
    faculty = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    schedule_data = db.Column(db.Text, nullable=False)  # JSON string with nested levels
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Faculty(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)


class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    faculty_id = db.Column(db.Integer, db.ForeignKey('faculty.id'), nullable=False)
    faculty = db.relationship('Faculty', backref=db.backref('departments', lazy=True))

