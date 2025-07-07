// src/components/Navbar.js
import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/generate', label: 'Generate' },
  { path: '/courses', label: 'Courses' },
  { path: '/instructors', label: 'Instructors' },
  { path: '/rooms', label: 'Rooms' },
  { path: '/timetables', label: 'Timetables' }
];

const Navbar = () => (
  <nav className="bg-blue-950 shadow-lg py-6">
    <div className="max-w-7xl mx-auto px-6">
      <ul className="flex justify-center flex-wrap gap-8 text-lg font-semibold">
        {navItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `text-white hover:underline transition ${
                  isActive ? 'underline text-yellow-300' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);

export default Navbar;
