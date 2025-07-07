// Sort timetable entries by day and time
export function sortEntries(entries, dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
  return entries.slice().sort((a, b) => {
    const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    return a.time.localeCompare(b.time);
  });
}

// Find a cell entry for a given day and time
export function getCellEntry(entries, day, time) {
  return entries.find(e => e.day === day && e.time === time);
}

// Detect conflicts (room or instructor double-booked)
export function checkConflicts(entries) {
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
}

// Get conflicted cells for coloring
export function getConflictedCells(entries) {
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
}