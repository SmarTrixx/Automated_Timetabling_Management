import React, { useMemo } from "react";
import { moveBlock } from "../utils/timetableMoveHelper";
import { getGlobalConflictedCells } from "../utils/conflictChecker"; // adjust path

const TimetableCalendarView = ({
  fullView, allEntries, currentSchedule, allTimeSlots, dayOrder,
  getCellEntry, moveSource, setMoveSource, setManualEdits, timetable
}) => {
  // Global conflict detection
  const globalConflicts = useMemo(
    () => getGlobalConflictedCells(currentSchedule),
    [currentSchedule]
  );

  // Helper for rendering calendar cells (handles move logic)
  const renderCells = (entries, level = null) => dayOrder.map(day => {
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
            const availableTarget = isAvailableTarget(day, time, level, moveSource, entries, allTimeSlots);
            return (
              <td
                key={time}
                className={`border px-2 py-1 ${moveSource ? (availableTarget ? "bg-green-100" : "bg-gray-100") : ""} ${moveSource ? "timetable-drop-hover" : ""}`}
                tabIndex={moveSource ? 0 : -1}
                aria-label={moveSource ? "Drop here" : undefined}
                onClick={() => {
                  if (
                    moveSource &&
                    availableTarget &&
                    moveSource.level === level // <--- Only allow move within same level
                  ) {
                    setManualEdits(prev =>
                      moveBlock({
                        prev,
                        moveSource,
                        level,
                        day,
                        time,
                        timetable,
                        allTimeSlots
                      })
                    );
                    setMoveSource(null);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.target.click();
                  }
                }}
              ></td>
            );
          }
          // Merge cells for consecutive slots
          let span = 1;
          let nextIdx = colIdx + 1;
          while (nextIdx < allTimeSlots.length) {
            const nextEntry = getCellEntry(entries, day, allTimeSlots[nextIdx]);
            if (
              nextEntry &&
              nextEntry.course_code === entry.course_code &&
              nextEntry.instructor === entry.instructor &&
              nextEntry.room === entry.room
            ) {
              span++;
              nextIdx++;
            } else {
              break;
            }
          }
          skipSlots = span - 1;
          const cellConflict =
            globalConflicts.includes(`${day}-${time}-room-${entry.room}`) ||
            globalConflicts.includes(`${day}-${time}-instructor-${entry.instructor}`);
          const isMoveSource =
            moveSource &&
            moveSource.level === level &&
            moveSource.day === day &&
            moveSource.time === time;
          const availableTarget = isAvailableTarget(day, time, level, moveSource, entries, allTimeSlots);
          return (
            <td
              key={time}
              colSpan={span}
              className={`border px-2 py-1
                ${cellConflict ? "bg-red-200" : ""}
                ${isMoveSource ? "bg-blue-200" : ""}
                ${moveSource ? (availableTarget ? "bg-green-200" : "bg-gray-200") : ""}
              `}
              title={cellConflict ? "Conflict: double-booked room or instructor" : ""}
              tabIndex={0}
              aria-label={isMoveSource ? "Selected for move" : undefined}
              onDoubleClick={() => {
                if (isMoveSource) {
                  setMoveSource(null);
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
              ) : ""}
            </td>
          );
        })}
      </tr>
    );
  });

  // Render
  if (fullView) {
    return (
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
            {renderCells(allEntries)}
          </tbody>
        </table>
        <div className="text-xs text-gray-500 mt-2">
          Red cells indicate conflicts.
        </div>
      </section>
    );
  }
  return (
    <>
      {Object.entries(currentSchedule).map(([level, entries]) => (
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
              {renderCells(entries, level)}
            </tbody>
          </table>
          <div className="text-xs text-gray-500 mt-2">
            Double-click a cell to move. Then click an empty cell to drop. Red cells indicate conflicts.
          </div>
        </section>
      ))}
    </>
  );
};

// Helper to check if a cell is a valid move target
function isAvailableTarget(day, time, level, moveSource, entries, allTimeSlots) {
  if (!moveSource) return false;
  if (moveSource.level !== level) return false; // <--- Only allow within same level
  if (moveSource.day === day && moveSource.time === time) return false;

  // Find the block to move
  const sourceArr = entries;
  const movedEntry = sourceArr.find(
    e => e.day === moveSource.day && e.time === moveSource.time
  );
  if (!movedEntry) return false;

  const blockSlots = sourceArr
    .filter(
      e =>
        e.day === moveSource.day &&
        e.course_code === movedEntry.course_code &&
        e.instructor === movedEntry.instructor &&
        e.room === movedEntry.room
    )
    .sort((a, b) => allTimeSlots.indexOf(a.time) - allTimeSlots.indexOf(b.time));
  const blockLength = blockSlots.length;
  const targetStartIdx = allTimeSlots.indexOf(time);
  if (targetStartIdx + blockLength > allTimeSlots.length) return false;

  // Check for conflicts in the target slots
  for (let i = 0; i < blockLength; i++) {
    const t = allTimeSlots[targetStartIdx + i];
    if (
      entries.some(
        e =>
          e.day === day &&
          e.time === t &&
          (e.room === movedEntry.room || e.instructor === movedEntry.instructor)
      )
    ) {
      return false;
    }
    if (
      entries.some(
        e =>
          e.day === day && e.time === t
      )
    ) {
      return false;
    }
  }
  return true;
}

export default TimetableCalendarView;