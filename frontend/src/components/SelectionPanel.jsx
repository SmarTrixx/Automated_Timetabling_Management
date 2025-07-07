import React from "react";

const SelectionPanel = ({
  faculties, selectedFaculty, setSelectedFaculty,
  semesters, selectedSemester, setSelectedSemester,
  selectedSession, setSelectedSession,
  startTime, setStartTime, endTime, setEndTime,
  enableBreak, setEnableBreak, breakTime, setBreakTime, breakOptions,
  instructors, selectedInstructor, setSelectedInstructor,
  showDays, setShowDays, availableDays, weekDays, handleDayToggle
}) => (
  <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">🎓 Select Faculty, Semester & Session</h2>
    <div className="grid md:grid-cols-2 gap-6">
      <select
        className="border px-4 py-3 rounded"
        value={selectedFaculty}
        onChange={e => setSelectedFaculty(e.target.value)}
      >
        <option value="">-- Choose Faculty --</option>
        {faculties.map((f) => (
          <option key={f.id} value={f.name}>{f.name}</option>
        ))}
      </select>
      <select
        className="border px-4 py-3 rounded"
        value={selectedSemester}
        onChange={e => setSelectedSemester(e.target.value)}
      >
        <option value="">-- Choose Semester --</option>
        {semesters.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
    </div>
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
    {selectedFaculty && (
      <div className="mt-6">
        <label className="block mb-2 font-semibold">Select Instructor</label>
        <select
          className="border px-4 py-3 rounded"
          value={selectedInstructor}
          onChange={e => setSelectedInstructor(e.target.value)}
        >
          <option value="">-- Choose Instructor --</option>
          {instructors.map(i => (
            <option key={i.id} value={i.name}>{i.name}</option>
          ))}
        </select>
      </div>
    )}
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
);

export default SelectionPanel;