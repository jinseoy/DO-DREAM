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
import { useState } from 'react';
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
  uploadDate: string;
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
  { id: 'green', color: '#22c55e', name: '초록' },
  { id: 'blue', color: '#3b82f6', name: '파랑' },
  { id: 'purple', color: '#a855f7', name: '보라' },
  { id: 'gray', color: '#9ca3af', name: '회색' },
];

// 반별 학생 데이터 (gender 추가)
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

export default function ClassroomList({
  onLogout,
  onNavigateToEditor,
}: ClassroomListProps) {
  const navigate = useNavigate();
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
      title: '새로운 자료 (작성중)',
      uploadDate: '2024.10.10',
      label: undefined,
      status: 'draft',
    },
  ]);

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

  const handleCreateMaterial = () => {
    if (onNavigateToEditor) onNavigateToEditor();
    else navigate('/editor');
  };

  const getLabelColor = (label?: string) => {
    const labelObj = LABEL_OPTIONS.find((l) => l.id === label);
    return labelObj?.color || 'transparent';
  };

  // 라벨 변경(저장 후 별도 알림 없음)
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
            (e.target as HTMLElement).classList.add('active');
            selectedLabel =
              (e.target as HTMLElement).getAttribute('data-label') || undefined;

            buttons.forEach((b) => {
              if (b.getAttribute('data-label') === selectedLabel) {
                (b as HTMLElement).innerHTML = '✓';
              } else {
                (b as HTMLElement).innerHTML = '';
              }
            });
          });
        });
      },
      preConfirm: () => selectedLabel,
    }).then((result) => {
      if (result.isConfirmed && result.value !== undefined) {
        setMaterials((prev) =>
          prev.map((mat) =>
            mat.id === materialId ? { ...mat, label: result.value } : mat,
          ),
        );
      }
    });
  };

  // 전송 모달 열기
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

  const handleLogout = () => {
    Swal.fire({
      icon: 'question',
      title: '로그아웃 하시겠습니까?',
      showCancelButton: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      reverseButtons: true,
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: '로그아웃 되었습니다',
          confirmButtonColor: '#192b55',
        }).then(() => {
          onLogout();
        });
      }
    });
  };

  return (
    <div className="cl-root">
      <header className="cl-header">
        <div className="cl-header-wrapper">
          <h1 className="cl-header-title">DO:DREAM</h1>
          <button className="cl-logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>로그아웃</span>
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

            <div className="cl-stat-mini">
              <div className="cl-stat-item-mini">
                <p className="cl-stat-value-mini">{classrooms.length}</p>
                <p className="cl-stat-label-mini">개 반 담당</p>
              </div>
            </div>
          </div>
        </aside>

        <main className="cl-main-content">
          {/* 반 목록 */}
          <div className="cl-classrooms-section">
            <div className="cl-section-header">
              <h2 className="cl-section-title">담당 반 선택</h2>
              <p className="cl-section-subtitle">
                자료를 관리할 반을 선택해주세요
              </p>
            </div>

            <div className="cl-classrooms-grid">
              {classrooms.map((classroom) => (
                <div
                  key={classroom.id}
                  className="cl-classroom-card"
                  onClick={() => handleSelectClassroom(classroom.id)}
                >
                  <div className="cl-classroom-header">
                    {/* <div
                      className="cl-classroom-color-badge"
                      style={{ backgroundColor: classroom.color }}
                    /> */}
                    <div className="cl-classroom-title">
                      <h3>{classroom.grade}</h3>
                      <p>{classroom.class}</p>
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
              <div className="cl-section-header">
                <h2 className="cl-section-title">내 자료</h2>
                <p className="cl-section-subtitle">
                  생성하거나 공유한 자료들을 관리하세요
                </p>
              </div>

              {/* ▼ 설명 박스(왼쪽) + 버튼(오른쪽)을 같은 행으로 */}
              <div className="cl-cta-row">
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
                        className="cl-material-label-dot"
                        style={{
                          backgroundColor: getLabelColor(material.label),
                        }}
                        title={
                          LABEL_OPTIONS.find((l) => l.id === material.label)
                            ?.name
                        }
                      />
                    )}
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
                  <p style="margin:0 0 6px 0;color:#374151;"><strong>공유할 반</strong> ${classroomIds
                    .map((id) => {
                      const c = classrooms.find((cc) => cc.id === id);
                      return c ? `${c.grade} ${c.class}` : id;
                    })
                    .join(', ')}</p>
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
