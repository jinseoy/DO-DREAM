import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  User,
  FolderOpen,
  FileText,
  LogOut,
  Plus,
  Send,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import MaterialSendModal from '@/component/MaterialSendModal';
import './Classroom.css';
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

type Material = {
  id: string;
  title: string;
  uploadDate: string;
  content: string;
};

type ClassroomProps = {
  onNavigateToEditor: (extractedText: string) => void;
  classroomId?: string;
};

export default function Classroom({ onNavigateToEditor, classroomId: propClassroomId }: ClassroomProps) {
  const { classroomId: urlClassroomId } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const classroomId = urlClassroomId || propClassroomId || '1';

  const [materials, setMaterials] = useState<Material[]>([
    {
      id: '1',
      title: '1학기 수업 자료',
      uploadDate: '2024.03.15',
      content: '첫 번째 자료의 내용입니다.',
    },
    {
      id: '2',
      title: '학습 참고 자료',
      uploadDate: '2024.03.20',
      content: '학습 참고 자료의 내용입니다.',
    },
    {
      id: '1',
      title: '1학기 수업 자료',
      uploadDate: '2024.03.15',
      content: '첫 번째 자료의 내용입니다.',
    },
    {
      id: '2',
      title: '학습 참고 자료',
      uploadDate: '2024.03.20',
      content: '학습 참고 자료의 내용입니다.',
    },
    {
      id: '1',
      title: '1학기 수업 자료',
      uploadDate: '2024.03.15',
      content: '첫 번째 자료의 내용입니다.',
    },
    {
      id: '2',
      title: '학습 참고 자료',
      uploadDate: '2024.03.20',
      content: '학습 참고 자료의 내용입니다.',
    },
    {
      id: '1',
      title: '1학기 수업 자료',
      uploadDate: '2024.03.15',
      content: '첫 번째 자료의 내용입니다.',
    },
    {
      id: '2',
      title: '학습 참고 자료',
      uploadDate: '2024.03.20',
      content: '학습 참고 자료의 내용입니다.',
    },
  ]);

  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedMaterialForSend, setSelectedMaterialForSend] =
    useState<Material | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // classroomId에 따른 반 정보
  const classroomInfo: Record<string, { grade: string; class: string; subject: string }> = {
    '1': { grade: '3학년', class: '1반', subject: '국어' },
    '2': { grade: '3학년', class: '2반', subject: '수학' },
    '3': { grade: '2학년', class: '1반', subject: '영어' },
    '4': { grade: '2학년', class: '3반', subject: '과학' },
  };

  const currentClassroom = classroomInfo[classroomId] || classroomInfo['1'];

  const teacher = {
    name: '김싸피',
    email: 'teacher@school.com',
  };

  const students: Student[] = [
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
  ];

  const handleCreateMaterial = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await Swal.fire({
      title: '텍스트 추출 중입니다',
      html: '<div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;"><div style="width: 50px; height: 50px; border: 4px solid #192b55; border-top: 4px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div><p style="color: #374151; font-size: 18px;">파일을 처리하는 중입니다...</p></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const mockExtractedText = `이것은 "${file.name}"에서 추출된 샘플 텍스트입니다.

여기에 파일에서 추출된 실제 내용이 들어갈 예정입니다.
지금은 UI 흐름을 보여주기 위한 샘플 텍스트입니다.

나중에 실제 API를 연결하면 PDF, PPT, Word 문서, TXT 파일에서 텍스트를 추출할 수 있습니다.

학생들에게 더 나은 학습 경험을 제공하기 위해 다양한 형식의 자료를 지원합니다.`;

        await Swal.close();
        onNavigateToEditor(mockExtractedText);
      },
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePublishMaterial = (title: string, content: string) => {
    const newMaterial: Material = {
      id: String(materials.length + 1),
      title,
      uploadDate: new Date().toLocaleDateString('ko-KR'),
      content,
    };

    setMaterials((prev) => [newMaterial, ...prev]);

    Swal.fire({
      icon: 'success',
      title: '자료 발행 완료!',
      text: `"${title}"이(가) 자료함에 추가되었습니다.`,
      confirmButtonColor: '#192b55',
      confirmButtonText: '확인',
    });
  };

  const handleSendMaterial = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setSelectedMaterialForSend(material);
      setShowSendModal(true);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    Swal.fire({
      title: '자료를 삭제하시겠습니까?',
      text: '이 작업은 되돌릴 수 없습니다',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
        Swal.fire({
          icon: 'success',
          title: '자료가 삭제되었습니다',
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  const handleConfirmSend = (studentIds: string[]) => {
  const studentNames = students
    .filter((s) => studentIds.includes(s.id))
    .map((s) => s.name);

  Swal.fire({
    icon: 'success',
    title: '자료 전송 완료!',
    html: `
      <div class="cr-swal-body">
        <p class="cr-swal-material">"${selectedMaterialForSend?.title}"</p>
        <p class="cr-swal-names">${studentNames.join(', ')}</p>
        <p class="cr-swal-count">${studentNames.length}명에게 전송되었습니다</p>
      </div>
    `,
    confirmButtonColor: '#192b55',
    confirmButtonText: '확인',
    customClass: {
      popup: 'cr-swal',            // 팝업 전체
      title: 'cr-swal-title',      // 타이틀
      confirmButton: 'cr-swal-confirm', // 확인 버튼
    },
    }).then(() => {
      setShowSendModal(false);
      setSelectedMaterialForSend(null);
    });
  };


  const handleOpenStudent = (studentId: string) => {
    navigate(`/student/${studentId}`);
  };

  const handleLogout = () => {
    Swal.fire({
      icon: 'question',
      title: '로그아웃하시겠습니까?',
      showCancelButton: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '로그아웃',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: '로그아웃되었습니다',
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  useEffect(() => {
    const handleMaterialPublished = (event: any) => {
      handlePublishMaterial(event.detail.title, event.detail.content);
    };

    window.addEventListener('materialPublished', handleMaterialPublished);
    return () =>
      window.removeEventListener('materialPublished', handleMaterialPublished);
  }, [materials]);

  return (
    <div className="cr-root">
      <header className="cr-header">
        <div className="cr-header-wrapper">
          <h1 className="cr-header-title">DO:DREAM</h1>
          <div className="cr-header-spacer" />
          <button className="cr-back-to-classrooms" onClick={() => navigate('/classrooms')}>
            <ArrowLeft size={18} />
            <span>돌아가기</span>
          </button>
          <button className="cr-logout-button" onClick={handleLogout}>
            <LogOut size={18} />
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      <div className="cr-container">
        {/* Top Section - Classroom Info */}
        <div className="cr-info-section">
          <div className="cr-info-card">
            <div className="cr-info-group">
              <h2 className="cr-info-title">{currentClassroom.grade} {currentClassroom.class}</h2>
            </div>
            <div className="cr-info-divider" />
            <div className="cr-info-group">
              <p className="cr-info-label">담당 선생님</p>
              <h3 className="cr-info-teacher">{teacher.name}</h3>
            </div>
            <div className="cr-info-divider" />
            <div className="cr-info-group">
              <p className="cr-info-label">담당 과목</p>
              <h3 className="cr-info-teacher">{currentClassroom.subject}</h3>
            </div>
            <div className="cr-info-divider" />
            <div className="cr-info-group">
              <p className="cr-info-label">전체 학생</p>
              <h3 className="cr-info-count">{students.length}명</h3>
            </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="cr-main-section">
          {/* Left - Materials */}
          <div className="cr-materials-container">
            <div className="cr-section">
              <div className="cr-section-header">
                <div className="cr-section-title">
                  <FolderOpen size={20} />
                  <h3>자료함</h3>
                </div>
                <button className="cr-create-btn" onClick={handleCreateMaterial}>
                  <Plus size={20} />
                  <span className="make-file">자료 만들기</span>
                </button>
              </div>

              {/* ✅ 내부 스크롤 + 스크롤바 숨김 */}
              <div className="cr-materials-list cr-scroll-y">
                {materials.length === 0 ? (
                  <div className="cr-empty-state">
                    <FolderOpen size={48} />
                    <p>아직 자료가 없습니다</p>
                    <p className="cr-empty-hint">
                      자료 만들기 버튼을 눌러 새로운 자료를 추가하세요
                    </p>
                  </div>
                ) : (
                  materials.map((material) => (
                    <div key={material.id} className="cr-material-card">
                      <div className="cr-material-icon">
                        <FileText size={20} />
                      </div>
                      <div className="cr-material-info">
                        <h4>{material.title}</h4>
                        <span>{material.uploadDate}</span>
                      </div>
                      <div className="cr-material-actions">
                        <button
                          className="cr-action-btn"
                          onClick={() => handleSendMaterial(material.id)}
                          title="자료 전송"
                        >
                          <Send size={16} />
                        </button>
                        <button
                          className="cr-action-btn delete"
                          onClick={() => handleDeleteMaterial(material.id)}
                          title="자료 삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right - Students */}
          <div className="cr-students-container">
            <div className="cr-section">
              <div className="cr-section-title">
                <User size={20} />
                <h3>학생 관리 ({students.length}명)</h3>
              </div>

              {/* ✅ 내부 스크롤 + 스크롤바 숨김 */}
              <div className="cr-students-scroll cr-scroll-y">
                <div className="cr-students-list">
                  {students.map((student) => (
                    <div key={student.id} className="cr-student-card" onClick={() => handleOpenStudent(student.id)}>
                      <div className="cr-student-header">
                        {student.avatarUrl ? (
                          <img
                            className="cr-student-avatar-img"
                            src={student.avatarUrl}
                            alt={`${student.name} 아바타`}
                          />
                        ) : (
                          <div className="cr-student-avatar">{student.avatar}</div>
                        )}

                        <div className="cr-student-info">
                          <h4>{student.name}</h4>
                          <p>{student.grade}</p>
                        </div>
                      </div>
                      <div className="cr-student-progress">
                        <div className="cr-progress-header">
                          <span className="cr-progress-label">현재 학습 진행률</span>
                          <span className="cr-progress-percent">{student.progressRate}%</span>
                        </div>
                        <div className="cr-progress-bar">
                          <div
                            className="cr-progress-fill"
                            style={{ width: `${student.progressRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* ✅ 끝 */}
            </div>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {showSendModal && selectedMaterialForSend && (
        <MaterialSendModal
          students={students}
          selectedMaterial={selectedMaterialForSend}
          onClose={() => {
            setShowSendModal(false);
            setSelectedMaterialForSend(null);
          }}
          onSend={handleConfirmSend}
        />
      )}
    </div>
  );
}
