export function moveBlock({
  prev, moveSource, level, day, time, timetable, allTimeSlots
}) {
  const sourceArr = [...(prev[moveSource.level] || timetable.schedule[moveSource.level] || [])];
  const targetArr = [...(prev[level] || timetable.schedule[level] || [])];

  const movedEntry = sourceArr.find(
    e => e.day === moveSource.day && e.time === moveSource.time
  );
  if (!movedEntry) return prev;

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

  if (targetStartIdx + blockLength > allTimeSlots.length) return prev;

  // Check for conflicts in the target slots
  for (let i = 0; i < blockLength; i++) {
    const targetTime = allTimeSlots[targetStartIdx + i];
    if (
      targetArr.some(e =>
        e.day === day &&
        e.time === targetTime &&
        (e.room === movedEntry.room || e.instructor === movedEntry.instructor)
      ) ||
      targetArr.some(e => e.day === day && e.time === targetTime)
    ) {
      return prev;
    }
  }

  // Remove block from source (always, even if same level)
  const timesToRemove = blockSlots.map(e => e.time);
  const newSourceArr = sourceArr.filter(
    e =>
      !(
        e.day === moveSource.day &&
        e.course_code === movedEntry.course_code &&
        e.instructor === movedEntry.instructor &&
        e.room === movedEntry.room &&
        timesToRemove.includes(e.time)
      )
  );

  // Remove any old instances of this block from the target day/times
  const newTargetArr = targetArr.filter(
    e =>
      !(
        e.day === day &&
        e.course_code === movedEntry.course_code &&
        e.instructor === movedEntry.instructor &&
        e.room === movedEntry.room &&
        allTimeSlots
          .slice(targetStartIdx, targetStartIdx + blockLength)
          .includes(e.time)
      )
  );

  // Add the moved block to the target
  const movedSlots = blockSlots.map((slot, i) => ({
    ...slot,
    day,
    time: allTimeSlots[targetStartIdx + i],
  }));

  // Fix: Only update both if moving across levels, otherwise just update the level once
  if (moveSource.level === level) {
    // Use newSourceArr to remove the source, then add the moved slots
    return {
      ...prev,
      [level]: [...newSourceArr, ...movedSlots],
    };
  } else {
    return {
      ...prev,
      [moveSource.level]: newSourceArr,
      [level]: [...newTargetArr, ...movedSlots],
    };
  }
}