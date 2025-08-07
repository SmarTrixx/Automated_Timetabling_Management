import React from 'react';

const Footer = () => (
  <footer className="bg-blue-950 text-white text-sm mt-16 font-extrabold">
    <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6" align="center">
      
      <div>
        <h3 className="text-lg font-semibold mb-2">📌 About</h3>
        <p className="text-gray-300">
          Academic Timetable System built with ❤️ by Yusuf Tunde to streamline course scheduling for faculties and departments.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">📱 Contact</h3>
        <p>Email: <a href="mailto:smartzdev@gmail.com" className="text-blue-400 hover:underline font-semibold">smartzdev@gmail.com</a></p>
        <p>Phone: <a href="tel:+2348123456789" className="text-blue-400 font-semibold hover:underline">+234 812 345 6789</a></p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">🌍 Social</h3>
        <ul className="space-y-1">
          <li><a href="https://github.com/SmartzSource" className="text-blue-400 hover:underline ">GitHub</a></li>
          <li><a href="https://twitter.com/smartzdev" className="text-blue-400 hover:underline">Twitter</a></li>
          <li><a href="https://linkedin.com/in/yusuf-tunde" className="text-blue-400 hover:underline">LinkedIn</a></li>
        </ul>
      </div>
    </div>
    <div className="text-center border-t border-gray-700 py-4 text-gray-400">
      © {new Date().getFullYear()} Yusuf Tunde. All rights reserved.
    </div>
  </footer>
);

export default Footer;
