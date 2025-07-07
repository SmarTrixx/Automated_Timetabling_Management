// Checks for room/instructor conflicts across all levels
export function getGlobalConflictedCells(schedule) {
  // schedule: { [level]: [entries] }
  const conflicts = [];
  const bySlot = {};

  // Flatten all entries from all levels
  const allEntries = Object.values(schedule).flat();

  allEntries.forEach(e => {
    const keyRoom = `${e.day}-${e.time}-room-${e.room}`;
    const keyInstructor = `${e.day}-${e.time}-instructor-${e.instructor}`;
    bySlot[keyRoom] = bySlot[keyRoom] ? bySlot[keyRoom] + 1 : 1;
    bySlot[keyInstructor] = bySlot[keyInstructor] ? bySlot[keyInstructor] + 1 : 1;
  });

  Object.entries(bySlot).forEach(([key, count]) => {
    if (count > 1) conflicts.push(key);
  });

  return conflicts;
}