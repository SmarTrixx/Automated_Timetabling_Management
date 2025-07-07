// ✅ src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Courses from './pages/Courses';
import Instructors from './pages/Instructors';
import Rooms from './pages/Rooms';
import Timetables from './pages/Timetables';

function App() {
  return (
    <div className="min-h-screen flex flex-col relative bg-gray-500">
      {/* Background layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-sm brightness-75"
        style={{ backgroundImage: "url('/bg1.jpg')" }} // or a gradient
      ></div>

      {/* Overlay content */}
<div className="relative z-10 flex flex-col min-h-screen bg-white/60 dark:bg-gray-800/70 backdrop-blur-md">

        <Navbar />
        <main className="flex-grow px-4 md:px-10 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/instructors" element={<Instructors />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/timetables" element={<Timetables />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
