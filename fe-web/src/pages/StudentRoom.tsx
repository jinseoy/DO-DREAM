import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Book, Zap, TrendingUp } from 'lucide-react';
import './StudentRoom.css';

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  progressRate: number;
};

type Activity = {
  title: string;
  date: string;
  icon: string;
};

export default function StudentRoom() {
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();

  const [students] = useState<Student[]>([
    { id: '1', name: '김민준', grade: '3학년 1반', avatar: '👦🏻', progressRate: 85 },
    { id: '2', name: '이서연', grade: '3학년 1반', avatar: '👧🏻', progressRate: 92 },
    { id: '3', name: '박지호', grade: '3학년 2반', avatar: '👦🏻', progressRate: 78 },
    { id: '4', name: '최유진', grade: '3학년 2반', avatar: '👧🏻', progressRate: 88 },
    { id: '5', name: '정민수', grade: '3학년 3반', avatar: '👦🏻', progressRate: 95 },
    { id: '6', name: '강서윤', grade: '3학년 3반', avatar: '👧🏻', progressRate: 81 },
  ]);

  const student = useMemo(
    () => students.find((s) => s.id === studentId) ?? students[0],
    [students, studentId]
  );

  const activities: Activity[] = [
    { title: '독서 감상문 제출', date: '2024.10.20', icon: '📝' },
    { title: '수학 문제 풀이', date: '2024.10.19', icon: '🔢' },
    { title: '과학 실험 보고서', date: '2024.10.18', icon: '🧪' },
  ];

  const handleBack = () => {
    // 교실 목록으로
    navigate('/classrooms');
    // 또는 navigate(-1);
  };

  return (
    <div className="sr-container">
      {/* Header */}
      <header className="sr-header">
        <div className="sr-header-content">
          <button onClick={handleBack} className="sr-back-btn">
            <ArrowLeft size={18} />
            돌아가기
          </button>

          <div className="sr-student-info">
            <div className="sr-avatar">{student.avatar}</div>
            <div className="sr-student-detail">
              <h1 className="sr-student-name">{student.name}</h1>
              <p className="sr-student-grade">{student.grade}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="sr-main">
        {/* Stats Grid */}
        <div className="sr-stats-grid">
          {/* Completed Tasks */}
          <div className="sr-stat-card sr-stat-blue">
            <div className="sr-stat-header">
              <div>
                <p className="sr-stat-label">완료한 과제</p>
                <p className="sr-stat-number">12</p>
              </div>
              <div className="sr-stat-icon sr-icon-blue">
                <Book size={24} />
              </div>
            </div>
            <p className="sr-stat-hint">지난주 대비 +2개</p>
          </div>

          {/* In Progress */}
          <div className="sr-stat-card sr-stat-amber">
            <div className="sr-stat-header">
              <div>
                <p className="sr-stat-label">진행 중</p>
                <p className="sr-stat-number">3</p>
              </div>
              <div className="sr-stat-icon sr-icon-amber">
                <Zap size={24} />
              </div>
            </div>
            <p className="sr-stat-hint">예정일: 3일</p>
          </div>

          {/* Progress Rate */}
          <div className="sr-stat-card sr-stat-green">
            <div className="sr-stat-header">
              <div>
                <p className="sr-stat-label">전체 진도</p>
                <p className="sr-stat-number">{student.progressRate}%</p>
              </div>
              <div className="sr-stat-icon sr-icon-green">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="sr-progress-container">
              <div className="sr-progress-bar">
                <div
                  className="sr-progress-fill"
                  style={{ width: `${student.progressRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="sr-activity-card">
          <h2 className="sr-activity-title">최근 활동</h2>

          <div className="sr-activity-list">
            {activities.map((activity, i) => (
              <div key={i} className="sr-activity-item">
                <div className="sr-activity-icon">{activity.icon}</div>
                <div className="sr-activity-content">
                  <p className="sr-activity-name">{activity.title}</p>
                  <p className="sr-activity-date">{activity.date}</p>
                </div>
                <div className="sr-activity-dot" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
