// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Join from './pages/Join';
import Classroom from './pages/Classroom';
import StudentRoom from './pages/StudentRoom';
import './index.css'

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          isLoggedIn ? 
          <Navigate to="/classroom" replace /> : 
          <Join onLoginSuccess={handleLogin} />
        } 
      />
      <Route 
        path="/classroom" 
        element={
          isLoggedIn ? 
          <Classroom /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route 
        path="/studentroom/:id" 
        element={
          isLoggedIn ? 
          <StudentRoom /> : 
          <Navigate to="/" replace />
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}