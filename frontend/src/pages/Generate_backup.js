import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const API_BASE = process.env.REACT_APP_API_BASE;
const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const breakOptions = ['10:00', '11:00', '12:00', '13:00', '14:00'];

const Generate = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [showDays, setShowDays] = useState(false);
  const [availableDays, setAvailableDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [timetable, setTimetable] = useState(null);
  const [error, setError] = useState(null);

  // Manual editing state
  const [manualEdits, setManualEdits] = useState({});

  // New state for time frame and break
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [enableBreak, setEnableBreak] = useState(false);
  const [breakTime, setBreakTime] = useState('');

  const semesters = ['First', 'Second'];

  // View toggles
  const [viewMode, setViewMode] = useState('table'); // 'table', 'calendar', 'both'
  const [fullView, setFullView] = useState(false); // faculty-wide

  // Move state
  const [moveSource, setMoveSource] = useState(null); // { level, day, time }

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
    if (!API_BASE || !selectedFaculty) {
      setDepartments([]);
      return;
    }
    const facultyObj = faculties.find(f => f.name === selectedFaculty);
    const facultyId = facultyObj ? facultyObj.id : null;
    if (facultyId) {
      fetch(`${API_BASE}/api/departments?faculty_id=${facultyId}`)
        .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch departments'))
        .then(setDepartments)
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
  }, [selectedFaculty, faculties]);

  // Fetch courses for selected faculty and semester
  useEffect(() => {
    if (!API_BASE || !selectedFaculty || !selectedSemester) {
      setCourses([]);
      return;
    }
    fetch(`${API_BASE}/api/courses`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch courses'))
      .then(data => {
        setCourses(data.filter(
          c => c.faculty === selectedFaculty && c.semester === selectedSemester
        ));
      })
      .catch(() => setCourses([]));
  }, [selectedFaculty, selectedSemester]);

  // Fetch rooms for selected faculty
  useEffect(() => {
    if (!API_BASE || !selectedFaculty) {
      setRooms([]);
      return;
    }
    fetch(`${API_BASE}/api/rooms`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch rooms'))
      .then(data => {
        setRooms(data.filter(r => r.faculty === selectedFaculty));
      })
      .catch(() => setRooms([]));
  }, [selectedFaculty]);

  // Fetch instructors for selected faculty
  useEffect(() => {
    if (!API_BASE || !selectedFaculty) {
      setInstructors([]);
      return;
    }
    fetch(`${API_BASE}/api/instructors`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch instructors'))
      .then(data => {
        setInstructors(data.filter(i => i.faculty === selectedFaculty));
      })
      .catch(() => setInstructors([]));
  }, [selectedFaculty]);

  const handleDayToggle = (day) => {
    setAvailableDays((prev) =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleGenerate = async () => {
    if (!selectedFaculty || !selectedSemester || !selectedSession) {
      alert('⚠️ Please select faculty, semester, and session.');
      return;
    }
    setLoading(true);
    setError(null);
    setTimetable(null);
    setManualEdits({});

    try {
      // By default, all instructors are available all days
      let instructorsWithAvailability = instructors.map(inst => ({
        ...inst,
        available_days: weekDays
      }));

      // If user selected an instructor and set availableDays, override only for that instructor
      if (selectedInstructor && availableDays.length > 0) {
        instructorsWithAvailability = instructors.map(inst =>
          inst.name === selectedInstructor
            ? { ...inst, available_days: availableDays }
            : { ...inst, available_days: weekDays }
        );
      }

      const payload = {
        faculty: selectedFaculty,
        semester: selectedSemester,
        session: selectedSession,
        courses,
        rooms,
        instructors: instructorsWithAvailability,
        time_frame: { start: startTime, end: endTime },
        break: enableBreak ? breakTime : null
      };

      const response = await axios.post(`${API_BASE}/api/generate`, payload);

      setTimetable(response.data);
    } catch (err) {
      console.error(err);
      setError('❌ Failed to generate timetable. Check backend or CORS settings.');
    } finally {
      setLoading(false);
    }
  };

  // Save timetable to backend
  const handleSaveTimetable = async () => {
    if (!timetable) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/timetables`, {
        faculty: selectedFaculty,
        semester: selectedSemester,
        session: selectedSession,
        schedule: getCurrentSchedule()
      });
      if (res.status === 201) {
        alert('✅ Timetable saved successfully!');
      } else {
        setError('Failed to save timetable.');
      }
    } catch (err) {
      setError('Failed to save timetable: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Conflict checker
  const checkConflicts = (entries) => {
    const conflicts = [];
    const seen = {};
    entries.forEach(e => {
      const key = `${e.day}-${e.time}`;
      if (!seen[key]) seen[key] = { rooms: new Set(), instructors: new Set() };
      if (seen[key].rooms.has(e.room)) {
        conflicts.push(`Room ${e.room} double-booked at ${e.day} ${e.time}`);
      }
      if (seen[key].instructors.has(e.instructor)) {
        conflicts.push(`Instructor ${e.instructor} double-booked at ${e.day} ${e.time}`);
      }
      seen[key].rooms.add(e.room);
      seen[key].instructors.add(e.instructor);
    });
    return conflicts;
  };

  // For manual editing
  const getCurrentSchedule = () => {
    if (!timetable || !timetable.schedule) return {};
    // Merge manualEdits into timetable.schedule
    const merged = {};
    Object.entries(timetable.schedule).forEach(([level, entries]) => {
      merged[level] = manualEdits[level] || entries;
    });
    return merged;
  };

  // View helpers
  const filteredCourses = courses;
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const sortEntries = (entries) => {
    return entries.slice().sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });
  };

  // For fullView, flatten all entries
  const currentSchedule = getCurrentSchedule();
  const allEntries = fullView
    ? Object.values(currentSchedule).flat()
    : null;

  // For calendar view
  // Build all unique time slots
  const allTimeSlots = timetable && timetable.schedule
    ? Array.from(
        new Set(
          (fullView
            ? Object.values(currentSchedule).flat()
            : Object.values(currentSchedule).flat()
          ).map(e => e.time)
        )
      ).sort()
    : [];

  const getCellEntry = (entries, day, time) =>
    entries.find(e => e.day === day && e.time === time);

  // For conflict highlighting in calendar view
  const getConflictedCells = (entries) => {
    const conflicts = [];
    const seen = {};
    entries.forEach(e => {
      const key = `${e.day}-${e.time}`;
      if (!seen[key]) seen[key] = { rooms: new Set(), instructors: new Set() };
      if (seen[key].rooms.has(e.room)) {
        conflicts.push(`${e.day}-${e.time}-room-${e.room}`);
      }
      if (seen[key].instructors.has(e.instructor)) {
        conflicts.push(`${e.day}-${e.time}-instructor-${e.instructor}`);
      }
      seen[key].rooms.add(e.room);
      seen[key].instructors.add(e.instructor);
    });
    return conflicts;
  };

  // Export PDF based on current view and faculty name
  const handleExportPDF = () => {
    if (!timetable || !timetable.schedule) return;
    const doc = new jsPDF();
    if (viewMode === 'calendar' || viewMode === 'both') {
      if (fullView) {
        doc.text(`${selectedFaculty} Faculty Calendar`, 10, 10);
        autoTable(doc, {
          startY: 20,
          head: [['Day', ...allTimeSlots]],
          body: dayOrder.map(day => [
            day,
            ...allTimeSlots.map(time => {
              const entry = allEntries.find(e => e.day === day && e.time === time);
              return entry
                ? `${entry.course_code} (${entry.room})\n${entry.instructor}`
                : '';
            })
          ])
        });
      } else {
        Object.entries(currentSchedule).forEach(([level, entries], idx) => {
          if (idx > 0) doc.addPage();
          doc.text(`${selectedFaculty} Level ${level} Calendar`, 10, 10);
          autoTable(doc, {
            startY: 20,
            head: [['Day', ...allTimeSlots]],
            body: dayOrder.map(day => [
              day,
              ...allTimeSlots.map(time => {
                const entry = entries.find(e => e.day === day && e.time === time);
                return entry
                  ? `${entry.course_code} (${entry.room})\n${entry.instructor}`
                  : '';
              })
            ])
          });
        });
      }
    } else {
      // Table view export as before
      if (fullView) {
        doc.text(`${selectedFaculty} Faculty Timetable`, 10, 10);
        autoTable(doc, {
          startY: 20,
          head: [['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department']],
          body: (allEntries || []).map(e => [
            e.day, e.time, `${e.course_code} - ${e.course_name}`, e.instructor, e.room, e.department
          ])
        });
      } else {
        Object.entries(currentSchedule).forEach(([level, entries], idx) => {
          if (idx > 0) doc.addPage();
          doc.text(`${selectedFaculty} Level ${level} Timetable`, 10, 10);
          autoTable(doc, {
            startY: 20,
            head: [['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department']],
            body: entries.map(e => [
              e.day, e.time, `${e.course_code} - ${e.course_name}`, e.instructor, e.room, e.department
            ])
          });
        });
      }
    }
    doc.save('timetable.pdf');
  };

  // Export Excel based on current view and faculty name
  const handleExportExcel = () => {
    if (!timetable || !timetable.schedule) return;
    const wb = XLSX.utils.book_new();
    if (viewMode === 'calendar' || viewMode === 'both') {
      if (fullView) {
        const { ws, sheetName } = exportCalendarGrid(allEntries, `${selectedFaculty} Faculty Calendar`);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      } else {
        Object.entries(currentSchedule).forEach(([level, entries]) => {
          const { ws, sheetName } = exportCalendarGrid(entries, `${selectedFaculty} Level ${level} Calendar`);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });
      }
    } else {
      // Table view export as before
      if (fullView) {
        const ws = XLSX.utils.json_to_sheet(allEntries);
        XLSX.utils.book_append_sheet(wb, ws, `${selectedFaculty} Faculty`);
      } else {
        Object.entries(currentSchedule).forEach(([level, entries]) => {
          const ws = XLSX.utils.json_to_sheet(entries);
          XLSX.utils.book_append_sheet(wb, ws, `${selectedFaculty} Level ${level}`);
        });
      }
    }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'timetable.xlsx');
  };

  // Compute conflicts for current view
  const allConflicts = fullView
    ? checkConflicts(allEntries || [])
    : Object.entries(currentSchedule).flatMap(([level, entries]) => checkConflicts(entries));

  // Export calendar grid to Excel
  const exportCalendarGrid = (entries, sheetName) => {
    // Build header: ['Day', ...allTimeSlots]
    const header = ['Day', ...allTimeSlots];
    // Build rows: each row is [day, ...courses at each time]
    const rows = dayOrder.map(day => [
      day,
      ...allTimeSlots.map(time => {
        const entry = entries.find(e => e.day === day && e.time === time);
        return entry
          ? `${entry.course_code} (${entry.room})\n${entry.instructor}`
          : '';
      })
    ]);
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    return { ws, sheetName };
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">🧠 Generate Timetable</h1>

      {/* Selection Form */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">🎓 Select Faculty, Semester & Session</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <select
            className="border px-4 py-3 rounded"
            value={selectedFaculty}
            onChange={(e) => {
              setSelectedFaculty(e.target.value);
              setPreview(true);
              setSelectedSemester('');
              setTimetable(null);
              setSelectedInstructor('');
              setAvailableDays([]);
            }}
          >
            <option value="">-- Choose Faculty --</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>

          <select
            className="border px-4 py-3 rounded"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
          >
            <option value="">-- Choose Semester --</option>
            {semesters.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {/* Session input */}
        <div className="mt-6">
          <label className="block mb-2 font-semibold">Session</label>
          <input
            type="text"
            className="border px-4 py-3 rounded"
            placeholder="Enter Session (e.g. 2024/2025)"
            value={selectedSession}
            onChange={e => setSelectedSession(e.target.value)}
            required
          />
        </div>
        {/* Time frame inputs */}
        <div className="mt-6 flex gap-4 items-center">
          <label className="font-semibold">Time Frame:</label>
          <input
            type="time"
            className="border px-2 py-2 rounded"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            required
          />
          <span>to</span>
          <input
            type="time"
            className="border px-2 py-2 rounded"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
            required
          />
        </div>
        {/* Break time */}
        <div className="mt-6 flex items-center gap-4">
          <input
            type="checkbox"
            checked={enableBreak}
            onChange={e => setEnableBreak(e.target.checked)}
            id="enableBreak"
          />
          <label htmlFor="enableBreak" className="font-semibold">Enable 1hr Break</label>
          <select
            className="border px-4 py-2 rounded"
            value={breakTime}
            onChange={e => setBreakTime(e.target.value)}
            disabled={!enableBreak}
          >
            <option value="">-- Select Break Time --</option>
            {breakOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        {/* Instructor selection */}
        {selectedFaculty && (
          <div className="mt-6">
            <label className="block mb-2 font-semibold">Select Instructor</label>
            <select
              className="border px-4 py-3 rounded"
              value={selectedInstructor}
              onChange={e => {
                setSelectedInstructor(e.target.value);
                setAvailableDays([]);
              }}
            >
              <option value="">-- Choose Instructor --</option>
              {instructors.map(i => (
                <option key={i.id} value={i.name}>{i.name}</option>
              ))}
            </select>
          </div>
        )}
        {/* Add available days */}
        {selectedInstructor && (
          <div className="mt-4">
            {!showDays ? (
              <button
                type="button"
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={() => setShowDays(true)}
              >
                Add Available Days
              </button>
            ) : (
              <div className="flex flex-wrap gap-4 items-center">
                {weekDays.map(day => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={availableDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    {day}
                  </label>
                ))}
                <button
                  type="button"
                  className="ml-4 bg-gray-400 text-white px-4 py-2 rounded"
                  onClick={() => setShowDays(false)}
                >
                  Done
                </button>
              </div>
            )}
            {showDays && availableDays.length === 0 && (
              <div className="text-sm text-red-600 mt-2">
                Please select at least one available day.
              </div>
            )}
            {!showDays && availableDays.length > 0 && (
              <div className="mt-2 text-sm text-green-700">
                Available: {availableDays.join(', ')}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Faculty Info Preview */}
      {preview && selectedFaculty && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">
            📚 Departments in {selectedFaculty}
          </h3>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            {departments.length === 0 ? (
              <li>No departments found.</li>
            ) : (
              departments.map((dept) => (
                <li key={dept.id}>{dept.name}</li>
              ))
            )}
          </ul>
          <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
            📖 Courses in {selectedFaculty}
            <span className="ml-2 text-sm text-gray-500">(for selected semester only)</span>
          </h3>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            {filteredCourses.length === 0 ? (
              <li>No courses found.</li>
            ) : (
              filteredCourses.map((course) => (
                <li key={course.id}>
                  <span className="font-semibold">{course.code}</span>: {course.name} ({course.level} level, {course.credit_hours} credits, {course.duration} mins, {course.num_students} students)
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {/* Generate Button */}
      <div className="text-right">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white font-medium px-6 py-3 rounded shadow hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
          {loading ? 'Generating...' : 'Generate Timetable'}
        </button>
      </div>

      {/* Error */}
      {error && <p className="mt-4 text-red-600">{error}</p>}

      {/* Conflict Notifications */}
      {timetable && timetable.conflicts && timetable.conflicts.length > 0 && (
        <div className="mt-4 text-red-700 bg-red-100 p-3 rounded">
          <strong>Conflicts Detected:</strong>
          <ul className="list-disc pl-5">
            {timetable.conflicts.map((conf, idx) => (
              <li key={idx}>{conf}</li>
            ))}
          </ul>
        </div>
      )}

      {/* View toggles */}
      {timetable && timetable.schedule && (
        <div className="flex gap-6 mt-8 items-center">
          <div>
            <label className="mr-2 font-semibold">View:</label>
            <label>
              <input
                type="radio"
                checked={viewMode === 'table'}
                onChange={() => setViewMode('table')}
              /> Table
            </label>
            <label className="ml-4">
              <input
                type="radio"
                checked={viewMode === 'calendar'}
                onChange={() => setViewMode('calendar')}
              /> Calendar
            </label>
            <label className="ml-4">
              <input
                type="radio"
                checked={viewMode === 'both'}
                onChange={() => setViewMode('both')}
              /> Both
            </label>
          </div>
          <div>
            <label>
              <input
                type="checkbox"
                checked={fullView}
                onChange={() => setFullView(v => !v)}
              /> Show all levels together (Faculty-wide)
            </label>
          </div>
        </div>
      )}

      {/* Conflict Notifications */}
      {allConflicts.length > 0 && (
        <div className="mt-4 text-red-700 bg-red-100 p-3 rounded">
          <strong>Detected Conflicts:</strong>
          <ul className="list-disc pl-5">
            {allConflicts.map((conf, idx) => (
              <li key={idx}>{conf}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save & Export Buttons */}
      {timetable && timetable.schedule && (
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleSaveTimetable}
            className="bg-green-600 text-white font-medium px-6 py-3 rounded shadow hover:bg-green-700 transition"
            disabled={loading}
          >
            Save Timetable
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-yellow-500 text-white font-medium px-6 py-3 rounded shadow hover:bg-yellow-600 transition"
          >
            Export Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-red-500 text-white font-medium px-6 py-3 rounded shadow hover:bg-red-600 transition"
          >
            Export PDF
          </button>
        </div>
      )}

      {/* Table View */}
      {(viewMode === 'table' || viewMode === 'both') && timetable && timetable.schedule && Object.keys(currentSchedule).length > 0 && (
        fullView ? (
          <section className="mt-10 bg-white shadow-xl rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">🎓 Faculty Timetable</h3>
            <table className="min-w-full text-left border">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-sm font-semibold">Day</th>
                  <th className="px-4 py-2 text-sm font-semibold">Time</th>
                  <th className="px-4 py-2 text-sm font-semibold">Course</th>
                  <th className="px-4 py-2 text-sm font-semibold">Instructor</th>
                  <th className="px-4 py-2 text-sm font-semibold">Room</th>
                  <th className="px-4 py-2 text-sm font-semibold">Department</th>
                </tr>
              </thead>
              <tbody>
                {sortEntries(allEntries || []).map((entry, index) => (
                  <tr key={index} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">{entry.day}</td>
                    <td className="px-4 py-2">{entry.time}</td>
                    <td className="px-4 py-2">{entry.course_code} - {entry.course_name}</td>
                    <td className="px-4 py-2">{entry.instructor}</td>
                    <td className="px-4 py-2">{entry.room}</td>
                    <td className="px-4 py-2">{entry.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : (
          Object.entries(currentSchedule).map(([level, entries]) => (
            <section key={level} className="mt-10 bg-white shadow-xl rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800">🎓 Level {level} Timetable</h3>
              <table className="min-w-full text-left border">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-2 text-sm font-semibold">Day</th>
                    <th className="px-4 py-2 text-sm font-semibold">Time</th>
                    <th className="px-4 py-2 text-sm font-semibold">Course</th>
                    <th className="px-4 py-2 text-sm font-semibold">Instructor</th>
                    <th className="px-4 py-2 text-sm font-semibold">Room</th>
                    <th className="px-4 py-2 text-sm font-semibold">Department</th>
                  </tr>
                </thead>
                <tbody>
                  {sortEntries(entries).map((entry, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">{entry.day}</td>
                      <td className="px-4 py-2">{entry.time}</td>
                      <td className="px-4 py-2">{entry.course_code} - {entry.course_name}</td>
                      <td className="px-4 py-2">{entry.instructor}</td>
                      <td className="px-4 py-2">{entry.room}</td>
                      <td className="px-4 py-2">{entry.department}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )
      )}

      {/* Calendar View */}
      {(viewMode === 'calendar' || viewMode === 'both') && timetable && timetable.schedule && Object.keys(currentSchedule).length > 0 && (
        fullView ? (
          <section className="mt-10 bg-white shadow-xl rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">📅 Faculty Calendar View</h3>
            <table className="min-w-full text-center border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Day</th>
                  {allTimeSlots.map(time => (
                    <th key={time} className="border px-2 py-1">{time}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dayOrder.map(day => {
                  let skipSlots = 0;
                  return (
                    <tr key={day}>
                      <td className="border px-2 py-1 font-semibold">{day}</td>
                      {allTimeSlots.map((time, colIdx) => {
                        if (skipSlots > 0) {
                          skipSlots--;
                          return null;
                        }
                        const entry = getCellEntry(allEntries, day, time);
                        if (!entry) {
                          return (
                            <td key={time} className="border px-2 py-1"></td>
                          );
                        }
                        // Calculate span for consecutive slots
                        let span = 1;
                        let nextIdx = colIdx + 1;
                        while (
                          nextIdx < allTimeSlots.length &&
                          getCellEntry(allEntries, day, allTimeSlots[nextIdx]) &&
                          getCellEntry(allEntries, day, allTimeSlots[nextIdx]).course_code === entry.course_code &&
                          getCellEntry(allEntries, day, allTimeSlots[nextIdx]).instructor === entry.instructor &&
                          getCellEntry(allEntries, day, allTimeSlots[nextIdx]).room === entry.room
                        ) {
                          span++;
                          nextIdx++;
                        }
                        skipSlots = span - 1;
                        const cellConflict =
                          getConflictedCells(allEntries).includes(`${day}-${time}-room-${entry.room}`) ||
                          getConflictedCells(allEntries).includes(`${day}-${time}-instructor-${entry.instructor}`);
                        // No 'level' in fullView
                        const isMoveSource = false;
                        return (
                          <td
                            key={time}
                            colSpan={span}
                            className={`border px-2 py-1
                              ${cellConflict ? 'bg-red-200' : ''}
                            `}
                            title={cellConflict ? 'Conflict: double-booked room or instructor' : ''}
                          >
                            <div>{entry.course_code}</div>
                            <div className="text-xs">{entry.course_name}</div>
                            <div className="text-xs">{entry.instructor}</div>
                            <div className="text-xs">{entry.room}</div>
                            {cellConflict && (
                              <div className="text-xs text-red-600 font-bold">⚠️ Conflict</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-xs text-gray-500 mt-2">
              Red cells indicate conflicts.
            </div>
          </section>
        ) : (
          Object.entries(currentSchedule).map(([level, entries]) => {
            const conflictedCells = getConflictedCells(entries);
            return (
              <section key={level} className="mt-10 bg-white shadow-xl rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4 text-gray-800">📅 Level {level} Calendar View</h3>
                <table className="min-w-full text-center border">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Day</th>
                      {allTimeSlots.map(time => (
                        <th key={time} className="border px-2 py-1">{time}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayOrder.map(day => {
                      let skipSlots = 0;
                      return (
                        <tr key={day}>
                          <td className="border px-2 py-1 font-semibold">{day}</td>
                          {allTimeSlots.map((time, colIdx) => {
                            if (skipSlots > 0) {
                              skipSlots--;
                              return null;
                            }
                            const entry = getCellEntry(entries, day, time);
                            if (!entry) {
                              return (
                                <td
                                  key={time}
                                  className={`border px-2 py-1 ${moveSource ? 'timetable-drop-hover' : ''}`}
                                  onClick={() => {
                                    if (
                                      moveSource &&
                                      (moveSource.level !== level || moveSource.day !== day || moveSource.time !== time)
                                    ) {
                                      setManualEdits(prev => {
                                        const sourceArr = (prev[moveSource.level] || timetable.schedule[moveSource.level] || []).slice();
                                        const targetArr = (prev[level] || timetable.schedule[level] || []).slice();

                                        // Find the moved entry
                                        const movedEntry = sourceArr.find(
                                          e => e.day === moveSource.day && e.time === moveSource.time
                                        );
                                        if (!movedEntry) return prev;

                                        // Find all slots for this course block on the source day
                                        const blockSlots = sourceArr
                                          .filter(
                                            e =>
                                              e.day === moveSource.day &&
                                              e.course_code === movedEntry.course_code &&
                                              e.instructor === movedEntry.instructor &&
                                              e.room === movedEntry.room
                                          )
                                          .sort((a, b) => allTimeSlots.indexOf(a.time) - allTimeSlots.indexOf(b.time));

                                        // Remove all these slots from sourceArr (only from source day)
                                        const timesToRemove = blockSlots.map(e => e.time);
                                        const newSourceArr = sourceArr.filter(
                                          e =>
                                            !(
                                              e.day === moveSource.day &&
                                              e.course_code === movedEntry.course_code &&
                                              e.instructor === movedEntry.instructor &&
                                              e.room === movedEntry.room &&
                                              timesToRemove.includes(e.time)
                                            )
                                        );

                                        // Find the length of the block
                                        const blockLength = blockSlots.length;

                                        // Find the target start index in allTimeSlots
                                        const targetStartIdx = allTimeSlots.indexOf(time);

                                        // If not enough room in the target day, abort move
                                        if (targetStartIdx + blockLength > allTimeSlots.length) return prev;

                                        // Check for conflicts in the target slots
                                        for (let i = 0; i < blockLength; i++) {
                                          const t = allTimeSlots[targetStartIdx + i];
                                          if (
                                            targetArr.some(
                                              e =>
                                                e.day === day &&
                                                e.time === t &&
                                                (
                                                  e.room === movedEntry.room ||
                                                  e.instructor === movedEntry.instructor
                                                )
                                            )
                                          ) {
                                            alert('⚠️ Conflict detected at target slot. Move aborted.');
                                            return prev;
                                          }
                                        }

                                        // Remove any existing slots for this course block on the target day/times (prevents accidental merging)
                                        const newTargetArr = targetArr.filter(
                                          e =>
                                            !(
                                              e.day === day &&
                                              e.course_code === movedEntry.course_code &&
                                              e.instructor === movedEntry.instructor &&
                                              e.room === movedEntry.room &&
                                              allTimeSlots
                                                .slice(targetStartIdx, targetStartIdx + blockLength)
                                                .includes(e.time)
                                            )
                                        );

                                        // Create new slots for the target day/times
                                        const movedSlots = blockSlots.map((slot, i) => ({
                                          ...slot,
                                          day,
                                          time: allTimeSlots[targetStartIdx + i],
                                        }));

                                        return {
                                          ...prev,
                                          [moveSource.level]: newSourceArr,
                                          [level]: [...newTargetArr, ...movedSlots],
                                        };
                                      });
                                      setMoveSource(null);
                                    }
                                  }}
                                ></td>
                              );
                            }
                            // Calculate span for consecutive slots
                            let span = 1;
                            let nextIdx = colIdx + 1;
                            while (
                              nextIdx < allTimeSlots.length &&
                              getCellEntry(entries, day, allTimeSlots[nextIdx]) &&
                              getCellEntry(entries, day, allTimeSlots[nextIdx]).course_code === entry.course_code &&
                              getCellEntry(entries, day, allTimeSlots[nextIdx]).instructor === entry.instructor &&
                              getCellEntry(entries, day, allTimeSlots[nextIdx]).room === entry.room
                            ) {
                              span++;
                              nextIdx++;
                            }
                            skipSlots = span - 1;
                            const cellConflict =
                              conflictedCells && (
                                conflictedCells.includes(`${day}-${time}-room-${entry.room}`) ||
                                conflictedCells.includes(`${day}-${time}-instructor-${entry.instructor}`)
                              );
                            const isMoveSource =
                              moveSource &&
                              moveSource.level === level &&
                              moveSource.day === day &&
                              moveSource.time === time;
                            return (
                              <td
                                key={time}
                                colSpan={span}
                                className={`border px-2 py-1
                                  ${cellConflict ? 'bg-red-200' : ''}
                                  ${isMoveSource ? 'bg-blue-200' : ''}
                                `}
                                title={cellConflict ? 'Conflict: double-booked room or instructor' : ''}
                                onDoubleClick={() => {
                                  if (isMoveSource) {
                                    setMoveSource(null); // Cancel if double-clicking the source cell again
                                  } else if (entry) {
                                    setMoveSource({ level, day, time });
                                  }
                                }}
                              >
                                {isMoveSource ? (
                                  <span className="text-xs text-blue-700">Select target cell</span>
                                ) : entry ? (
                                  <>
                                    <div>{entry.course_code}</div>
                                    <div className="text-xs">{entry.course_name}</div>
                                    <div className="text-xs">{entry.instructor}</div>
                                    <div className="text-xs">{entry.room}</div>
                                    {cellConflict && (
                                      <div className="text-xs text-red-600 font-bold">⚠️ Conflict</div>
                                    )}
                                  </>
                                ) : ''}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="text-xs text-gray-500 mt-2">
                  Double-click a cell to move. Then click an empty cell to drop. Red cells indicate conflicts.
                </div>
              </section>
            );
          })
        )
      )}
      {moveSource && (
        <button
          className="mt-2 px-3 py-1 bg-gray-300 rounded text-sm"
          onClick={() => setMoveSource(null)}
        >
          Cancel Move
        </button>
      )}
    </div>
  );
};

export default Generate;
