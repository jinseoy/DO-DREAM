// src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Join from './pages/Join';
import ClassroomList from './pages/ClassroomList';
import Classroom from './pages/Classroom';
import EditorPage from './pages/EditorPage'; 
import StudentRoom from './pages/StudentRoom';
import './index.css';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate('/');
  };

  return (
    <Routes>
      {/* 로그인/회원가입 페이지 */}
      <Route 
        path="/" 
        element={
          isLoggedIn ? 
          <Navigate to="/classrooms" replace /> : 
          <Join onLoginSuccess={handleLogin} />
        } 
      />

      {/* 반 선택 페이지 */}
      <Route 
        path="/classrooms" 
        element={
          isLoggedIn ? 
          <ClassroomList onLogout={handleLogout} /> : 
          <Navigate to="/" replace />
        } 
      />

      {/* 반별 자료함 & 학생 관리 페이지 */}
      <Route 
        path="/classroom/:classroomId" 
        element={
          isLoggedIn ? 
          <Classroom /> 
          : 
          <Navigate to="/" replace />
        } 
      />

      {/* 에디터 페이지 - EditorPage로 변경! */}
      <Route 
        path="/editor" 
        element={
          isLoggedIn ? 
          <EditorPage /> 
          : 
          <Navigate to="/" replace />
        } 
      />

      {/* 학생 페이지 */}
      <Route 
        path="/student/:studentId" 
        element={
          isLoggedIn ? 
          <StudentRoom /> 
          : 
          <Navigate to="/" replace />
        } 
      />

      {/* 기본 라우트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}