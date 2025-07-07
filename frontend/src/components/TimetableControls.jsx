import React from "react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const TimetableControls = ({
  loading, handleGenerate, handleSaveTimetable, handleExportExcel, handleExportPDF,
  timetable, viewMode, setViewMode, fullView, setFullView
}) => (
  <>
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
    {timetable && timetable.schedule && (
      <>
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
      </>
    )}
  </>
);

export default TimetableControls;