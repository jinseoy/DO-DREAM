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

type ParsedPdfPayload = {
  indexes?: string[];
  data?: Array<{
    index: string;
    index_title: string;
    titles: Array<{
      title: string;
      s_titles?: Array<{
        s_title?: string;
        contents?: string | null;
        ss_titles?: Array<{
          ss_title?: string;
          contents?: string | null;
        }>;
      }>;
    }>;
  }>;
};

type ParsedPdfResponse = ParsedPdfPayload & {
  filename?: string;
  pdfId?: number;
  parsedData?: ParsedPdfPayload;
};

type ParsedChapter = {
  id: string;
  title: string;
  content: string;
};

export default function ClassroomList({ onLogout }: ClassroomListProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const simulateExtract = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt')) {
      const text = await file.text();
      return text.slice(0, 5000) || '내용이 비어있습니다.';
    }
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

  async function uploadAndParsePdf(
    file: File,
    API_BASE: string,
  ): Promise<ParsedPdfResponse> {
    const url = `${API_BASE}/api/pdf/upload-and-parse?filename=${encodeURIComponent(
      file.name,
    )}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        accept: '*/*',
        'Content-Type': 'application/pdf',
      },
      body: file,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('PDF 업로드 오류', res.status, text);
      throw new Error(
        text || `PDF 파싱 요청에 실패했습니다. (status: ${res.status})`,
      );
    }

    const json = (await res.json()) as ParsedPdfResponse;
    console.log('[uploadAndParsePdf] raw response:', json);
    return json;
  }

  function buildChaptersFromParsedData(parsed: any): ParsedChapter[] {
    const root = parsed.parsedData ?? parsed;
    const data = root.data;

    const chapters: ParsedChapter[] = [];
    if (!data || data.length === 0) return chapters;

    let idCounter = 1;

    data.forEach((section: any) => {
      section.titles?.forEach((t: any) => {
        const htmlParts: string[] = [];

        t.s_titles?.forEach((s: any) => {
          if (s.s_title) {
            htmlParts.push(`<h3>${s.s_title}</h3>`);
          }

          if (s.contents) {
            htmlParts.push(`<p>${s.contents.replace(/\n/g, '<br/>')}</p>`);
          }

          if (s.ss_titles && s.ss_titles.length > 0) {
            htmlParts.push('<ul>');
            s.ss_titles.forEach((ss: any) => {
              const strong = ss.ss_title
                ? `<strong>${ss.ss_title}</strong> `
                : '';
              const text = (ss.contents || '').replace(/\n/g, '<br/>');
              htmlParts.push(`<li>${strong}${text}</li>`);
            });
            htmlParts.push('</ul>');
          }
        });

        chapters.push({
          id: String(idCounter++),
          title: t.title || `챕터 ${idCounter}`,
          content:
            htmlParts.join('\n') || '<p>이 챕터에 대한 내용이 없습니다.</p>',
        });
      });
    });

    return chapters;
  }

  const handleCreateMaterial = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handlePickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const docTitle = file.name.replace(/\.[^.]+$/, '') || '새로운 자료';

    void Swal.fire({
      title: '텍스트 추출 중입니다',
      html: `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
        <div style="width: 50px; height: 50px; border: 4px solid #192b55; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="color: #192b55; font-size: 18px;">파일을 처리하는 중입니다...</p>
      </div>
      <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    `,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      heightAuto: false,
    });

    const MIN_SHOW_MS = 1200;

    try {
      const isPdf =
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      if (isPdf) {
        const [parsed] = await Promise.all([
          uploadAndParsePdf(file, API_BASE),
          sleep(MIN_SHOW_MS),
        ]);

        const chapters = buildChaptersFromParsedData(parsed);

        await Swal.close();

        if (!chapters.length) {
          await Swal.fire({
            icon: 'error',
            title: '파싱 결과가 없습니다',
            text: 'PDF에서 챕터 정보를 찾지 못했어요. 직접 입력해 주세요.',
            confirmButtonColor: '#192b55',
          });
          return;
        }

        console.log('[handlePickFile] 파싱 완료:', {
          fileName: docTitle,
          chaptersCount: chapters.length,
          chapters: chapters.map((c) => ({
            id: c.id,
            title: c.title,
            contentLength: c.content.length,
          })),
        });

        // ✅ state로 직접 전달 (세션 스토리지 완전 제거)
        navigate('/editor', {
          state: {
            fileName: docTitle,
            chapters: chapters,
            from: 'classroom',
          },
        });
      } else {
        // TXT 등 다른 파일
        const [text] = await Promise.all([
          simulateExtract(file),
          sleep(MIN_SHOW_MS),
        ]);

        await Swal.close();

        navigate('/editor', {
          state: {
            fileName: docTitle,
            extractedText: text,
            from: 'classroom',
          },
        });
      }
    } catch (err) {
      await Swal.close();
      await Swal.fire({
        icon: 'error',
        title: '추출 실패',
        text: '파일에서 텍스트를 추출하지 못했습니다. 다시 시도해 주세요.',
        confirmButtonColor: '#192b55',
        heightAuto: false,
      });
    }
  };

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

  const handleLabelMaterial = (materialId: string, currentLabel?: string) => {
    let picked: string | undefined = currentLabel;

    Swal.fire({
      title: '라벨 선택',
      html: `
      <div class="ae-label-grid" id="labelGrid">
        ${LABEL_OPTIONS.map(
          (label) => `
          <button 
            class="ae-label-option ${picked === label.id ? 'active' : ''}" 
            data-label="${label.id}"
            style="background-color: ${label.color}; ${
              picked === label.id ? `border: 3px solid ${label.color};` : ''
            }" 
            title="${label.name}"
          >
            <span>${picked === label.id ? '✓' : ''}</span>
          </button>
        `,
        ).join('')}
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: '저장',
      cancelButtonText: '취소',
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      reverseButtons: true,

      didOpen: () => {
        const grid = document.getElementById('labelGrid');
        if (!grid) return;

        const buttons = Array.from(
          grid.querySelectorAll('.ae-label-option'),
        ) as HTMLElement[];

        const render = () => {
          buttons.forEach((btn) => {
            const id = btn.getAttribute('data-label');
            const active = id === picked;
            btn.classList.toggle('active', active);
            btn.style.border = active ? '3px solid #000' : '';
            btn.innerHTML = `<span>${active ? '✓' : ''}</span>`;
          });
        };

        grid.addEventListener('click', (e) => {
          const target = (e.target as HTMLElement).closest(
            '.ae-label-option',
          ) as HTMLElement | null;
          if (!target) return;
          picked = target.getAttribute('data-label') || undefined;
          render();
        });
      },

      preConfirm: () => picked,
    }).then((result) => {
      if (!result.isConfirmed) return;
      const value = result.value as string | undefined;

      setMaterials((prev) =>
        prev.map((mat) =>
          mat.id === materialId ? { ...mat, label: value } : mat,
        ),
      );
    });
  };

  const handleSendMaterial = (materialId: string) => {
    const m = materials.find((mt) => mt.id === materialId);
    if (!m) return;
    setSelectedMaterial(m);
    setShowSendModal(true);
  };

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
        credentials: 'include',
      });

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

      onLogout?.();
      navigate('/', { replace: true });
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

            <div className="cl-memo">
              <div className="cl-memo-stage">
                <div className="cl-memo-zoom">
                  <div className="cl-memo-header">
                    <div className="cl-memo-latest" title="오늘 날짜">
                      <span>Today : {formatKST(new Date())}</span>
                    </div>
                  </div>

                  <textarea
                    className="cl-memo-input"
                    placeholder="수업 준비/할 일 메모"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                  />
                </div>
              </div>
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
            <div className="cl-materials-header">
              <div className="cl-section-header" style={{ flex: 1 }}>
                <h2 className="cl-section-title">내 자료</h2>
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
