import React from "react";

const ConflictAlerts = ({ timetable, allConflicts }) => (
  <>
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
    {allConflicts && allConflicts.length > 0 && (
      <div className="mt-4 text-red-700 bg-red-100 p-3 rounded">
        <strong>Detected Conflicts:</strong>
        <ul className="list-disc pl-5">
          {allConflicts.map((conf, idx) => (
            <li key={idx}>{conf}</li>
          ))}
        </ul>
      </div>
    )}
  </>
);

export default ConflictAlerts;