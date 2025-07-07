import { useState, useEffect } from "react";

// Dummy API endpoints for demonstration
const API_BASE = process.env.REACT_APP_API_BASE || "";

export function useFaculties() {
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/faculties`)
      .then(res => res.json())
      .then(setFaculties)
      .catch(() => setFaculties([]))
      .finally(() => setLoading(false));
  }, []);
  return { faculties, loading };
}

export function useDepartments(faculty) {
  const [departments, setDepartments] = useState([]);
  useEffect(() => {
    if (!faculty) return setDepartments([]);
    fetch(`${API_BASE}/api/departments?faculty=${encodeURIComponent(faculty)}`)
      .then(res => res.json())
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, [faculty]);
  return { departments };
}

export function useCourses(faculty, semester) {
  const [courses, setCourses] = useState([]);
  useEffect(() => {
    if (!faculty || !semester) return setCourses([]);
    fetch(`${API_BASE}/api/courses?faculty=${encodeURIComponent(faculty)}&semester=${encodeURIComponent(semester)}`)
      .then(res => res.json())
      .then(setCourses)
      .catch(() => setCourses([]));
  }, [faculty, semester]);
  return { courses };
}

export function useTimetable(faculty, semester, session) {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!faculty || !semester || !session) {
      setTimetable(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`${API_BASE}/api/timetable?faculty=${encodeURIComponent(faculty)}&semester=${encodeURIComponent(semester)}&session=${encodeURIComponent(session)}`)
      .then(res => res.json())
      .then(setTimetable)
      .catch(() => setError("Failed to fetch timetable"))
      .finally(() => setLoading(false));
  }, [faculty, semester, session]);
  return { timetable, loading, error };
}