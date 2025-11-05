import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  BookOpen,
  LogOut,
  Users,
  Plus,
  FileText,
  Trash2,
  Tag,
  Send,
  NotebookPen,
} from 'lucide-react';
import { useEffect, useMemo, useState, useRef, ChangeEvent } from 'react';
import './ClassroomList.css';
import teacherAvatar from '../assets/classList/teacher.png';

import MaterialSendModal2Step from '@/component/MaterialSendModal2step';
import schoolImg from '../assets/classList/school.png';
import maleImg from '../assets/classroom/male.png';
import femaleImg from '../assets/classroom/female.png';

type ClassroomData = {
  id: string;
  grade: string;
  class: string;
  studentCount: number;
  materialCount: number;
};

type Material = {
  id: string;
  title: string;
  uploadDate: string; // 'YYYY.MM.DD'
  label?: string;
  status: 'draft' | 'published';
};

type ClassroomListProps = {
  onLogout: () => void;
  onNavigateToEditor?: () => void;
};

const LABEL_OPTIONS = [
  { id: 'red', color: '#ef4444', name: '빨강' },
  { id: 'orange', color: '#f97316', name: '주황' },
  { id: 'yellow', color: '#eab308', name: '노랑' },
  { id: 'green', color: '#2ea058ff', name: '초록' },
  { id: 'blue', color: '#3c71c7ff', name: '파랑' },
  { id: 'purple', color: '#8e4fc8ff', name: '보라' },
  { id: 'gray', color: '#8b8f97ff', name: '회색' },
];

// 반별 학생 데이터
const STUDENTS_BY_CLASSROOM: Record<
  string,
  Array<{
    id: string;
    name: string;
    grade: string;
    gender?: 'male' | 'female';
    avatarUrl?: string;
    avatar?: string;
  }>
> = {
  '1': [
    { id: '1', name: '김민준', grade: '3학년 1반', gender: 'male' },
    { id: '2', name: '이서연', grade: '3학년 1반', gender: 'female' },
  ],
  '2': [
    { id: '3', name: '박지호', grade: '3학년 2반', gender: 'male' },
    { id: '4', name: '최유진', grade: '3학년 2반', gender: 'female' },
  ],
  '3': [
    { id: '5', name: '정민수', grade: '2학년 1반', gender: 'male' },
    { id: '6', name: '강서윤', grade: '2학년 1반', gender: 'female' },
  ],
  '4': [
    { id: '7', name: '홍길동', grade: '2학년 3반', gender: 'male' },
    { id: '8', name: '김영희', grade: '2학년 3반', gender: 'female' },
  ],
};

/** KST 기준 날짜 포맷 유틸 */
function formatKST(date: Date, withTime = false) {
  // 한국 시간대 보정
  const tzDate = new Date(
    date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }),
  );
  const yyyy = tzDate.getFullYear();
  const mm = String(tzDate.getMonth() + 1).padStart(2, '0');
  const dd = String(tzDate.getDate()).padStart(2, '0');
  if (!withTime) return `${yyyy}.${mm}.${dd}`;
  const HH = String(tzDate.getHours()).padStart(2, '0');
  const MM = String(tzDate.getMinutes()).padStart(2, '0');
  return `${yyyy}년 ${mm}월 ${dd}일 (${HH}시 ${MM}분)`;
}

