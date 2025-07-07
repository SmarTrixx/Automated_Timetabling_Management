import React from "react";

export const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Exported helper to add hours to a time string "HH:MM"
export function addHoursToTime(time, hours) {
  const [h, m] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, h, m);
  date.setHours(date.getHours() + hours);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Exported helper to group entries for the same course block
export function groupEntries(entries) {
  if (!entries || entries.length === 0) return [];
  const groupsMap = {};

  for (const entry of entries) {
    const key = `${entry.day}|${entry.course_code}|${entry.instructor}|${entry.room}|${entry.department}`;
    if (!groupsMap[key]) {
      groupsMap[key] = {
        ...entry,
        times: [entry.time],
        duration: 1,
      };
    } else {
      groupsMap[key].times.push(entry.time);
      groupsMap[key].duration += 1;
    }
  }

  const groups = Object.values(groupsMap).map(group => {
    group.times.sort();
    return group;
  });

  groups.sort((a, b) => {
    const dayA = DAY_ORDER.indexOf(a.day);
    const dayB = DAY_ORDER.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    return a.times[0].localeCompare(b.times[0]);
  });

  return groups;
}

const TimetableTableView = ({ fullView, allEntries, currentSchedule, sortEntries }) => {
  // Helper to render grouped rows
  const renderRows = (entries) => {
    const grouped = groupEntries(sortEntries(entries));
    return grouped.map((entry, index) => {
      const startTime = entry.times[0];
      const endTime = addHoursToTime(startTime, entry.duration);
      return (
        <tr key={index} className="border-t hover:bg-gray-50">
          <td className="px-4 py-2">{entry.day}</td>
          <td className="px-4 py-2">
            {startTime} - {endTime}
          </td>
          <td className="px-4 py-2">
            {entry.course_code} - {entry.course_name}
          </td>
          <td className="px-4 py-2">{entry.instructor}</td>
          <td className="px-4 py-2">{entry.room}</td>
          <td className="px-4 py-2">{entry.department}</td>
          <td className="px-4 py-2">{entry.duration} hr{entry.duration > 1 ? "s" : ""}</td>
        </tr>
      );
    });
  };

  return fullView ? (
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
            <th className="px-4 py-2 text-sm font-semibold">Duration</th>
          </tr>
        </thead>
        <tbody>
          {renderRows(allEntries || [])}
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
              <th className="px-4 py-2 text-sm font-semibold">Duration</th>
            </tr>
          </thead>
          <tbody>
            {renderRows(entries)}
          </tbody>
        </table>
      </section>
    ))
  );
};

export default TimetableTableView;