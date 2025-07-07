import React, { useState, useEffect, useMemo } from 'react';
import TimetableCalendarView from '../components/TimetableCalendarView';
import { getGlobalConflictedCells } from '../utils/conflictChecker';
import { toast } from 'react-toastify';

const API_BASE = 'http://localhost:5000';

const Timetables = () => {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [levels] = useState(["100", "200", "300", "400", "500"]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [manualEdits, setManualEdits] = useState(null);

  // Fetch faculties from backend
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
    setSelectedLevel('');
    setTimetables([]);
    setSelectedTimetable(null);
    setManualEdits(null);
  }, [selectedFaculty]);

  // Fetch timetables when department or level changes
  useEffect(() => {
    if (selectedFaculty && selectedDept && selectedLevel) {
      setLoading(true);
      fetch(
        `${API_BASE}/api/timetables?faculty=${encodeURIComponent(selectedFaculty)}&department=${encodeURIComponent(selectedDept)}&level=${encodeURIComponent(selectedLevel)}`
      )
        .then(res => res.json())
        .then(data => setTimetables(Array.isArray(data) ? data : []))
        .catch(() => setTimetables([]))
        .finally(() => setLoading(false));
    } else {
      setTimetables([]);
      setSelectedTimetable(null);
      setManualEdits(null);
    }
  }, [selectedFaculty, selectedDept, selectedLevel]);

  // Get the current schedule for calendar view (manual edits take precedence)
  const currentSchedule = useMemo(() => {
    if (manualEdits) return manualEdits;
    if (selectedTimetable && selectedTimetable.schedule) return selectedTimetable.schedule;
    return {};
  }, [manualEdits, selectedTimetable]);

  // Get all entries for full view (flattened)
  const allEntries = useMemo(() => {
    if (!currentSchedule) return [];
    return Object.values(currentSchedule).flat();
  }, [currentSchedule]);

  // Get all time slots and day order from the timetable (or fallback)
  const allTimeSlots = useMemo(() => {
    if (selectedTimetable && selectedTimetable.time_slots) return selectedTimetable.time_slots;
    // fallback
    return ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
  }, [selectedTimetable]);
  const dayOrder = useMemo(() => {
    if (selectedTimetable && selectedTimetable.day_order) return selectedTimetable.day_order;
    // fallback
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  }, [selectedTimetable]);

  // Global conflict detection
  const globalConflicts = useMemo(
    () => getGlobalConflictedCells(currentSchedule),
    [currentSchedule]
  );

  // Handler for exporting
  const handleExport = (tt) => {
    if (globalConflicts.length > 0) {
      toast.error("Cannot export: There are timetable conflicts!");
      return;
    }
    alert('📤 Exporting timetable...');
    // ...your export logic here...
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">📅 View Saved Timetables</h1>

      {/* Dropdown Section */}
      <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">🎓 Select Faculty & Department</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <select
            className="border px-4 py-3 rounded"
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
          >
            <option value="">-- Choose Faculty --</option>
            {faculties.map((f) => (
              <option key={f.id} value={f.name}>{f.name}</option>
            ))}
          </select>

          <select
            className="border px-4 py-3 rounded"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={!selectedFaculty}
          >
            <option value="">-- Choose Department --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        {/* Debug output */}
        {/* <pre>{JSON.stringify(departments, null, 2)}</pre> */}
      </section>

      {/* Level Grid */}
      {selectedDept && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">🎓 Select Level</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {levels.map((lvl) => (
              <div
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`hover:border-blue-500 border border-gray-200 p-4 rounded-2xl shadow hover:bg-blue-50 cursor-pointer ${
                  selectedLevel === lvl ? 'bg-blue-100' : ''
                }`}
              >
                <p className="text-lg font-medium">Level {lvl}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Timetable Table */}
      {selectedLevel && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            📋 Timetables - {selectedDept} ({selectedLevel} Level)
          </h2>

          {loading ? (
            <p className="text-gray-500 italic">Loading...</p>
          ) : timetables.length === 0 ? (
            <p className="text-gray-500 italic">No timetables available.</p>
          ) : (
            <table className="min-w-full text-left border">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-sm font-semibold">Semester</th>
                  <th className="px-4 py-3 text-sm font-semibold">Session</th>
                  <th className="px-4 py-3 text-sm font-semibold">Created</th>
                  <th className="px-4 py-3 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timetables.map((tt, i) => (
                  <tr
                    key={i}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedTimetable(tt);
                      setManualEdits(null);
                    }}
                  >
                    <td className="px-4 py-3">{tt.name}</td>
                    <td className="px-4 py-3">{tt.semester}</td>
                    <td className="px-4 py-3">{tt.session}</td>
                    <td className="px-4 py-3">{tt.created_at || tt.date}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleExport(tt);
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Export
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Calendar View for selected timetable */}
      {selectedTimetable && (
        <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">
            🗓️ Calendar View: {selectedTimetable.name}
          </h2>
          <TimetableCalendarView
            fullView={true}
            allEntries={allEntries}
            currentSchedule={currentSchedule}
            allTimeSlots={allTimeSlots}
            dayOrder={dayOrder}
            getCellEntry={(entries, day, time) =>
              entries.find(e => e.day === day && e.time === time)
            }
            moveSource={null}
            setMoveSource={() => {}}
            setManualEdits={setManualEdits}
            timetable={selectedTimetable}
          />
          {globalConflicts.length > 0 && (
            <div className="text-red-600 font-bold mt-4">
              ⚠️ There are timetable conflicts (room or instructor double-booked)!
            </div>
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