export default function ClassroomList({
  onLogout,
  onNavigateToEditor,
}: ClassroomListProps) {
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ 파일 추출 시뮬레이터 (demo)
  const simulateExtract = async (file: File): Promise<string> => {
    // 간단한 확장자 판별
    const name = file.name.toLowerCase();
    // (데모) txt면 실제 텍스트 읽고, 그 외는 더미 텍스트
    if (name.endsWith('.txt')) {
      const text = await file.text();
      return text.slice(0, 5000) || '내용이 비어있습니다.';
    }
    // pdf/doc/docx 등은 실제 파서 없이 더미 본문
    return [
      `<h1>${file.name}</h1>`,
      '<h2>자동 추출 요약 (Demo)</h2>',
      '<p>이 본문은 화면 흐름 확인을 위한 더미 텍스트입니다.</p>',
      '<ul>',
      '<li>원문에서 문단/제목/리스트를 탐지하여 편집 가능한 형태로 변환</li>',
      '<li>수식/표/이미지는 1차 텍스트로 대체</li>',
      '<li>필요 시 에디터에서 챕터 분할선으로 다중 챕터 구성</li>',
      '</ul>',
    ].join('');
  };

  // ✅ 파일 선택 트리거
  const handleCreateMaterial = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  // ✅ 파일 선택 후 처리
  const handlePickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    void Swal.fire({
      title: '텍스트 추출 중입니다',
      html: '<div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;"><div style="width: 50px; height: 50px; border: 4px solid #192b55; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="color: #192b55; font-size: 18px;">파일을 처리하는 중입니다...</p></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>',
      confirmButtonColor: '#192b55',
      allowOutsideClick: false,
      allowEscapeKey: false,
    });

    try {
      // 최소 표시 시간(ms)
      const MIN_SHOW_MS = 1200; // 1.2초 정도가 자연스러움

      // 실제 추출과 최소 지연을 동시에 기다림
      const [extracted] = await Promise.all([
        simulateExtract(file),
        sleep(MIN_SHOW_MS),
      ]);

      await Swal.close();

      navigate('/editor', {
        state: {
          fileName: file.name,
          extractedText: extracted.startsWith('<')
            ? extracted
            : `<h1>${file.name}</h1><p>${extracted
                .replace(/\n/g, '</p><p>')
                .replace(/<\/p><p>$/, '')}</p>`,
        },
      });
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: '추출 실패',
        text: '파일에서 텍스트를 추출하지 못했습니다. 다시 시도해 주세요.',
        confirmButtonColor: '#192b55',
        heightAuto: false,
      });
    }
  };

  // 메모장 상태 (localStorage 연동)
  const MEMO_KEY = 'clist_memo_v1';
  const [memo, setMemo] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem(MEMO_KEY);
    if (saved !== null) setMemo(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(MEMO_KEY, memo);
  }, [memo]);

  const [materials, setMaterials] = useState<Material[]>([
    {
      id: '1',
      title: '1학기 수업 자료',
      uploadDate: '2024.10.20',
      label: 'red',
      status: 'published',
    },
    {
      id: '2',
      title: '수학 심화 학습',
      uploadDate: '2024.10.18',
      label: 'blue',
      status: 'published',
    },
    {
      id: '3',
      title: '영어 문법 정리',
      uploadDate: '2024.10.15',
      label: 'green',
      status: 'published',
    },
    {
      id: '4',
      title: '과학 실험 보고서',
      uploadDate: '2024.10.12',
      label: 'purple',
      status: 'published',
    },
    {
      id: '5',
      title: '새로운 자료',
      uploadDate: '2024.10.10',
      status: 'draft',
    },
  ]);

  /** 최근 업데이트 일시 (자료 변경 시 현재 시각으로 갱신) */
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());
  useEffect(() => {
    setLastUpdatedAt(new Date());
  }, [materials]);

  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null,
  );

  const teacher = {
    name: '김싸피',
    email: 'teacher@school.com',
    avatar: teacherAvatar,
  };

  const classrooms: ClassroomData[] = [
    {
      id: '1',
      grade: '3학년',
      class: '1반',
      studentCount: 28,
      materialCount: 5,
    },
    {
      id: '2',
      grade: '3학년',
      class: '2반',
      studentCount: 26,
      materialCount: 3,
    },
    {
      id: '3',
      grade: '2학년',
      class: '1반',
      studentCount: 30,
      materialCount: 8,
    },
    {
      id: '4',
      grade: '2학년',
      class: '3반',
      studentCount: 25,
      materialCount: 4,
    },
  ];

  const handleSelectClassroom = (classroomId: string) => {
    navigate(`/classroom/${classroomId}`);
  };

  const getLabelColor = (label?: string) =>
    LABEL_OPTIONS.find((l) => l.id === label)?.color || 'transparent';

  // 라벨 변경
  const handleLabelMaterial = (materialId: string, currentLabel?: string) => {
    let selectedLabel = currentLabel;

    Swal.fire({
      title: '라벨 선택',
      html: `
      <div class="cl-label-grid">
        ${LABEL_OPTIONS.map(
          (label) => `
          <button
            class="cl-label-option ${currentLabel === label.id ? 'active' : ''}"
            data-label="${label.id}"
            style="background-color: ${label.color};"
            title="${label.name}"
          >
            ${currentLabel === label.id ? '✓' : ''}
          </button>
        `,
        ).join('')}
      </div>
    `,
      width: 420,
      padding: '18px',
      showCancelButton: true,
      confirmButtonText: '저장',
      cancelButtonText: '취소',
      reverseButtons: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      customClass: {
        popup: 'cl-label-modal',
        title: 'cl-label-title',
        confirmButton: 'cl-label-save',
        cancelButton: 'cl-label-cancel',
      },
      didOpen: () => {
        const buttons = document.querySelectorAll('.cl-label-option');
        buttons.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            buttons.forEach((b) => b.classList.remove('active'));
            const el = e.currentTarget as HTMLElement;
            el.classList.add('active');
            selectedLabel = el.getAttribute('data-label') || undefined;

            buttons.forEach((b) => {
              (b as HTMLElement).innerHTML =
                b.getAttribute('data-label') === selectedLabel ? '✓' : '';
            });
          });
        });
      },
      preConfirm: () => selectedLabel,
    }).then((result) => {
      if (result.isConfirmed) {
        setMaterials((prev) =>
          prev.map((mat) =>
            mat.id === materialId
              ? { ...mat, label: result.value as string | undefined }
              : mat,
          ),
        );
      }
    });
  };

  // 전송 모달
  const handleSendMaterial = (materialId: string) => {
    const m = materials.find((mt) => mt.id === materialId);
    if (!m) return;
    setSelectedMaterial(m);
    setShowSendModal(true);
  };

  // 삭제
  const handleDeleteMaterial = (materialId: string) => {
    Swal.fire({
      title: '자료를 삭제하시겠습니까?',
      text: '이 작업은 되돌릴 수 없습니다',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#d1d5db',
      reverseButtons: true,
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        setMaterials((prev) => prev.filter((mat) => mat.id !== materialId));
        Swal.fire({
          icon: 'success',
          title: '자료가 삭제되었습니다',
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    const ask = await Swal.fire({
      icon: 'question',
      title: '로그아웃 하시겠습니까?',
      showCancelButton: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      reverseButtons: true,
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소',
    });
    if (!ask.isConfirmed) return;

    setIsLoggingOut(true);
    void Swal.fire({
      title: '로그아웃 중…',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const res = await fetch(`${API_BASE}/api/auth/teacher/logout`, {
        method: 'POST',
        credentials: 'include', // 🔴 RT가 HttpOnly 쿠키이므로 필수
      });

      // 일부 서버는 바디가 없음 → ok만 체크
      if (!res.ok) throw new Error('로그아웃 실패');

      await Swal.close();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: '로그아웃 되었습니다',
        timer: 1200,
        showConfirmButton: false,
      });

      onLogout?.(); // App.tsx: isLoggedIn=false
      navigate('/', { replace: true }); // 🔁 Join 화면(루트)으로
    } catch (err: any) {
      await Swal.close();
      Swal.fire({
        icon: 'error',
        title: err?.message || '로그아웃 중 오류가 발생했습니다',
        confirmButtonColor: '#192b55',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // (참고) 가장 최근 업로드 "날짜"만 필요할 때
  const latestUploadDate = useMemo(() => {
    if (materials.length === 0) return '-';
    return materials
      .map((m) => m.uploadDate)
      .sort()
      .reverse()[0];
  }, [materials]);

  return (
    <div className="cl-root">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        style={{ display: 'none' }}
        onChange={handlePickFile}
      />
      <header className="cl-header">
        <div className="cl-header-wrapper">
          <h1 className="cl-header-title">DO:DREAM</h1>
          <button
            className="cl-logout-button"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={18} />
            <span>{isLoggingOut ? '로그아웃 중…' : '로그아웃'}</span>
          </button>
        </div>
      </header>

      <div className="cl-layout">
        <aside className="cl-sidebar">
          <div className="cl-sidebar-content">
            <div className="cl-profile-mini">
              <img
                className="cl-profile-avatar-mini"
                src={teacher.avatar}
                alt={`${teacher.name} 아바타`}
              />
              <h2 className="cl-profile-name-mini">{teacher.name}</h2>
              <p className="cl-profile-email-mini">{teacher.email}</p>
              <p className="cl-profile-label-mini">선생님</p>
            </div>

            <div className="cl-sidebar-divider" />

            {/* ▼ 메모장 (하단 고정) */}
            <div className="cl-memo">
              <div className="cl-memo-header">
                <div className="cl-memo-title">
                  <NotebookPen size={14} />
                  <span>메모장</span>
                </div>
                <div className="cl-memo-latest" title="오늘 날짜">
                  <span>오늘은 {formatKST(new Date())}</span>
                </div>
              </div>
              <textarea
                className="cl-memo-textarea"
                placeholder="수업 준비/할 일 메모"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
              />
            </div>
          </div>
        </aside>

        <main className="cl-main-content">
          {/* 반 목록 */}
          <div className="cl-classrooms-section">
            <div className="cl-section-header">
              <h2 className="cl-section-title">
                {classrooms.length}개 반 담당
              </h2>
              {/* <p className="cl-section-subtitle">
                자료를 관리할 반을 선택해주세요
              </p> */}
            </div>

            <div className="cl-classrooms-grid">
              {classrooms.map((classroom) => (
                <div
                  key={classroom.id}
                  className="cl-classroom-card"
                  onClick={() => handleSelectClassroom(classroom.id)}
                >
                  <div className="cl-classroom-header">
                    <div className="cl-classroom-title">
                      <h3>
                        {classroom.grade} {classroom.class}
                      </h3>
                    </div>
                  </div>

                  <div className="cl-classroom-stats">
                    <div className="cl-stat">
                      <Users size={18} />
                      <div className="cl-stat-info">
                        <p className="cl-stat-num">{classroom.studentCount}</p>
                        <p className="cl-stat-text">학생</p>
                      </div>
                    </div>
                    <div className="cl-divider" />
                    <div className="cl-stat">
                      <BookOpen size={18} />
                      <div className="cl-stat-info">
                        <p className="cl-stat-num">{classroom.materialCount}</p>
                        <p className="cl-stat-text">자료</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 자료함 */}
          <div className="cl-materials-section">
            {/* 헤더: 좌(타이틀/설명) + 우(최근 업데이트 일시) */}
            <div className="cl-materials-header">
              <div className="cl-section-header" style={{ flex: 1 }}>
                <h2 className="cl-section-title">내 자료</h2>
                {/* <p className="cl-section-subtitle">
                  생성하거나 공유한 자료들을 관리하세요
                </p> */}
              </div>
              <div className="cl-last-updated">
                최근 업데이트: {formatKST(lastUpdatedAt, true)}
              </div>

              <div className="cl-cta-row" style={{ gridColumn: '1 / -1' }}>
                <div className="cl-feature-explain">
                  <p className="cl-feature-title">자료 만들기란?</p>
                  <ul className="cl-feature-list">
                    <li>
                      <span>PDF나 TXT 파일 업로드 시 텍스트 자동 추출</span>
                    </li>
                    <li>
                      <span>에디터에서 내용 편집 · 단원 분리</span>
                    </li>
                    <li>
                      <span>완성된 자료를 반/학생에게 전송</span>
                    </li>
                    <li>
                      <span>앱에서 음성 학습 지원</span>
                    </li>
                  </ul>
                </div>

                <button
                  className="cl-create-material-btn"
                  onClick={handleCreateMaterial}
                >
                  <Plus size={20} />
                  <span>새 자료 만들기</span>
                </button>
              </div>
            </div>

            <div className="cl-materials-list">
              {materials.length === 0 ? (
                <div className="cl-empty-materials">
                  <FileText size={48} />
                  <p>자료가 없습니다</p>
                  <p className="cl-empty-hint">
                    "새 자료 만들기" 버튼을 눌러 시작하세요
                  </p>
                </div>
              ) : (
                materials.map((material) => (
                  <div key={material.id} className="cl-material-item">
                    {material.label && (
                      <div
                        className="cl-material-label-bar"
                        style={{
                          backgroundColor: getLabelColor(material.label),
                        }}
                      />
                    )}
                    <div className="cl-material-icon">
                      <FileText size={18} />
                    </div>
                    <div className="cl-material-info">
                      {/* 중첩 h3 버그 수정 */}
                      <h3 className="cl-material-title">{material.title}</h3>
                      <div className="cl-material-meta">
                        <span className="cl-material-date">
                          {material.uploadDate}
                        </span>
                        <span
                          className={`cl-material-status ${material.status}`}
                        >
                          {material.status === 'draft' ? '작성중' : '발행됨'}
                        </span>
                      </div>
                    </div>
                    <div className="cl-material-actions">
                      <button
                        className="cl-material-action-btn send-btn"
                        onClick={() => handleSendMaterial(material.id)}
                        title="자료 공유"
                      >
                        <Send size={16} />
                      </button>
                      <button
                        className="cl-material-action-btn label-btn"
                        onClick={() =>
                          handleLabelMaterial(material.id, material.label)
                        }
                        title="라벨 편집"
                      >
                        <Tag size={16} />
                      </button>
                      <button
                        className="cl-material-action-btn delete-btn"
                        onClick={() => handleDeleteMaterial(material.id)}
                        title="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 전송 모달 */}
      {showSendModal && selectedMaterial && (
        <MaterialSendModal2Step
          classrooms={classrooms.map((c) => ({
            id: c.id,
            name: `${c.grade} ${c.class}`,
            count: (STUDENTS_BY_CLASSROOM[c.id] || []).length,
          }))}
          studentsByClassroom={STUDENTS_BY_CLASSROOM}
          selectedMaterial={{
            id: selectedMaterial.id,
            title: selectedMaterial.title,
            uploadDate: selectedMaterial.uploadDate,
            content: '',
          }}
          onClose={() => {
            setShowSendModal(false);
            setSelectedMaterial(null);
          }}
          onSend={(studentIds, classroomIds) => {
            const all = classroomIds.flatMap(
              (id) => STUDENTS_BY_CLASSROOM[id] || [],
            );
            const names = all
              .filter((s) => studentIds.includes(s.id))
              .map((s) => s.name);
            Swal.fire({
              icon: 'success',
              title: '자료가 공유되었습니다!',
              html: `
                <div style="text-align:left;line-height:1.5">
                  <p style="margin:0 0 8px 0"><strong>"${selectedMaterial.title}"</strong></p>
                  <p style="margin:0 0 6px 0;color:#374151;"><strong>공유할 반</strong> ${classroomIds.join(', ')}</p>
                  <p style="margin:0 0 6px 0;color:#374151;"><strong>공유할 학생</strong> ${names.join(', ')}</p>
                  <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">${names.length}명에게 공유되었습니다</p>
                </div>
              `,
              confirmButtonColor: '#192b55',
            });
            setShowSendModal(false);
            setSelectedMaterial(null);
          }}
          schoolImage={schoolImg}
          maleImage={maleImg}
          femaleImage={femaleImg}
        />
      )}
    </div>
  );
}
