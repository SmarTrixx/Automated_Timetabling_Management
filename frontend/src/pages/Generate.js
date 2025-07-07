import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

import SelectionPanel from '../components/SelectionPanel';
import FacultyPreview from '../components/FacultyPreview';
import TimetableControls from '../components/TimetableControls';
import ConflictAlerts from '../components/ConflictAlerts';
import TimetableTableView, { groupEntries, addHoursToTime } from '../components/TimetableTableView';
import TimetableCalendarView from '../components/TimetableCalendarView';

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
  const [timetable, setTimetable] = useState(null);

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
      alert('❌ Failed to generate timetable. Check backend or CORS settings.');
    } finally {
      setLoading(false);
    }
  };

  // Save timetable to backend
  const handleSaveTimetable = async () => {
    if (!timetable) return;
    setLoading(true);
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
        alert('Failed to save timetable.');
      }
    } catch (err) {
      alert('Failed to save timetable: ' + (err.response?.data?.error || err.message));
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
    if (viewMode === 'calendar') {
      window.print();
      return;
    }
    if (viewMode === 'both') {
      const choice = window.confirm('Export calendar view? Click "Cancel" to export table view.');
      if (choice) {
        window.print();
        return;
      }
      // else fall through to table export
    }
    // Table view export as before
    const doc = new jsPDF();
    if (fullView) {
      doc.text(`${selectedFaculty} Faculty Timetable`, 10, 10);
      autoTable(doc, {
        startY: 20,
        head: [['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department', 'Duration']],
        body: groupEntries(sortEntries(allEntries || [])).map(e => [
          e.day,
          `${e.times[0]} - ${addHoursToTime(e.times[0], e.duration)}`,
          `${e.course_code} - ${e.course_name}`,
          e.instructor,
          e.room,
          e.department,
          `${e.duration} hr${e.duration > 1 ? "s" : ""}`
        ])
      });
    } else {
      Object.entries(currentSchedule).forEach(([, entries], idx) => {
        if (idx > 0) doc.addPage();
        doc.text(`${selectedFaculty} Level Timetable`, 10, 10);
        autoTable(doc, {
          startY: 20,
          head: [['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department', 'Duration']],
          body: groupEntries(sortEntries(entries)).map(e => [
            e.day,
            `${e.times[0]} - ${addHoursToTime(e.times[0], e.duration)}`,
            `${e.course_code} - ${e.course_name}`,
            e.instructor,
            e.room,
            e.department,
            `${e.duration} hr${e.duration > 1 ? "s" : ""}`
          ])
        });
      });
    }
    doc.save('timetable.pdf');
  };

  // Export Excel based on current view and faculty name
  const handleExportExcel = () => {
    if (!timetable || !timetable.schedule) return;
    // Show alert for calendar/both view, but do not gray out button
    if (viewMode === 'calendar' || viewMode === 'both') {
      alert('Excel export for calendar view is currently disabled.');
      return;
    }
    const wb = XLSX.utils.book_new();
    if (fullView) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department', 'Duration'],
        ...groupEntries(sortEntries(allEntries || [])).map(e => [
          e.day,
          `${e.times[0]} - ${addHoursToTime(e.times[0], e.duration)}`,
          `${e.course_code} - ${e.course_name}`,
          e.instructor,
          e.room,
          e.department,
          `${e.duration} hr${e.duration > 1 ? "s" : ""}`
        ])
      ]);
      XLSX.utils.book_append_sheet(wb, ws, `${selectedFaculty} Faculty`);
    } else {
      Object.entries(currentSchedule).forEach(([level, entries]) => {
        const ws = XLSX.utils.aoa_to_sheet([
          ['Day', 'Time', 'Course', 'Instructor', 'Room', 'Department', 'Duration'],
          ...groupEntries(sortEntries(entries)).map(e => [
            e.day,
            `${e.times[0]} - ${addHoursToTime(e.times[0], e.duration)}`,
            `${e.course_code} - ${e.course_name}`,
            e.instructor,
            e.room,
            e.department,
            `${e.duration} hr${e.duration > 1 ? "s" : ""}`
          ])
        ]);
        XLSX.utils.book_append_sheet(wb, ws, `${selectedFaculty} Level ${level}`);
      });
    }
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'timetable.xlsx');
  };

  // Compute conflicts for current view
  const allConflicts = fullView
    ? checkConflicts(allEntries || [])
    : Object.entries(currentSchedule).flatMap(([level, entries]) => checkConflicts(entries));

  const calendarRefs = useRef({});

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">🧠 Generate Timetable</h1>

      <SelectionPanel
        faculties={faculties}
        selectedFaculty={selectedFaculty}
        setSelectedFaculty={setSelectedFaculty}
        semesters={semesters}
        selectedSemester={selectedSemester}
        setSelectedSemester={setSelectedSemester}
        selectedSession={selectedSession}
        setSelectedSession={setSelectedSession}
        startTime={startTime}
        setStartTime={setStartTime}
        endTime={endTime}
        setEndTime={setEndTime}
        enableBreak={enableBreak}
        setEnableBreak={setEnableBreak}
        breakTime={breakTime}
        setBreakTime={setBreakTime}
        breakOptions={breakOptions}
        instructors={instructors}
        selectedInstructor={selectedInstructor}
        setSelectedInstructor={setSelectedInstructor}
        showDays={showDays}
        setShowDays={setShowDays}
        availableDays={availableDays}
        weekDays={weekDays}
        handleDayToggle={handleDayToggle}
      />

      <FacultyPreview
        selectedFaculty={selectedFaculty}
        departments={departments}
        filteredCourses={filteredCourses}
      />

      <TimetableControls
        loading={loading}
        handleGenerate={handleGenerate}
        handleSaveTimetable={handleSaveTimetable}
        handleExportExcel={handleExportExcel}
        handleExportPDF={handleExportPDF}
        timetable={timetable}
        viewMode={viewMode}
        setViewMode={setViewMode}
        fullView={fullView}
        setFullView={setFullView}
        disableExcel={false} // Always enabled
      />

      <ConflictAlerts timetable={timetable} allConflicts={allConflicts} />

      {(viewMode === 'table' || viewMode === 'both') && timetable && timetable.schedule && Object.keys(currentSchedule).length > 0 && (
        <TimetableTableView
          fullView={fullView}
          allEntries={allEntries}
          currentSchedule={currentSchedule}
          sortEntries={sortEntries}
        />
      )}

      {(viewMode === 'calendar' || viewMode === 'both') && timetable && timetable.schedule && Object.keys(currentSchedule).length > 0 && (
         <div id="calendar-print-area" className="calendar-level-print">
       <TimetableCalendarView
          fullView={fullView}
          allEntries={allEntries}
          currentSchedule={currentSchedule}
          allTimeSlots={allTimeSlots}
          dayOrder={dayOrder}
          getCellEntry={getCellEntry}
          getConflictedCells={getConflictedCells}
          moveSource={moveSource}
          setMoveSource={setMoveSource}
          setManualEdits={setManualEdits}
          timetable={timetable}
        />
        </div>
      )}

      {moveSource && (
        <button
          className="mt-2 px-3 py-1 bg-gray-300 rounded text-sm"
          onClick={() => setMoveSource(null)}
        >
          Cancel Move
        </button>
      )}

      {(viewMode === 'calendar' || viewMode === 'both') && (
        <button
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
          onClick={() => window.print()}
        >
          Print Timetable
        </button>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #calendar-print-area, #calendar-print-area * {
            visibility: visible !important;
          }
          #calendar-print-area {
            position: absolute !important;
            left: 0; top: 0; width: 100vw;
            background: white !important;
            z-index: 9999 !important;
          }
          .calendar-level-print {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Generate;
