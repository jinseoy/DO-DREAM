// src/App.tsx
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Join from './pages/Join';
import ClassroomList from './pages/ClassroomList';
import Classroom from './pages/Classroom';
import AdvancedEditor from './pages/AdvancedEditor';
import StudentRoom from './pages/StudentRoom';
import './index.css';

type Chapter = {
  id: string;
  title: string;
  content: string;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    navigate('/');
  };

  const handleNavigateToEditor = (text: string) => {
    setExtractedText(text);
    navigate('/editor');
  };

  const handlePublishAndReturn = (title: string, chapters: Chapter[]) => {
    // Classroom 페이지에서 materialPublished 이벤트로 처리됨
    navigate(-1); // 이전 페이지로 돌아가기
    setExtractedText('');
  };

  const handleBackToClassroom = () => {
    navigate(-1);
    setExtractedText('');
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
          <Classroom onNavigateToEditor={handleNavigateToEditor} /> : 
          <Navigate to="/" replace />
        } 
      />

      {/* 에디터 페이지 */}
      <Route 
        path="/editor" 
        element={
          isLoggedIn ? 
          <AdvancedEditor 
            extractedText={extractedText}
            onPublish={handlePublishAndReturn}
            onBack={handleBackToClassroom}
          /> : 
          <Navigate to="/" replace />
        } 
      />

      {/* 학생 페이지 */}
      <Route 
        path="/studentroom/:id" 
        element={
          isLoggedIn ? 
          <StudentRoom /> : 
          <Navigate to="/" replace />
        } 
      />

      {/* 기본 라우트 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}