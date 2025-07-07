import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE;

const toSentenceCase = (str) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    code: '',
    name: '',
    credit_hours: '',
    level: '',
    faculty: '',
    department: '',
    semester: '',
    num_students: '',
    duration: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);

  // Fetch faculties on mount
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/api/faculties`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch faculties'))
      .then(setFaculties)
      .catch(() => setFaculties([]));
  }, []);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (!API_BASE) return;
    const selectedFaculty = faculties.find(f => f.name === form.faculty);
    const facultyId = selectedFaculty ? selectedFaculty.id : null;

    if (facultyId) {
      fetch(`${API_BASE}/api/departments?faculty_id=${facultyId}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch departments'))
        .then(setDepartments)
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
  }, [form.faculty, faculties]);

  // Fetch courses from backend
  useEffect(() => {
    if (!API_BASE) return;
    const fetchCourses = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE}/api/courses`);
        if (!res.ok) throw new Error('Failed to fetch courses');
        const data = await res.json();
        setCourses(data);
      } catch (err) {
        setError(err.message || 'An error occurred while fetching courses.');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'credit_hours' && Number(value) < 0) return;
    if (name === 'code') value = value.toUpperCase();
    if (name === 'name') value = toSentenceCase(value);

    // Reset department when faculty changes
    if (name === 'faculty') setForm((prev) => ({ ...prev, department: '' }));

    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (
      !form.code ||
      !form.name ||
      !form.credit_hours ||
      !form.level ||
      !form.department ||
      !form.faculty ||
      !form.semester ||
      !form.num_students ||
      !form.duration
    ) {
      setError('⚠️ All fields are required.');
      return;
    }
    // Check for duplicate code (only for new course)
    if (!editingCourse && courses.some((c) => c.code === form.code)) {
      setError('⚠️ Course with this code already exists.');
      return;
    }
    setLoading(true);
    try {
      let url = `${API_BASE}/api/courses`;
      let method = editingCourse ? 'PUT' : 'POST';
      let endpoint = editingCourse ? `${url}/${editingCourse.id}` : url;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        let errorMsg = 'Failed to save course.';
        try {
          const data = await res.json();
          errorMsg = data.message || data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      const savedCourse = await res.json();
      if (editingCourse) {
        setCourses(courses.map(c => c.id === editingCourse.id ? savedCourse : c));
      } else {
        setCourses([...courses, savedCourse]);
      }
      setForm({
        code: '',
        name: '',
        credit_hours: '',
        level: '',
        faculty: '',
        department: '',
        semester: '',
        num_students: '',
        duration: ''
      });
      setEditingCourse(null);
    } catch (err) {
      setError(err.message || 'An error occurred while saving course.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index) => {
    setError('');
    const course = courses[index];
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses/${course.id}`, { method: 'DELETE' });
      if (!res.ok) {
        let errorMsg = 'Failed to delete course.';
        try {
          const data = await res.json();
          errorMsg = data.message || data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      setCourses(courses.filter((_, i) => i !== index));
    } catch (err) {
      setError(err.message || 'An error occurred while deleting course.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    setEditingCourse(courses[index]);
    setForm({
      ...courses[index],
      credit_hours: Number(courses[index].credit_hours)
    });
  };

  const filteredCourses = courses.filter((course) =>
    course.code.toLowerCase().includes(search.toLowerCase()) ||
    course.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!API_BASE) {
    return <div className="text-red-600 p-4">❌ API_BASE not set in .env</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">📘 Manage Courses</h1>

      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          {editingCourse ? '✏️ Edit Course' : '➕ Add Course'}
        </h2>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select
            name="faculty"
            value={form.faculty}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            required
          >
            <option value="">-- Select Faculty --</option>
            {faculties.map((f) =>
              typeof f === 'string'
                ? <option key={f} value={f}>{f}</option>
                : <option key={f.id} value={f.name}>{f.name}</option>
            )}
          </select>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            disabled={!form.faculty}
            required
          >
            <option value="">-- Select Department --</option>
            {departments.map((d) =>
              typeof d === 'string'
                ? <option key={d} value={d}>{d}</option>
                : <option key={d.id} value={d.name}>{d.name}</option>
            )}
          </select>
          <input
            type="text"
            name="code"
            value={form.code}
            onChange={handleChange}
            placeholder="Course Code"
            className="border px-4 py-3 rounded"
            required
            disabled={!!editingCourse}
          />
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Course Name"
            className="border px-4 py-3 rounded"
            required
          />
          <input
            type="number"
            name="credit_hours"
            value={form.credit_hours}
            onChange={handleChange}
            placeholder="Credit Hours"
            className="border px-4 py-3 rounded"
            min="0"
            step="1"
            required
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <input
            type="number"
            name="num_students"
            value={form.num_students}
            onChange={handleChange}
            placeholder="Number of Students"
            className="border px-4 py-3 rounded"
            min="1"
            step="1"
            required
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <input
            type="number"
            name="duration"
            value={form.duration}
            onChange={handleChange}
            placeholder="Duration (minutes)"
            className="border px-4 py-3 rounded"
            min="1"
            step="1"
            required
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <select
            name="semester"
            value={form.semester}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            required
          >
            <option value="">-- Select Semester --</option>
            <option value="First">First</option>
            <option value="Second">Second</option>
          </select>
          <select
            name="level"
            value={form.level}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            required
          >
            <option value="">-- Select Level --</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="400">400</option>
            <option value="500">500</option>
          </select>
          <div className="col-span-full text-right">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (editingCourse ? 'Updating...' : 'Saving...') : (editingCourse ? 'Update Course' : 'Save Course')}
            </button>
            {editingCourse && (
              <button
                type="button"
                className="ml-4 bg-gray-400 text-white px-8 py-3 rounded hover:bg-gray-500"
                onClick={() => {
                  setEditingCourse(null);
                  setForm({
                    code: '',
                    name: '',
                    credit_hours: '',
                    level: '',
                    faculty: '',
                    department: '',
                    semester: '',
                    num_students: '',
                    duration: ''
                  });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">📋 Course List</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-4 py-2 rounded"
          />
        </div>

        {loading ? (
          <p className="text-gray-500 italic">Loading...</p>
        ) : filteredCourses.length === 0 ? (
          <p className="text-gray-500 italic">No matching courses found.</p>
        ) : (
          <table className="min-w-[1000px] text-left border">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">Code</th>
                <th className="px-4 py-3 text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-sm font-semibold">Credit</th>
                <th className="px-4 py-3 text-sm font-semibold">Level</th>
                <th className="px-4 py-3 text-sm font-semibold">Faculty</th>
                <th className="px-4 py-3 text-sm font-semibold">Dept</th>
                <th className="px-4 py-3 text-sm font-semibold">Duration (mins)</th>
                <th className="px-4 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course, index) => (
                <tr key={course.id || index} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{course.code}</td>
                  <td className="px-4 py-3">{course.name}</td>
                  <td className="px-4 py-3">{course.credit_hours}</td>
                  <td className="px-4 py-3">{course.level}</td>
                  <td className="px-4 py-3">{course.faculty}</td>
                  <td className="px-4 py-3">{course.department}</td>
                  <td className="px-4 py-3">{course.duration}</td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={() => handleEdit(index)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:underline text-sm"
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Courses;