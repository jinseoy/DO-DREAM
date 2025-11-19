import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  Award,
  AlertTriangle,
  Home,
  Search,
  SortDesc,
  SortAsc,
} from 'lucide-react';
import './StudentRoom.css';

type Student = {
  id: string;
  name: string;
  grade: string;
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

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

export default function StudentRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams<{ studentId: string }>();

  // ✅ 전달받은 데이터만 사용
  const student = location.state?.student as Student | undefined;
  const classroomId = location.state?.classroomId as string | undefined;
  const classLabel = location.state?.classLabel as string | undefined;

  // ✅ 학생 데이터가 없으면 리다이렉트
  useEffect(() => {
    if (!student) {
      navigate('/classrooms', { replace: true });
    }
  }, [student, navigate]);

  const [matQuery, setMatQuery] = useState('');
  const [matSort, setMatSort] = useState<'new' | 'old'>('new');
  const [isLoading, setIsLoading] = useState(false);

  // ✅ API로 받아올 데이터들 (현재는 빈 배열)
  const [receivedMaterials, setReceivedMaterials] = useState<ReceivedMaterial[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [studentQuestions, setStudentQuestions] = useState<StudentQuestion[]>([]);

  // ✅ TODO: API 호출로 실제 데이터 가져오기
  useEffect(() => {
    if (!student || !API_BASE) return;

    const fetchStudentData = async () => {
      try {
        setIsLoading(true);
        const accessToken = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          accept: '*/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        // TODO: 실제 API 엔드포인트로 교체
        // const materialsRes = await fetch(`${API_BASE}/api/students/${student.id}/materials`, { headers, credentials: 'include' });
        // const quizRes = await fetch(`${API_BASE}/api/students/${student.id}/quizzes`, { headers, credentials: 'include' });
        // const questionsRes = await fetch(`${API_BASE}/api/students/${student.id}/questions`, { headers, credentials: 'include' });

        // 임시: 빈 배열로 초기화
        setReceivedMaterials([]);
        setQuizResults([]);
        setStudentQuestions([]);
      } catch (err) {
        console.error('학생 데이터 로딩 실패', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStudentData();
  }, [student?.id]);

  const filteredMaterials = useMemo(() => {
    const q = matQuery.trim().toLowerCase();
    let list = receivedMaterials.filter((m) =>
      q ? m.title.toLowerCase().includes(q) : true,
    );
    list.sort((a, b) =>
      matSort === 'new'
        ? new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime()
        : new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime(),
    );
    return list;
  }, [receivedMaterials, matQuery, matSort]);

  const avgAccuracy = useMemo(() => {
    if (quizResults.length === 0) return 0;
    return Math.round(
      quizResults.reduce((s, q) => s + q.accuracy, 0) / quizResults.length,
    );
  }, [quizResults]);

  const completedCount = useMemo(() => {
    return receivedMaterials.filter((m) => m.status === 'completed').length;
  }, [receivedMaterials]);

  // ✅ TODO: API로 받아올 데이터 (현재는 빈 배열)
  const weakInsights = [];

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

  const handleBack = () => {
    if (classroomId) {
      navigate(`/classroom/${classroomId}`);
    } else {
      navigate(-1);
    }
  };

  const handleBackHome = () => navigate('/classrooms');

  // ✅ student가 없으면 아무것도 렌더링 안 함
  if (!student) return null;

  return (
    <div className="sr-root student-room-page">
      {/* Header */}
      <header className="cl-header">
        <div className="cl-header-wrapper">
          <h1 className="cl-header-title">DO:DREAM</h1>
          <div className="cl-header-button">
            <button
              type="button"
              className="cl-logout-button"
              onClick={handleBack}
              title="뒤로가기"
            >
              <ArrowLeft size={18} />
              <span>뒤로가기</span>
            </button>
            <button
              type="button"
              className="cl-logout-button"
              onClick={handleBackHome}
              title="메인으로"
            >
              <Home size={18} />
              <span>메인으로</span>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="cl-sidebar">
        <div className="cl-sidebar-content">
          <div className="cl-profile-mini">
            {student.avatarUrl ? (
              <img
                className="cl-profile-avatar-mini"
                src={student.avatarUrl}
                alt={`${student.name} 아바타`}
              />
            ) : (
              <div className="sr-avatar-placeholder">👤</div>
            )}
            <h2 className="cl-profile-name-mini">{student.name}</h2>
            <p className="cl-profile-email-mini">{student.grade}</p>
          </div>

          {/* 학습 현황 요약 */}
          <div className="sr-sidebar-stats">
            <div className="sr-sidebar-stat-item">
              <div className="sr-sidebar-stat-label">전체 학습 진도</div>
              <div className="sr-sidebar-stat-value">{student.progressRate}%</div>
              <div className="sr-sidebar-progress-bar">
                <div
                  className="sr-sidebar-progress-fill"
                  style={{ width: `${student.progressRate}%` }}
                />
              </div>
            </div>

            <div className="sr-sidebar-stat-item">
              <div className="sr-sidebar-stat-label">완료한 자료</div>
              <div className="sr-sidebar-stat-value">
                {completedCount}/{receivedMaterials.length}
              </div>
            </div>

            <div className="sr-sidebar-stat-item">
              <div className="sr-sidebar-stat-label">평균 정답률</div>
              <div className="sr-sidebar-stat-value">{avgAccuracy}%</div>
            </div>

            <div className="sr-sidebar-stat-item">
              <div className="sr-sidebar-stat-label">질문 & 답변</div>
              <div className="sr-sidebar-stat-value">{studentQuestions.length}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="cl-main-fixed">
        <div className="sr-content-wrapper">
          {/* 받은 자료 */}
          <section className="cl-card">
            <div className="cl-card-head">
              <div className="cl-head-left">
                <h3>받은 학습 자료</h3>
              </div>
              <div className="cl-head-right">
                <div className="cl-input-wrap cl-control">
                  <Search size={16} />
                  <input
                    className="cl-input"
                    placeholder="자료 제목 검색"
                    value={matQuery}
                    onChange={(e) => setMatQuery(e.target.value)}
                  />
                </div>
                <button
                  className="cl-sort-btn cl-control"
                  onClick={() => setMatSort((s) => (s === 'new' ? 'old' : 'new'))}
                >
                  {matSort === 'new' ? <SortDesc size={16} /> : <SortAsc size={16} />}
                  <span>{matSort === 'new' ? '최신 순' : '오래된 순'}</span>
                </button>
              </div>
            </div>

            <div className="cl-section-scroll">
              <div className="cl-materials-list">
                {isLoading ? (
                  <p className="cl-empty-hint">불러오는 중입니다…</p>
                ) : filteredMaterials.length === 0 ? (
                  <div className="cl-empty-materials">
                    <FileText size={48} />
                    <p>받은 자료가 없습니다</p>
                    <p className="cl-empty-hint">선생님이 자료를 공유하면 이곳에 표시됩니다.</p>
                  </div>
                ) : (
                  filteredMaterials.map((m) => (
                    <div key={m.id} className="cl-material-item">
                      <div className="cl-material-icon">
                        <FileText size={18} />
                      </div>
                      <div className="cl-material-info">
                        <h3 className="cl-material-title">{m.title}</h3>
                        <div className="cl-material-meta">
                          <span className="cl-material-date">{m.receivedDate}</span>
                          <span> · </span>
                          <span>{m.teacher}</span>
                        </div>
                      </div>
                      <div className="sr-material-progress">
                        <div className="sr-progress-bar-small">
                          <div
                            className="sr-progress-fill-small"
                            style={{ width: `${m.progressRate}%` }}
                          />
                        </div>
                        <span
                          className="sr-status-badge"
                          style={{ background: getStatusColor(m.status) }}
                        >
                          {getStatusBadge(m.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* 두 번째 줄 */}
          <div className="sr-two-columns">
            {/* 지원 필요 영역 */}
            <section className="cl-card">
              <div className="cl-card-head">
                <div className="cl-head-left">
                  <AlertTriangle size={20} />
                  <h3>지원 필요 영역</h3>
                </div>
              </div>

              <div className="cl-section-scroll">
                {weakInsights.length === 0 ? (
                  <p className="cl-empty-hint">분석 데이터가 없습니다.</p>
                ) : (
                  <div className="sr-weak-areas">
                    {weakInsights.map((w: any) => (
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
                )}
              </div>
            </section>

            {/* 퀴즈 성적 */}
            <section className="cl-card">
              <div className="cl-card-head">
                <div className="cl-head-left">
                  <Award size={20} />
                  <h3>퀴즈 성적</h3>
                </div>
              </div>

              <div className="cl-section-scroll">
                {quizResults.length === 0 ? (
                  <p className="cl-empty-hint">퀴즈 결과가 없습니다.</p>
                ) : (
                  <div className="sr-quiz-list">
                    {quizResults.map((q) => (
                      <div key={q.id} className="sr-quiz-item">
                        <div className="sr-quiz-info">
                          <h4>{q.title}</h4>
                          <p>{q.completedDate}</p>
                        </div>
                        <div className="sr-quiz-score">
                          <span className="sr-score-main">
                            {q.score}/{q.maxScore}
                          </span>
                          <span className="sr-accuracy-badge">{q.accuracy}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Q&A */}
          <section className="cl-card">
            <div className="cl-card-head">
              <div className="cl-head-left">
                <MessageCircle size={20} />
                <h3>질문 & 답변</h3>
              </div>
            </div>

            <div className="cl-section-scroll">
              {studentQuestions.length === 0 ? (
                <p className="cl-empty-hint">질문 & 답변이 없습니다.</p>
              ) : (
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
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}