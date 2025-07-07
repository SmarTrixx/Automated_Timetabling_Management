import React from 'react';
import { Link } from 'react-router-dom';

// ✅ Import Heroicons v2 — one per line
import BookOpenIcon from '@heroicons/react/24/outline/BookOpenIcon.js';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon.js';
import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon.js';
import CogIcon from '@heroicons/react/24/outline/CogIcon.js';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon.js';

const dashboardItems = [
  {
    label: 'Courses',
    desc: 'Add and manage courses',
    to: '/courses',
    icon: BookOpenIcon,
  },
  {
    label: 'Instructors',
    desc: 'Assign instructors to courses',
    to: '/instructors',
    icon: UserGroupIcon,
  },
  {
    label: 'Rooms',
    desc: 'Configure lecture rooms',
    to: '/rooms',
    icon: BuildingOfficeIcon,
  },
  {
    label: 'Generate',
    desc: 'Generate AI-based timetable',
    to: '/generate',
    icon: CogIcon,
  },
  {
    label: 'Timetables',
    desc: 'Browse saved timetables',
    to: '/timetables',
    icon: CalendarDaysIcon,
  },
];

const Dashboard = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <center><h1 className="text-4xl font-extrabold text-gray-800 mb-10">
        🎓 Academic Timetable Dashboard
      </h1></center>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {dashboardItems.map(({ label, desc, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="group block p-6 bg-white border border-gray-200 rounded-2xl shadow hover:shadow-xl hover:border-blue-500 transition duration-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <Icon className="w-7 h-7 text-blue-500 group-hover:text-blue-700" />
              <span className="text-xl font-semibold text-gray-800 group-hover:text-blue-800">
                {label}
              </span>
            </div>
            <p className="text-gray-600 text-sm">{desc}</p>
            <div className="mt-3 text-sm text-blue-500 group-hover:underline">
              Go to {label} →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
