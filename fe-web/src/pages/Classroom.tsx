import { useNavigate } from 'react-router-dom';
import { User, FolderOpen, ChevronRight, BookOpen, FileText, Image, Video, LogOut } from 'lucide-react';
import './Classroom.css';

type Student = {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  progressRate: number;
};

type Material = {
  id: string;
  title: string;
  type: 'document' | 'image' | 'video';
  uploadDate: string;
};

export default function Classroom() {
  const navigate = useNavigate();

  const teacher = {
    name: '김싸피',
    subject: '국어',
    email: 'teacher@school.com',
    avatar: '👩🏻‍🏫'
  };

  const students: Student[] = [
    { id: '1', name: '김민준', grade: '3학년 1반', avatar: '👦🏻', progressRate: 85 },
    { id: '2', name: '이서연', grade: '3학년 1반', avatar: '👧🏻', progressRate: 92 },
    { id: '3', name: '박지호', grade: '3학년 2반', avatar: '👦🏻', progressRate: 78 },
    { id: '4', name: '최유진', grade: '3학년 2반', avatar: '👧🏻', progressRate: 88 },
    { id: '5', name: '정민수', grade: '3학년 3반', avatar: '👦🏻', progressRate: 95 },
    { id: '6', name: '강서윤', grade: '3학년 3반', avatar: '👧🏻', progressRate: 81 }
  ];

  const materials: Material[] = [
    { id: '1', title: '1학기 수업 자료', type: 'document', uploadDate: '2024.03.15' },
    { id: '2', title: '학습 참고 영상', type: 'video', uploadDate: '2024.03.20' },
    { id: '3', title: '과제 안내서', type: 'document', uploadDate: '2024.04.01' }
  ];

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={24} />;
      case 'image':
        return <Image size={24} />;
      case 'video':
        return <Video size={24} />;
      default:
        return <FileText size={24} />;
    }
  };

  const handleStudentClick = (studentId: string) => {
    navigate(`/studentroom/${studentId}`);
  };

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="cr-container">
      {/* Header */}
      <header className="cr-header">
        <div className="cr-header-content">
          <h1 className="cr-title">서울싸피맹학교</h1>
          <button className="cr-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="cr-main">
        {/* Teacher Profile Section */}
        <section className="cr-profile-card">
          <div className="cr-profile-header">
            <div className="cr-profile-avatar">{teacher.avatar}</div>
            <div className="cr-profile-info">
              <h2 className="cr-teacher-name">{teacher.name} 선생님</h2>
              <p className="cr-subject">{teacher.subject} 담당</p>
              <p className="cr-email">{teacher.email}</p>
            </div>
          </div>
          <div className="cr-student-badge">
            <p className="cr-badge-number">{students.length}</p>
            <p className="cr-badge-label">담당 학생</p>
          </div>
        </section>

        {/* Materials Section */}
        <section className="cr-materials-card">
          <div className="cr-section-header">
            <div className="cr-section-icon-wrapper">
              <FolderOpen size={20} />
            </div>
            <h3 className="cr-section-title">자료함</h3>
          </div>
          <div className="cr-materials-grid">
            {materials.map((material) => (
              <div key={material.id} className="cr-material-item">
                <div className="cr-material-icon-box">
                  {getMaterialIcon(material.type)}
                </div>
                <div className="cr-material-content">
                  <h4 className="cr-material-title">{material.title}</h4>
                  <p className="cr-material-date">{material.uploadDate}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Students Section */}
        <section className="cr-students-card">
          <div className="cr-section-header">
            <div className="cr-section-icon-wrapper">
              <User size={20} />
            </div>
            <h3 className="cr-section-title">학생 목록</h3>
          </div>
          <div className="cr-students-grid">
            {students.map((student) => (
              <div
                key={student.id}
                className="cr-student-item"
                onClick={() => handleStudentClick(student.id)}
              >
                <div className="cr-student-top">
                  <div className="cr-student-info">
                    <div className="cr-student-avatar">{student.avatar}</div>
                    <div>
                      <h4 className="cr-student-name">{student.name}</h4>
                      <p className="cr-student-grade">{student.grade}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="cr-chevron" />
                </div>

                <div className="cr-progress-container">
                  <div className="cr-progress-top">
                    <span className="cr-progress-label">학습 진도</span>
                    <span className="cr-progress-value">{student.progressRate}%</span>
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
        </section>
      </main>
    </div>
  );
}