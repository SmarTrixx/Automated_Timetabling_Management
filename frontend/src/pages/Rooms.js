import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE;

const toSentenceCase = (str) =>
  str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const Rooms = () => {
  // Always call hooks first!
  const [rooms, setRooms] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    name: '',
    capacity: '',
    type: '',
    faculty: ''
  });
  const [facultyInput, setFacultyInput] = useState('');
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [showFacultyTable, setShowFacultyTable] = useState(false);

  const [departmentInput, setDepartmentInput] = useState('');
  const [departmentFaculty, setDepartmentFaculty] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [showDepartmentTable, setShowDepartmentTable] = useState(false);

  const [error, setError] = useState('');

  // Fetch faculties, departments, and rooms on mount
  useEffect(() => {
    if (!API_BASE) return;
    fetch(`${API_BASE}/api/faculties`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch faculties'))
      .then(setFaculties)
      .catch(err => setError(err.toString()));

    fetch(`${API_BASE}/api/departments`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch departments'))
      .then(setDepartments)
      .catch(err => setError(err.toString()));

    fetch(`${API_BASE}/api/rooms`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch rooms'))
      .then(setRooms)
      .catch(err => setError(err.toString()));
  }, []);

  // Faculty CRUD
  const handleAddFaculty = async (e) => {
    e.preventDefault();
    setError('');
    const value = toSentenceCase(facultyInput.trim());
    if (!value) return;
    try {
      let url = `${API_BASE}/api/faculties`;
      let method = editingFaculty ? 'PUT' : 'POST';
      let endpoint = editingFaculty ? `${url}/${editingFaculty.id}` : url;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save faculty.');
        return;
      }
      if (editingFaculty) {
        setFaculties(faculties.map(f => f.id === editingFaculty.id ? data : f));
      } else {
        setFaculties([...faculties, data]);
      }
      setFacultyInput('');
      setEditingFaculty(null);
    } catch (err) {
      setError('Network or server error: ' + err.message);
    }
  };

  const handleEditFaculty = (faculty) => {
    setFacultyInput(faculty.name);
    setEditingFaculty(faculty);
  };

  const handleDeleteFaculty = async (facultyId) => {
    if (!window.confirm('Delete this faculty?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/faculties/${facultyId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete faculty.');
      setFaculties(faculties.filter(f => f.id !== facultyId));
      setDepartments(departments.filter(d => d.faculty_id !== facultyId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Department CRUD
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setError('');
    if (!departmentInput || !departmentFaculty) return;
    const facultyObj = faculties.find(f => f.name === departmentFaculty);
    if (!facultyObj) {
      setError('Faculty not found.');
      return;
    }
    try {
      let url = `${API_BASE}/api/departments`;
      let method = editingDepartment ? 'PUT' : 'POST';
      let endpoint = editingDepartment ? `${url}/${editingDepartment.id}` : url;
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: departmentInput, faculty_id: facultyObj.id })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save department.');
        return;
      }
      if (editingDepartment) {
        setDepartments(departments.map(d => d.id === editingDepartment.id ? data : d));
      } else {
        setDepartments([...departments, data]);
      }
      setDepartmentInput('');
      setEditingDepartment(null);
    } catch (err) {
      setError('Network or server error: ' + err.message);
    }
  };

  const handleEditDepartment = (department) => {
    setDepartmentInput(department.name);
    setDepartmentFaculty(faculties.find(f => f.id === department.faculty_id)?.name || '');
    setEditingDepartment(department);
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Delete this department?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/departments/${departmentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete department.');
      setDepartments(departments.filter(d => d.id !== departmentId));
    } catch (err) {
      setError(err.message);
    }
  };

  // Room CRUD
  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'name' || name === 'type') value = toSentenceCase(value);
    if (name === 'capacity') value = value.replace(/[^0-9]/g, '');
    setForm({ ...form, [name]: value });

    if (name === 'faculty') {
      setForm((prev) => ({ ...prev, department: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { name, capacity, type, faculty } = form;
    if (!name || !capacity || !type || !faculty) {
      setError('All fields are required.');
      return;
    }

    // Check for duplicate
    if (
      rooms.some(
        room =>
          room.name === name &&
          room.type === type &&
          room.faculty === faculty
      )
    ) {
      setError('⚠️ This room already exists.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: parseInt(capacity, 10) })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add room.');
        return;
      }
      setRooms([...rooms, data]);
      setForm({ name: '', capacity: '', type: '', faculty: '' });
    } catch (err) {
      setError('Network or server error: ' + err.message);
    }
  };

  const handleDelete = async (index) => {
    if (!window.confirm('Delete this room?')) return;
    const room = rooms[index];
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${room.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete room.');
      setRooms(rooms.filter((_, i) => i !== index));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (index) => {
    if (window.confirm('Edit this room?')) {
      setForm(rooms[index]);
      handleDelete(index);
      // To implement true editing, call handleUpdateRoom after user edits form and submits
    }
  };

  const filteredRooms = rooms.filter((room) =>
    [room.name, room.type, room.capacity?.toString(), room.faculty]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // Now do the check AFTER all hooks
  if (!API_BASE) {
    return <div className="text-red-600 p-4">❌ API_BASE not set in .env</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">🏫 Manage Rooms</h1>

      {/* Faculties */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold mb-4">🏛️ Faculties</h2>
        <form onSubmit={handleAddFaculty} className="flex gap-4 mb-2">
          <input
            type="text"
            value={facultyInput}
            onChange={(e) => setFacultyInput(e.target.value)}
            placeholder="Add Faculty"
            className="border px-4 py-2 rounded"
            required
          />
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">
            {editingFaculty ? 'Update Faculty' : 'Add Faculty'}
          </button>
          <button
            type="button"
            onClick={() => setShowFacultyTable(!showFacultyTable)}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {showFacultyTable ? 'Hide Faculties' : 'View Faculties'}
          </button>
        </form>
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}
        {showFacultyTable && (
          <table className="min-w-full border mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {faculties.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-2">{f.name}</td>
                  <td className="px-4 py-2">
                    <button
                      className="text-blue-600 mr-2"
                      onClick={() => handleEditFaculty(f)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() => handleDeleteFaculty(f.id)}
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

      {/* Departments */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold mb-4">🏬 Departments</h2>
        <form onSubmit={handleAddDepartment} className="flex gap-4 mb-2 flex-wrap">
          <select
            value={departmentFaculty}
            onChange={(e) => setDepartmentFaculty(e.target.value)}
            className="border px-4 py-2 rounded"
            required
          >
            <option value="">Select Faculty</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.name}>
                {f.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={departmentInput}
            onChange={(e) => setDepartmentInput(e.target.value)}
            placeholder="Add Department"
            className="border px-4 py-2 rounded"
            required
          />
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded">
            {editingDepartment ? 'Update Department' : 'Add Department'}
          </button>
          <button
            type="button"
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => setShowDepartmentTable(!showDepartmentTable)}
          >
            {showDepartmentTable ? 'Hide Departments' : 'View Departments'}
          </button>
        </form>
        {showDepartmentTable && (
          <table className="min-w-full border mt-4">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Faculty</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2">{faculties.find(f => f.id === d.faculty_id)?.name || ''}</td>
                  <td className="px-4 py-2">
                    <button
                      className="text-blue-600 mr-2"
                      onClick={() => handleEditDepartment(d)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600"
                      onClick={() => handleDeleteDepartment(d.id)}
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

      {/* Room Form */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-2xl font-semibold mb-6">➕ Add Room</h2>
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
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Room Name"
            className="border px-4 py-3 rounded"
            required
          />
          <input
            type="text"
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
            placeholder="Capacity"
            className="border px-4 py-3 rounded"
            required
          />
          <input
            type="text"
            name="type"
            value={form.type}
            onChange={handleChange}
            placeholder="Type (Lecture, Lab, etc.)"
            className="border px-4 py-3 rounded"
            required
          />
          <button type="submit" className="bg-blue-600 text-white px-8 py-3 rounded">
            Save Room
          </button>
        </form>
      </section>

      {/* Room List */}
      <section className="bg-white shadow-xl rounded-2xl p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-2xl font-semibold">🏢 Room List</h2>
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-4 py-2 rounded"
          />
        </div>
        <table className="min-w-full border text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Capacity</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Faculty</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room, index) => (
              <tr key={room.id || index}>
                <td className="px-4 py-2">{room.name}</td>
                <td className="px-4 py-2">{room.capacity}</td>
                <td className="px-4 py-2">{room.type}</td>
                <td className="px-4 py-2">{room.faculty}</td>
                <td className="px-4 py-2">
                  <button
                    className="text-blue-600 mr-2"
                    onClick={() => handleEdit(index)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600"
                    onClick={() => handleDelete(index)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};

export default Rooms;