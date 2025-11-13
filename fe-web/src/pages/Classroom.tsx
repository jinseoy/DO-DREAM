import { useParams, useNavigate, Navigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  FileText,
  Search,
  SortDesc,
  SortAsc,
  Trash2,
  Tag,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import teacherAvatar from '../assets/classList/teacher.png';
import maleImg from '../assets/classroom/male.png';
import femaleImg from '../assets/classroom/female.png';
import './Classroom.css';

/* ===== 타입 ===== */
type LabelId =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'gray';

type Material = {
  id: string;
  title: string;
  uploadDate: string;
  label?: LabelId;
};
type Student = {
  id: string;
  name: string;
  grade: string;
  avatarUrl?: string;
  progressRate: number;
};

/* ===== 라벨 옵션 ===== */
const LABEL_OPTIONS = [
  { id: 'red', color: '#ef4444', name: '빨강' },
  { id: 'orange', color: '#f97316', name: '주황' },
  { id: 'yellow', color: '#eab308', name: '노랑' },
  { id: 'green', color: '#2ea058ff', name: '초록' },
  { id: 'blue', color: '#3c71c7ff', name: '파랑' },
  { id: 'purple', color: '#8e4fc8ff', name: '보라' },
  { id: 'gray', color: '#8b8f97ff', name: '회색' },
] as const;

const getLabelColor = (label?: LabelId) =>
  LABEL_OPTIONS.find((l) => l.id === label)?.color || 'transparent';

const parseDate = (d: string) => {
  const [y, m, day] = d.split('.').map((v) => parseInt(v, 10));
  return new Date(y, m - 1, day);
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

export default function Classroom() {
  const { classroomId = '1' } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();

  const STORAGE_KEY = `materials_${classroomId}`;

  // 초기 기본값
  const defaultMaterials: Material[] = [
    {
      id: '1',
      title: '심화 학습 문제',
      uploadDate: '2024.10.25',
      label: 'green',
    },
    {
      id: '2',
      title: '학습 참고 자료',
      uploadDate: '2024.10.21',
      label: 'blue',
    },
    {
      id: '3',
      title: '1학기 수업 자료',
      uploadDate: '2024.10.15',
      label: 'red',
    },
    { id: '4', title: '어휘 프린트', uploadDate: '2024.09.30' },
  ];

  const [materials, setMaterials] = useState<Material[]>(defaultMaterials);

  // 마운트 시 저장된 자료 복원
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Material[];
        setMaterials(parsed);
        return;
      } catch {}
    }
    // 저장된 게 없다면 기본값을 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMaterials));
  }, [STORAGE_KEY]);

  // materials 변경 시 자동 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(materials));
  }, [STORAGE_KEY, materials]);

  const students: Student[] = [
    {
      id: '1',
      name: '정민수',
      grade: '3학년 1반',
      avatarUrl: maleImg,
      progressRate: 95,
    },
    {
      id: '2',
      name: '이서연',
      grade: '3학년 1반',
      avatarUrl: femaleImg,
      progressRate: 92,
    },
    {
      id: '3',
      name: '최유진',
      grade: '3학년 1반',
      avatarUrl: femaleImg,
      progressRate: 88,
    },
    {
      id: '4',
      name: '김민준',
      grade: '3학년 1반',
      avatarUrl: maleImg,
      progressRate: 85,
    },
    {
      id: '5',
      name: '강서윤',
      grade: '3학년 1반',
      avatarUrl: femaleImg,
      progressRate: 80,
    },
    {
      id: '6',
      name: '정성우',
      grade: '3학년 1반',
      avatarUrl: maleImg,
      progressRate: 72,
    },
  ];

  /* ===== 메모(반별 로컬 저장) ===== */
  const MEMO_KEY = `classroom_memo_${classroomId}`;
  const [memo, setMemo] = useState('');
  useEffect(() => {
    const saved = localStorage.getItem(MEMO_KEY);
    if (saved != null) setMemo(saved);
  }, [MEMO_KEY]);
  useEffect(() => {
    localStorage.setItem(MEMO_KEY, memo);
  }, [MEMO_KEY, memo]);

  const latestUpdate = useMemo(() => {
    if (!materials.length) return '-';
    return materials
      .map((m) => m.uploadDate)
      .sort()
      .reverse()[0];
  }, [materials]);

  /* ===== 자료 검색/정렬/라벨 필터 ===== */
  const [matQuery, setMatQuery] = useState('');
  const [matSort, setMatSort] = useState<'new' | 'old'>('new');
  const [activeLabels, setActiveLabels] = useState<LabelId[]>([]);

  const toggleLabel = (id: LabelId) => {
    setActiveLabels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const clearLabels = () => setActiveLabels([]);

  const filteredMaterials = useMemo(() => {
    const q = matQuery.trim().toLowerCase();
    let list = materials.filter((m) =>
      q ? m.title.toLowerCase().includes(q) : true,
    );
    if (activeLabels.length)
      list = list.filter((m) => m.label && activeLabels.includes(m.label));
    list.sort((a, b) =>
      matSort === 'new'
        ? parseDate(b.uploadDate).getTime() - parseDate(a.uploadDate).getTime()
        : parseDate(a.uploadDate).getTime() - parseDate(b.uploadDate).getTime(),
    );
    return list;
  }, [materials, matQuery, matSort, activeLabels]);

  // 라벨 변경
  const handleLabelMaterial = (materialId: string, currentLabel?: LabelId) => {
    let picked: LabelId | undefined = currentLabel;

    Swal.fire({
      title: '라벨 선택',
      html: `
        <div class="ae-label-grid" id="labelGrid">
          ${LABEL_OPTIONS.map(
            (label) => `
            <button 
              class="ae-label-option ${picked === label.id ? 'active' : ''}" 
              data-label="${label.id}"
              style="background-color: ${label.color}; ${picked === label.id ? `border: 3px solid  ${label.color};` : ''}" 
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
            const id = btn.getAttribute('data-label') as LabelId | null;
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
          picked = (target.getAttribute('data-label') as LabelId) || undefined;
          render();
        });
      },

      preConfirm: () => picked,
    }).then((result) => {
      if (!result.isConfirmed) return;
      const value = result.value as LabelId | undefined;

      setMaterials((prev) =>
        prev.map((mat) =>
          mat.id === materialId ? { ...mat, label: value } : mat,
        ),
      );
      // 저장은 위의 useEffect가 자동 수행
    });
  };

  /* ===== 삭제 ===== */
  const handleDeleteMaterial = (id: string) => {
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
    }).then((res) => {
      if (res.isConfirmed) {
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        Swal.fire({
          icon: 'success',
          title: '삭제되었습니다',
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  /* ===== 학생 검색/정렬 ===== */
  const [stuQuery, setStuQuery] = useState('');
  const [stuSort, setStuSort] = useState<'progress' | 'name'>('progress');
  const filteredStudents = useMemo(() => {
    const q = stuQuery.trim().toLowerCase();
    let list = students.filter((s) =>
      q ? (s.name + ' ' + s.grade).toLowerCase().includes(q) : true,
    );
    list.sort((a, b) =>
      stuSort === 'progress'
        ? b.progressRate - a.progressRate
        : a.name.localeCompare(b.name, 'ko'),
    );
    return list;
  }, [students, stuQuery, stuSort]);

  /* ===== UI ===== */
  return (
    <div className="cl-root cl-root--no-page-scroll classroom-page">
      {/* 헤더 */}
      <header className="cl-header">
        <div className="cl-header-wrapper">
          <h1 className="cl-header-title">DO:DREAM</h1>

          <div className="cl-header-button">
            <button
              type="button"
              className="cl-logout-button"
              onClick={() => navigate('/')}
              title="목록으로"
            >
              <ArrowLeft size={18} />
              <span>목록으로</span>
            </button>
          </div>
        </div>
      </header>

      {/* 사이드 패널 */}
      <aside className="cl-sidebar">
        <div className="cl-sidebar-content">
          <div className="cl-profile-mini">
            <img
              className="cl-profile-avatar-mini"
              src={teacherAvatar}
              alt="담임"
            />
            <h2 className="cl-profile-name-mini">김싸피</h2>
            <p className="cl-profile-email-mini">teacher@school.com</p>
            <p className="cl-profile-label-mini">3학년 1반 · 국어</p>
          </div>

          <div className="cl-sidebar-divider" />

          {/* 메모장 (하단 고정) */}
          <div className="cl-memo">
            <div className="cl-memo-stage">
              <div className="cl-memo-zoom">
                <div className="cl-memo-header">
                  <div className="cl-memo-latest" title="오늘 날짜">
                    <span>Today : {formatKST(new Date())}</span>
                  </div>
                </div>

                {/* 이미지 안의 ‘종이 영역’에 정확히 겹치는 입력 박스 */}
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

      {/* 메인: 두 열, 내부 스크롤 */}
      <main className="cl-main-fixed">
        <div className="cl-two-columns">
          {/* ── 자료 열 */}
          <section className="cl-card">
            <div className="cl-card-head">
              <div className="cl-head-left">
                <h3>공유된 학습 자료</h3>
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
                  onClick={() =>
                    setMatSort((s) => (s === 'new' ? 'old' : 'new'))
                  }
                >
                  {matSort === 'new' ? (
                    <SortDesc size={16} />
                  ) : (
                    <SortAsc size={16} />
                  )}
                  <span>{matSort === 'new' ? '최신 순' : '오래된 순'}</span>
                </button>
              </div>
            </div>

            {/* 라벨 필터 칩 */}
            <div className="cl-filter-chips">
              {LABEL_OPTIONS.map((l) => (
                <button
                  key={l.id}
                  className={`cl-chip ${activeLabels.includes(l.id as LabelId) ? 'active' : ''}`}
                  style={{ '--chip-color': l.color } as React.CSSProperties}
                  onClick={() => toggleLabel(l.id as LabelId)}
                >
                  {l.name}
                </button>
              ))}
              <button className="cl-chip reset" onClick={clearLabels}>
                초기화
              </button>
            </div>

            {/* 내부 스크롤 영역 + gap 적용 래퍼 */}
            <div className="cl-section-scroll">
              <div className="cl-materials-list">
                {filteredMaterials.map((m) => (
                  <div key={m.id} className="cl-material-item">
                    {m.label && (
                      <div
                        className="cl-material-label-bar"
                        style={{ backgroundColor: getLabelColor(m.label) }}
                      />
                    )}
                    <div className="cl-material-icon">
                      <FileText size={18} />
                    </div>
                    <div className="cl-material-info">
                      <h3 className="cl-material-title">{m.title}</h3>
                      <div className="cl-material-meta">
                        <span className="cl-material-date">{m.uploadDate}</span>
                      </div>
                    </div>
                    <div className="cl-material-actions">
                      <button
                        className="cl-material-action-btn label-btn"
                        title="라벨 편집"
                        onClick={() => handleLabelMaterial(m.id, m.label)}
                      >
                        <Tag size={16} />
                      </button>
                      <button
                        className="cl-material-action-btn delete-btn"
                        title="삭제"
                        onClick={() => handleDeleteMaterial(m.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 학생 열 */}
          <section className="cl-card">
            <div className="cl-card-head">
              <div className="cl-head-left">
                <h3>학생 관리 ({filteredStudents.length}명)</h3>
              </div>
              <div className="cl-head-right">
                <div className="cl-input-wrap cl-control">
                  <Search size={16} />
                  <input
                    className="cl-input"
                    placeholder="이름 또는 학년/반 검색"
                    value={stuQuery}
                    onChange={(e) => setStuQuery(e.target.value)}
                  />
                </div>
                <button
                  className="cl-sort-btn cl-control"
                  onClick={() =>
                    setStuSort((s) => (s === 'progress' ? 'name' : 'progress'))
                  }
                >
                  {stuSort === 'progress' ? (
                    <SortDesc size={16} />
                  ) : (
                    <SortAsc size={16} />
                  )}
                  <span>{stuSort === 'progress' ? '진행률순' : '이름순'}</span>
                </button>
              </div>
            </div>

            <div className="cl-section-scroll cl-students-grid">
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className="cl-student-card"
                  onClick={() => navigate(`/student/${s.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="cl-student-top">
                    <img
                      className="cl-student-avatar"
                      src={s.avatarUrl}
                      alt={s.name}
                    />
                    <div className="cl-student-info">
                      <h4>{s.name}</h4>
                      <p>{s.grade}</p>
                    </div>
                  </div>
                  <div className="cl-progress">
                    <div className="cl-progress-bar">
                      <div
                        className="cl-progress-fill"
                        style={{ width: `${s.progressRate}%` }}
                      />
                    </div>
                    <span className="cl-progress-text">{s.progressRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
