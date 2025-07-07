import React from 'react';
import ReactDOM from 'react-dom/client'; // ✅ Notice: 'react-dom/client'
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';


// ✅ Create root and render
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Router>
    <App />
  </Router>
);
