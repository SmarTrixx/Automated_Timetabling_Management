import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE;

const toSentenceCase = (str) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Instructors = () => {
  const [instructors, setInstructors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    faculty: '',
    department: '',
    courses: []
  });
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState('');

  // Fetch faculties, departments, instructors, and courses on mount
  useEffect(() => {
    if (!API_BASE) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [facRes, depRes, instRes, courseRes] = await Promise.all([
          fetch(`${API_BASE}/api/faculties`),
          fetch(`${API_BASE}/api/departments`),
          fetch(`${API_BASE}/api/instructors`),
          fetch(`${API_BASE}/api/courses`)
        ]);
        if (!facRes.ok) throw new Error('Failed to fetch faculties');
        if (!depRes.ok) throw new Error('Failed to fetch departments');
        if (!instRes.ok) throw new Error('Failed to fetch instructors');
        if (!courseRes.ok) throw new Error('Failed to fetch courses');
        setFaculties(await facRes.json());
        setDepartments(await depRes.json());
        setInstructors(await instRes.json());
        setCourses(await courseRes.json());
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter departments for selected faculty (by faculty id)
  const selectedFaculty = faculties.find(f => f.name === form.faculty);
  const filteredDepartments = selectedFaculty
    ? departments.filter((d) => d.faculty_id === selectedFaculty.id)
    : [];

  // Filter courses for selected faculty
  const filteredCourses = form.faculty
    ? courses.filter(c => c.faculty === form.faculty)
    : [];

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name') value = toSentenceCase(value);
    if (name === 'faculty') {
      setForm((prev) => ({ ...prev, faculty: value, department: '' }));
      return;
    }
    if (name === 'department') value = toSentenceCase(value);
    setForm({ ...form, [name]: value });
  };

  // Add course to the list
  const handleAddCourse = () => {
    if (
      selectedCourse &&
      !form.courses.includes(selectedCourse) &&
      !assignedCourseCodes.has(selectedCourse)
    ) {
      setForm((prev) => ({
        ...prev,
        courses: [...prev.courses, selectedCourse]
      }));
      setSelectedCourse('');
      setShowCourseDropdown(false);
    }
  };

  // Remove course from the list
  const handleRemoveCourse = (courseCode) => {
    setForm((prev) => ({
      ...prev,
      courses: prev.courses.filter(c => c !== courseCode)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.faculty || !form.department || form.courses.length === 0) {
      setError('All fields are required.');
      return;
    }

    // Check for duplicate (skip if editing)
    if (!editingInstructor) {
      const isDuplicate = instructors.some(
        (inst) =>
          inst.name === form.name &&
          inst.faculty === form.faculty &&
          inst.department === form.department &&
          JSON.stringify((inst.courses || []).sort()) === JSON.stringify(form.courses.slice().sort())
      );
      if (isDuplicate) {
        setError('⚠️ This instructor already exists.');
        return;
      }
    }

    setLoading(true);
    try {
      let url = `${API_BASE}/api/instructors`;
      let method = editingInstructor ? 'PUT' : 'POST';
      let endpoint = editingInstructor ? `${url}/${editingInstructor.id}` : url;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          faculty: form.faculty,
          department: form.department,
          courses: form.courses
        })
      });
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let errorMsg = 'Failed to save instructor.';
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          errorMsg = data.message || data.error || errorMsg;
        } else {
          errorMsg = 'Server error: ' + res.status;
        }
        throw new Error(errorMsg);
      }
      const savedInstructor = await res.json();
      if (editingInstructor) {
        setInstructors(instructors.map(i => i.id === editingInstructor.id ? savedInstructor : i));
      } else {
        setInstructors([...instructors, savedInstructor]);
      }
      setForm({ name: '', faculty: '', department: '', courses: [] });
      setEditingInstructor(null);
    } catch (err) {
      setError(err.message || 'An error occurred while saving instructor.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Delete this instructor?')) return;
    setError('');
    setLoading(true);
    try {
      const inst = instructors[index];
      const res = await fetch(`${API_BASE}/api/instructors/${inst.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete instructor.');
      setInstructors(instructors.filter((_, i) => i !== index));
      if (selectedInstructor && selectedInstructor.id === inst.id) setSelectedInstructor(null);
    } catch (err) {
      setError(err.message || 'An error occurred while deleting instructor.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    const inst = instructors[index];
    setEditingInstructor(inst);
    setForm({
      name: inst.name,
      faculty: inst.faculty,
      department: inst.department,
      courses: Array.isArray(inst.courses) ? inst.courses : []
    });
  };

  const handleCancelEdit = () => {
    setEditingInstructor(null);
    setForm({ name: '', faculty: '', department: '', courses: [] });
  };

  const filteredInstructors = instructors.filter((inst) =>
    [
      inst.name,
      inst.faculty,
      inst.department,
      ...(inst.courses || [])
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Get all assigned course codes except for the current instructor (when editing)
  const assignedCourseCodes = new Set(
    instructors
      .filter(inst => !editingInstructor || inst.id !== editingInstructor.id)
      .flatMap(inst => inst.courses || [])
  );

  if (!API_BASE) {
    return <div className="text-red-600 p-4">❌ API_BASE not set in .env</div>;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">👨‍🏫 Manage Instructors</h1>

      {error && (
        <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
      )}
      {loading && (
        <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded mb-4">Loading...</div>
      )}

      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold text-gray-700 mb-6">
          {editingInstructor ? '✏️ Edit Instructor' : '➕ Add Instructor'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select
            name="faculty"
            value={form.faculty}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            required
          >
            <option value="">Select Faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            className="border px-4 py-3 rounded"
            required
            disabled={!form.faculty}
          >
            <option value="">Select Department</option>
            {filteredDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Instructor Name"
            className="border px-4 py-3 rounded"
            required
          />
          {/* Course selection logic */}
          <div className="col-span-full">
            <label className="block mb-2 font-semibold">Courses</label>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {form.courses.map((c) => (
                <span
                  key={c}
                  className="bg-gray-200 px-3 py-1 rounded-full flex items-center"
                >
                  {c}
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-800"
                    onClick={() => handleRemoveCourse(c)}
                  >
                    &times;
                  </button>
                </span>
              ))}
              {!showCourseDropdown && (
                <button
                  type="button"
                  className="bg-blue-500 text-white px-4 py-1 rounded"
                  onClick={() => setShowCourseDropdown(true)}
                >
                  {form.courses.length === 0 ? 'Add Course' : 'Add More'}
                </button>
              )}
            </div>
            {showCourseDropdown && (
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedCourse}
                  onChange={e => setSelectedCourse(e.target.value)}
                  className="border px-4 py-2 rounded"
                >
                  <option value="">Select Course</option>
                  {filteredCourses
                    .filter(
                      c =>
                        !form.courses.includes(c.code) && // not already selected in this form
                        !assignedCourseCodes.has(c.code)  // not already assigned to another instructor
                    )
                    .map(c => (
                      <option key={c.id} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  className="bg-green-600 text-white px-4 py-2 rounded"
                  onClick={handleAddCourse}
                  disabled={!selectedCourse}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => {
                    setShowCourseDropdown(false);
                    setSelectedCourse('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
            {form.faculty && filteredCourses.filter(
              c =>
                !form.courses.includes(c.code) &&
                !assignedCourseCodes.has(c.code)
            ).length === 0 && (
              <div className="text-sm text-red-600 mt-2">
                All courses for this faculty have been assigned to instructors.
              </div>
            )}
          </div>
          <div className="col-span-full text-right">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-3 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading
                ? (editingInstructor ? 'Updating...' : 'Saving...')
                : (editingInstructor ? 'Update Instructor' : 'Save Instructor')}
            </button>
            {editingInstructor && (
              <button
                type="button"
                className="ml-4 bg-gray-400 text-white px-8 py-3 rounded hover:bg-gray-500"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-700">📋 Instructor List</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-4 py-2 rounded"
          />
        </div>

        {filteredInstructors.length === 0 ? (
          <p className="text-gray-500 italic">No matching instructors found.</p>
        ) : (
          <table className="min-w-full text-left border">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-sm font-semibold">Faculty</th>
                <th className="px-4 py-3 text-sm font-semibold">Department</th>
                <th className="px-4 py-3 text-sm font-semibold">Courses</th>
                <th className="px-4 py-3 text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInstructors.map((inst, index) => (
                <tr
                  key={inst.id || index}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedInstructor(inst)}
                >
                  <td className="px-4 py-3">{inst.name}</td>
                  <td className="px-4 py-3">{inst.faculty}</td>
                  <td className="px-4 py-3">{inst.department}</td>
                  <td className="px-4 py-3">{(inst.courses || []).join(', ')}</td>
                  <td className="px-4 py-3 space-x-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(index);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(index);
                      }}
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

      {selectedInstructor && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h3 className="text-xl font-bold mb-4 text-gray-800">👤 Instructor Details</h3>
          <div className="grid gap-3 text-gray-700">
            <p><strong>Name:</strong> {selectedInstructor.name}</p>
            <p><strong>Faculty:</strong> {selectedInstructor.faculty}</p>
            <p><strong>Department:</strong> {selectedInstructor.department}</p>
            <p>
              <strong>Courses:</strong>
              <ul className="list-disc list-inside mt-1">
                {(selectedInstructor.courses || []).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </p>
          </div>
        </section>
      )}
    </div>
  );
};

export default Instructors;
