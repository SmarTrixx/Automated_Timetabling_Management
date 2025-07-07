import React from "react";

const FacultyPreview = ({ preview, selectedFaculty, departments, filteredCourses }) => (
  preview && selectedFaculty && (
    <section className="bg-white shadow-xl rounded-2xl p-6 mb-10">
      <h3 className="text-lg font-semibold mb-3 text-gray-700">
        📚 Departments in {selectedFaculty}
      </h3>
      <ul className="list-disc pl-5 text-gray-600 space-y-1">
        {departments.length === 0 ? (
          <li>No departments found.</li>
        ) : (
          departments.map((dept) => (
            <li key={dept.id}>{dept.name}</li>
          ))
        )}
      </ul>
      <h3 className="text-lg font-semibold mt-6 mb-3 text-gray-700">
        📖 Courses in {selectedFaculty}
        <span className="ml-2 text-sm text-gray-500">(for selected semester only)</span>
      </h3>
      <ul className="list-disc pl-5 text-gray-600 space-y-1">
        {filteredCourses.length === 0 ? (
          <li>No courses found.</li>
        ) : (
          filteredCourses.map((course) => (
            <li key={course.id}>
              <span className="font-semibold">{course.code}</span>: {course.name} ({course.level} level, {course.credit_hours} credits, {course.duration} mins, {course.num_students} students)
            </li>
          ))
        )}
      </ul>
    </section>
  )
);

export default FacultyPreview;