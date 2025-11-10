import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Book,
  TrendingUp,
  FileText,
  MessageCircle,
  Award,
  AlertTriangle,
  Home,
} from 'lucide-react';
import './StudentRoom.css';
import male from '../assets/classroom/male.png';
import female from '../assets/classroom/female.png';

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  avatarUrl?: string;
  progressRate: number;
};

type ReceivedMaterial = {
  id: string;
  title: string;
  teacher: string;
  receivedDate: string;
  status: 'not-started' | 'in-progress' | 'completed';
  progressRate: number;
};

type QuizResult = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  completedDate: string;
  accuracy: number;
};

type StudentQuestion = {
  id: string;
  question: string;
  answer: string;
  askedDate: string;
  topic: string;
};

export default function StudentRoom() {
  const navigate = useNavigate();
  const { studentId } = useParams<{ studentId: string }>();

  const [students] = useState<Student[]>([
    {
      id: '1',
      name: '김민준',
      grade: '3학년 1반',
      avatar: '👦🏻',
      avatarUrl: male,
      progressRate: 85,
    },
    {
      id: '2',
      name: '이서연',
      grade: '3학년 1반',
      avatar: '👧🏻',
      avatarUrl: female,
      progressRate: 92,
    },
    {
      id: '3',
      name: '박지호',
      grade: '3학년 2반',
      avatar: '👦🏻',
      avatarUrl: male,
      progressRate: 78,
    },
    {
      id: '4',
      name: '최유진',
      grade: '3학년 2반',
      avatar: '👧🏻',
      avatarUrl: female,
      progressRate: 88,
    },
    {
      id: '5',
      name: '정민수',
      grade: '3학년 3반',
      avatar: '👦🏻',
      avatarUrl: male,
      progressRate: 95,
    },
    {
      id: '6',
      name: '강서윤',
      grade: '3학년 3반',
      avatar: '👧🏻',
      avatarUrl: female,
      progressRate: 81,
    },
  ]);

  const student = useMemo(
    () => students.find((s) => s.id === studentId) ?? students[0],
    [students, studentId],
  );

  const receivedMaterials: ReceivedMaterial[] = [
    {
      id: '1',
      title: '1학기 수업 자료',
      teacher: '김싸피',
      receivedDate: '2024.10.15',
      status: 'completed',
      progressRate: 100,
    },
    {
      id: '2',
      title: '학습 참고 자료',
      teacher: '김싸피',
      receivedDate: '2024.10.10',
      status: 'in-progress',
      progressRate: 65,
    },
    {
      id: '3',
      title: '심화 학습 문제',
      teacher: '김싸피',
      receivedDate: '2024.10.05',
      status: 'not-started',
      progressRate: 0,
    },
  ];

  const quizResults: QuizResult[] = [
    {
      id: '1',
      title: '수학 단원 퀴즈 #1',
      score: 92,
      maxScore: 100,
      completedDate: '2024.10.20',
      accuracy: 92,
    },
    {
      id: '2',
      title: '영어 문법 퀴즈',
      score: 78,
      maxScore: 100,
      completedDate: '2024.10.18',
      accuracy: 78,
    },
    {
      id: '3',
      title: '과학 실험 퀴즈',
      score: 85,
      maxScore: 100,
      completedDate: '2024.10.15',
      accuracy: 85,
    },
  ];

  const studentQuestions: StudentQuestion[] = [
    {
      id: '1',
      question: '이차함수의 판별식은 어떻게 구하나요?',
      answer: 'D=b²-4ac 입니다. 해의 개수 판단에 사용돼요.',
      askedDate: '2024.10.20',
      topic: '수학',
    },
    {
      id: '2',
      question: 'Present Perfect Tense의 사용',
      answer: '과거 시작 → 현재 영향. 경험/계속/완료에 쓰여요.',
      askedDate: '2024.10.18',
      topic: '영어',
    },
    {
      id: '3',
      question: '광합성의 과정',
      answer: '빛 반응과 어두운 반응 두 단계로 진행됩니다.',
      askedDate: '2024.10.15',
      topic: '과학',
    },
  ];

  const avgAccuracy = Math.round(
    quizResults.reduce((s, q) => s + q.accuracy, 0) /
      Math.max(1, quizResults.length),
  );
  const completedCount = receivedMaterials.filter(
    (m) => m.status === 'completed',
  ).length;

  const weakInsights = [
    {
      label: '수학: 서술형 채점 감점',
      hint: '풀이 과정 서술 누락 빈번',
      weight: 0.7,
    },
    { label: '영어: 시제 혼동', hint: '현재완료 vs 과거', weight: 0.5 },
    { label: '과학: 용어정의', hint: '개념정의 암기 부족', weight: 0.4 },
  ];

  const getStatusBadge = (status: string) =>
    status === 'completed'
      ? '완료'
      : status === 'in-progress'
        ? '진행중'
        : '미시작';

  const getStatusColor = (status: string) =>
    status === 'completed'
      ? '#10b981'
      : status === 'in-progress'
        ? '#f59e0b'
        : '#9ca3af';

  const handleBack = () => navigate(-1);
  const handleBackHome = () => navigate('/classrooms');

  return (
    <div className="sr-root">
      {/* ===== Header ===== */}
      <header className="sr-header">
        <div className="sr-header-wrapper">
          <h1 className="sr-header-title">DO:DREAM</h1>
          <div className="sr-header-actions">
            <button className="sr-header-btn" onClick={handleBack} title="뒤로가기">
              <ArrowLeft size={18} />
              <span>뒤로가기</span>
            </button>
            <button className="sr-header-btn" onClick={handleBackHome} title="홈으로">
              <Home size={18} />
              <span>메인으로</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="sr-main-content">
        {/* Profile Card */}
        <div className="sr-section">
          <div className="sr-profile-card">
            {student.avatarUrl ? (
              <img
                className="sr-avatar-img"
                src={student.avatarUrl}
                alt={`${student.name} 아바타`}
              />
            ) : (
              <div className="sr-avatar">{student.avatar}</div>
            )}
            <div className="sr-profile-info">
              <h2 className="sr-profile-name">{student.name}</h2>
              <p className="sr-profile-grade">{student.grade}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="sr-section">
          <div className="sr-stats-header">
            <h3 className="sr-section-title">학습 현황</h3>
          </div>
          <div className="sr-stats-grid">
            <div className="sr-stat-item sr-stat-full">
              <div className="sr-stat-info">
                <div className="sr-stat-label">전체 학습 진도</div>
                <div className="sr-stat-main">
                  <span className="sr-stat-number">{student.progressRate}%</span>
                </div>
              </div>
              <div className="sr-stat-bar-wrapper">
                <div className="sr-stat-bar">
                  <div
                    className="sr-stat-bar-fill"
                    style={{ width: `${student.progressRate}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="sr-stat-item">
              <TrendingUp size={24} className="sr-stat-icon" />
              <div className="sr-stat-info">
                <div className="sr-stat-label">완료한 자료</div>
                <div className="sr-stat-value">{completedCount}/{receivedMaterials.length}</div>
              </div>
            </div>

            <div className="sr-stat-item">
              <Award size={24} className="sr-stat-icon" />
              <div className="sr-stat-info">
                <div className="sr-stat-label">평균 정답률</div>
                <div className="sr-stat-value">{avgAccuracy}%</div>
              </div>
            </div>

            <div className="sr-stat-item">
              <MessageCircle size={24} className="sr-stat-icon" />
              <div className="sr-stat-info">
                <div className="sr-stat-label">질문 & 답변</div>
                <div className="sr-stat-value">{studentQuestions.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Weak Areas */}
        <div className="sr-section">
          <div className="sr-section-header">
            <AlertTriangle size={20} />
            <h3 className="sr-section-title">지원 필요 영역</h3>
          </div>
          <div className="sr-weak-areas">
            {weakInsights.map((w) => (
              <div key={w.label} className="sr-weak-item">
                <div className="sr-weak-header">
                  <strong>{w.label}</strong>
                  <small>{w.hint}</small>
                </div>
                <div className="sr-weak-bar">
                  <div
                    className="sr-weak-fill"
                    style={{ width: `${Math.round(10 + w.weight * 90)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Materials Section */}
        <div className="sr-section">
          <div className="sr-section-header">
            <FileText size={20} />
            <h3 className="sr-section-title">받은 자료</h3>
          </div>
          <div className="sr-list">
            {receivedMaterials.map((m) => (
              <div key={m.id} className="sr-list-item">
                <div className="sr-list-left">
                  <FileText size={18} className="sr-list-icon" />
                  <div className="sr-list-info">
                    <h4 className="sr-list-title">{m.title}</h4>
                    <p className="sr-list-meta">
                      <span>{m.teacher}</span>
                      <span> · </span>
                      <span>{m.receivedDate}</span>
                    </p>
                  </div>
                </div>
                <div className="sr-list-right">
                  <div className="sr-progress-bar">
                    <div
                      className="sr-progress-bar-fill"
                      style={{ width: `${m.progressRate}%` }}
                    />
                  </div>
                  <span
                    className="sr-badge"
                    style={{ background: getStatusColor(m.status) }}
                  >
                    {getStatusBadge(m.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Results Section */}
        <div className="sr-section">
          <div className="sr-section-header">
            <Award size={20} />
            <h3 className="sr-section-title">퀴즈 성적</h3>
          </div>
          <div className="sr-list">
            {quizResults.map((q) => (
              <div key={q.id} className="sr-list-item">
                <div className="sr-list-left">
                  <Award size={18} className="sr-list-icon sr-icon-amber" />
                  <div className="sr-list-info">
                    <h4 className="sr-list-title">{q.title}</h4>
                    <p className="sr-list-meta">{q.completedDate}</p>
                  </div>
                </div>
                <div className="sr-list-right sr-quiz-right">
                  <span className="sr-score">
                    {q.score}/{q.maxScore}
                  </span>
                  <span className="sr-accuracy">{q.accuracy}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Q&A Section */}
        <div className="sr-section">
          <div className="sr-section-header">
            <MessageCircle size={20} />
            <h3 className="sr-section-title">질문 & 답변</h3>
          </div>
          <div className="sr-qa-list">
            {studentQuestions.map((qa) => (
              <div key={qa.id} className="sr-qa-item">
                <div className="sr-qa-header">
                  <span className="sr-topic-badge">{qa.topic}</span>
                  <span className="sr-qa-date">{qa.askedDate}</span>
                </div>
                <div className="sr-qa-content">
                  <div className="sr-qa-row">
                    <span className="sr-qa-label">Q.</span>
                    <p className="sr-qa-text">{qa.question}</p>
                  </div>
                  <div className="sr-qa-row">
                    <span className="sr-qa-label">A.</span>
                    <p className="sr-qa-text">{qa.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}