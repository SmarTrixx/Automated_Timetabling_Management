import React, { useState, useEffect, useMemo } from 'react';
import TimetableCalendarView from '../components/TimetableCalendarView';
import { getGlobalConflictedCells } from '../utils/conflictChecker';

const API_BASE = 'http://localhost:5000';

function groupEntriesByLevel(entries) {
  const grouped = {};
  entries.forEach(e => {
    if (!grouped[e.level]) grouped[e.level] = [];
    grouped[e.level].push(e);
  });
  return grouped;
}

function addHoursToTime(start, duration) {
  const [h, m] = start.split(':').map(Number);
  const totalMinutes = h * 60 + m + duration;
  const endH = Math.floor(totalMinutes / 60);
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

const Timetables = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [facultyWide, setFacultyWide] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [sessions, setSessions] = useState([]);

  // Fetch faculties
  useEffect(() => {
    fetch(`${API_BASE}/api/faculties`)
      .then(res => res.json())
      .then(data => setFaculties(Array.isArray(data) ? data : []))
      .catch(() => setFaculties([]));
  }, []);

  // Fetch departments when faculty changes
  useEffect(() => {
    if (selectedFaculty) {
      fetch(`${API_BASE}/api/departments?faculty=${encodeURIComponent(selectedFaculty)}`)
        .then(res => res.json())
        .then(data => setDepartments(Array.isArray(data) ? data : []))
        .catch(() => setDepartments([]));
    } else {
      setDepartments([]);
    }
    setSelectedDept('');
  }, [selectedFaculty]);

  // Fetch sessions from backend
  useEffect(() => {
    fetch(`${API_BASE}/api/sessions`)
      .then(res => res.ok ? res.json() : [])
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]));
  }, []);

  // Fetch timetables when filters change
  useEffect(() => {
    if (!selectedFaculty || !selectedSemester || !selectedSession) {
      setTimetables([]);
      return;
    }
    setLoading(true);
    fetch(
      `${API_BASE}/api/timetables?faculty=${encodeURIComponent(selectedFaculty)}&semester=${encodeURIComponent(selectedSemester)}&session=${encodeURIComponent(selectedSession)}`
    )
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch timetables'))
      .then(data => setTimetables(Array.isArray(data) ? data : []))
      .catch(() => setTimetables([]))
      .finally(() => setLoading(false));
  }, [selectedFaculty, selectedSemester, selectedSession]);

  // Flatten all timetable entries
  const allEntries = useMemo(() => {
    let entries = [];
    timetables.forEach(tt => {
      if (Array.isArray(tt.schedule)) {
        entries = entries.concat(tt.schedule);
      } else if (typeof tt.schedule === 'object') {
        Object.values(tt.schedule).forEach(arr => {
          entries = entries.concat(arr);
        });
      }
    });
    return entries;
  }, [timetables]);

  // Filtered entries for department or faculty-wide
  const displayedEntries = useMemo(() => {
    if (facultyWide) return allEntries;
    if (selectedDept) return allEntries.filter(e => e.department === selectedDept);
    return [];
  }, [allEntries, facultyWide, selectedDept]);

  // Grouped by department for faculty-wide view
  const groupedByDepartment = useMemo(() => {
    const grouped = {};
    allEntries.forEach(e => {
      if (!grouped[e.department]) grouped[e.department] = [];
      grouped[e.department].push(e);
    });
    return grouped;
  }, [allEntries]);

  // Table view
  const renderTable = (entries) => {
    // Group by unique course/day/instructor/room/level/department/duration
    const grouped = {};
    entries.forEach(e => {
      const key = [
        e.day,
        e.course_code,
        e.course_name,
        e.instructor,
        e.room,
        e.department,
        e.level,
        e.duration
      ].join('|');
      if (!grouped[key]) {
        grouped[key] = { ...e, times: [e.time] };
      } else {
        grouped[key].times.push(e.time);
      }
    });

    return (
      <table className="min-w-full border mt-4 mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Day</th>
            <th className="border px-2 py-1">Time</th>
            <th className="border px-2 py-1">Course</th>
            <th className="border px-2 py-1">Instructor</th>
            <th className="border px-2 py-1">Room</th>
            <th className="border px-2 py-1">Department</th>
            <th className="border px-2 py-1">Duration</th>
          </tr>
        </thead>
        <tbody>
          {Object.values(grouped).map((e, idx) => {
            const sortedTimes = e.times.sort();
            const startTime = sortedTimes[0];
            const endTime = addHoursToTime(startTime, e.duration);
            return (
              <tr key={idx} className="hover:bg-blue-50">
                <td className="border px-2 py-1">{e.day}</td>
                <td className="border px-2 py-1">{`${startTime} - ${endTime}`}</td>
                <td className="border px-2 py-1">{`${e.course_code} - ${e.course_name}`}</td>
                <td className="border px-2 py-1">{e.instructor}</td>
                <td className="border px-2 py-1">{e.room}</td>
                <td className="border px-2 py-1">{e.department}</td>
                <td className="border px-2 py-1">{`${Math.round(e.duration / 60)} hr${e.duration >= 120 ? 's' : ''}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  // Print handler (print only timetable section, similar to Generate.js)
  const handlePrint = () => {
    const printContents = document.getElementById('timetable-section').innerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>Print Timetable</title>');
    win.document.write('<style>table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ccc;padding:8px;}h3{margin-top:2em;}</style>');
    win.document.write('</head><body>');
    win.document.write(printContents);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  // Export handler
  const handleExport = () => {
    // Simple CSV export
    const rows = [
      ['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department', 'Duration'],
      ...displayedEntries.map(e => [
        e.day,
        `${e.time} - ${addHoursToTime(e.time, e.duration)}`,
        `${e.course_code} - ${e.course_name}`,
        e.instructor,
        e.room,
        e.department,
        `${Math.round(e.duration / 60)} hr${e.duration >= 120 ? 's' : ''}`
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timetable.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calendar view helpers
  const allTimeSlots = useMemo(() => Array.from(new Set(displayedEntries.map(e => e.time))).sort(), [displayedEntries]);
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const groupedByLevel = useMemo(() => groupEntriesByLevel(displayedEntries), [displayedEntries]);
  const globalConflicts = useMemo(() => getGlobalConflictedCells(displayedEntries), [displayedEntries]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">📅 View Saved Timetables</h1>

      {/* Selection Section */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Faculty</label>
            <select
              className="border px-4 py-3 rounded w-full"
              value={selectedFaculty}
              onChange={e => setSelectedFaculty(e.target.value)}
            >
              <option value="">-- Choose Faculty --</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Semester</label>
            <select
              className="border px-4 py-3 rounded w-full"
              value={selectedSemester}
              onChange={e => setSelectedSemester(e.target.value)}
            >
              <option value="">-- Choose Semester --</option>
              <option value="First">First</option>
              <option value="Second">Second</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Session</label>
            <select
              className="border px-4 py-3 rounded w-full"
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
            >
              <option value="">-- Choose Session --</option>
              {sessions.map((s, idx) => (
                <option key={idx} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* View Option Section */}
      {selectedFaculty && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="viewMode"
                  checked={facultyWide}
                  onChange={() => setFacultyWide(true)}
                />
                <span className="text-sm">Faculty-wide view</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="viewMode"
                  checked={!facultyWide}
                  onChange={() => setFacultyWide(false)}
                />
                <span className="text-sm">Department view</span>
              </label>
              {!facultyWide && (
                <select
                  className="border px-4 py-3 rounded ml-4"
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
              <button
                className="px-4 py-2 rounded bg-green-600 text-white"
                onClick={handlePrint}
              >
                Print
              </button>
              <button
                className="px-4 py-2 rounded bg-yellow-600 text-white"
                onClick={handleExport}
              >
                Export
              </button>
            </div>
          </div>
          <div className="flex items-center mb-6 space-x-4">
            <button
              className={`px-4 py-2 rounded ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('table')}
            >
              Table View
            </button>
            <button
              className={`px-4 py-2 rounded ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setViewMode('calendar')}
            >
              Calendar View
            </button>
          </div>
        </section>
      )}

      {/* Timetable Table or Calendar */}
      {selectedFaculty && (
        <section id="timetable-section" className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            📋 Timetables - {selectedFaculty} {facultyWide ? '(Faculty-wide)' : selectedDept ? `- ${selectedDept}` : ''}
          </h2>
          {loading ? (
            <p className="text-gray-500 italic">Loading...</p>
          ) : (
            <>
              {viewMode === 'table' ? (
                facultyWide ? (
                  Object.entries(groupedByDepartment).map(([dept, entries]) => (
                    <div key={dept}>
                      <h3 className="text-lg font-bold mb-2">{dept}</h3>
                      {renderTable(entries)}
                    </div>
                  ))
                ) : (
                  displayedEntries.length === 0
                    ? <div>No timetables found for selected filters.</div>
                    : renderTable(displayedEntries)
                )
              ) : (
                <TimetableCalendarView
                  fullView={facultyWide}
                  allEntries={displayedEntries}
                  currentSchedule={groupedByLevel}
                  allTimeSlots={allTimeSlots}
                  dayOrder={dayOrder}
                  getCellEntry={(entries, day, time) =>
                    entries.find(e => e.day === day && e.time === time)
                  }
                  moveSource={null}
                  setMoveSource={() => {}}
                  setManualEdits={() => {}}
                  timetable={null}
                />
              )}
              {globalConflicts.length > 0 && (
                <div className="text-red-600 font-bold mt-4">
                  ⚠️ There are timetable conflicts (room or instructor double-booked)!
                </div>
              )}
            </>
          )}
        </section>
      )}

      {faculties.length === 0 && (
        <div className="text-red-500">No faculties loaded!</div>
      )}
    </div>
  );
};

export default Timetables;