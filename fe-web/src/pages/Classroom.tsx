// src/pages/Classroom.tsx
import type React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  ArrowLeft,
  FileText,
  Search,
  SortDesc,
  SortAsc,
  Tag,
} from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { useGlobalMemo } from '@/contexts/MemoContext';
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
  pdfId?: number;
};

type Student = {
  id: string;
  name: string;
  grade: string;
  avatarUrl?: string;
  progressRate: number;
  isEmpty?: boolean;
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

type ClassStudentsDto = {
  classroomId: number;
  year: number;
  gradeLevel: number;
  classNumber: number;
  displayName: string;
  schoolName: string | null;
  totalCount: number;
  students: {
    studentId: number;
    studentName: string;
    studentNumber: string;
    gender?: 'MALE' | 'FEMALE';
  }[];
};

type SharedMaterialItemDto = {
  shareId: number;
  materialId: number;
  materialTitle: string;
  teacherId: number;
  teacherName: string;
  labelColor:
    | 'RED'
    | 'ORANGE'
    | 'YELLOW'
    | 'GREEN'
    | 'BLUE'
    | 'PURPLE'
    | 'GRAY'
    | null;
  sharedAt: string;
  accessedAt: string | null;
  accessed: boolean;
  pdfId?: number;
};

type SharedStudentMaterialsDto = {
  studentId: number;
  studentName: string;
  totalCount: number;
  materials: SharedMaterialItemDto[];
};

type MaterialProgressItem = {
  studentId: number;
  studentName: string;
  materialId: number;
  materialTitle: string;
  totalChapters: number;
  completedChapters: number;
  totalSections: number;
  completedSections: number;
  overallProgressPercentage: number;
  currentChapterNumber: number;
  currentChapterTitle: string;
  lastAccessedAt: string | null;
  completedAt: string | null;
  chapterProgress: {
    chapterId: string;
    chapterTitle: string;
    chapterType: string;
    totalSections: number;
    completedSections: number;
    progressPercentage: number;
  }[];
};

type StudentProgressResponse = {
  success: boolean;
  code: string;
  message: string;
  data: MaterialProgressItem[];
};

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

// 빈 카드 채우기 함수
const getFilledStudents = (students: Student[]) => {
  const minCards = 6; // 최소 6개 카드 표시
  if (students.length >= minCards) return students;

  const fillCount = minCards - students.length;
  const emptyCards = Array(fillCount)
    .fill(null)
    .map((_, i) => ({
      id: `empty-${i}`,
      name: '',
      grade: '',
      avatarUrl: '',
      progressRate: 0,
      isEmpty: true,
    }));

  return [...students, ...emptyCards];
};

export default function Classroom() {
  const { classroomId = '1' } = useParams<{ classroomId: string }>();
  const navigate = useNavigate();
  const { memo, setMemo } = useGlobalMemo();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classLabel, setClassLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!API_BASE || !classroomId) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const accessToken = localStorage.getItem('accessToken');
        const headers: HeadersInit = {
          accept: '*/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        // 1) 학생 목록
        const classRes = await fetch(
          `${API_BASE}/api/classes/${classroomId}/students`,
          { method: 'GET', headers, credentials: 'include' },
        );

        if (!classRes.ok) {
          throw new Error(`학생 목록 조회 실패 (status: ${classRes.status})`);
        }

        const classJson = (await classRes.json()) as ClassStudentsDto;
        const baseStudents = classJson.students ?? [];
        const classLabelText = `${classJson.gradeLevel}학년 ${classJson.classNumber}반`;
        setClassLabel(classLabelText);

        // 2) 공유 자료 (classroomId 기준)
        const sharedRes = await fetch(
          `${API_BASE}/api/materials/shared/class/${classroomId}`,
          { method: 'GET', headers, credentials: 'include' },
        );

        let sharedByStudent: SharedStudentMaterialsDto[] = [];

        if (sharedRes.ok) {
          const raw = await sharedRes.json();

          // Swagger 스타일 응답: { success, code, message, data: [...] } 처리
          const payload =
            raw && typeof raw === 'object' && 'data' in raw
              ? (raw as any).data
              : raw;

          if (Array.isArray(payload)) {
            // data가 배열인 케이스
            sharedByStudent = payload as SharedStudentMaterialsDto[];
          } else if (
            payload &&
            typeof payload === 'object' &&
            Array.isArray((payload as any).materials)
          ) {
            // data가 단일 객체 + 그 안에 materials 배열인 케이스
            sharedByStudent = [payload as SharedStudentMaterialsDto];
          }
        }

        // 자료 목록 생성
        type MatAgg = { mat: Material; date: Date };
        const matMap = new Map<number, MatAgg>();

        for (const entry of sharedByStudent) {
          for (const m of entry.materials ?? []) {
            const sharedDate = m.sharedAt ? new Date(m.sharedAt) : new Date(0);
            const existing = matMap.get(m.materialId);
            const labelLower = m.labelColor
              ? (m.labelColor.toLowerCase() as LabelId)
              : undefined;

            if (!existing) {
              matMap.set(m.materialId, {
                date: sharedDate,
                mat: {
                  id: String(m.materialId),
                  title: m.materialTitle,
                  uploadDate: formatKST(sharedDate),
                  label: labelLower,
                  pdfId: m.pdfId,
                },
              });
            } else if (sharedDate > existing.date) {
              matMap.set(m.materialId, {
                date: sharedDate,
                mat: {
                  ...existing.mat,
                  uploadDate: formatKST(sharedDate),
                  label: labelLower ?? existing.mat.label,
                  pdfId: m.pdfId ?? existing.mat.pdfId,
                },
              });
            }
          }
        }

        const newMaterials = Array.from(matMap.values())
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .map((v) => v.mat);

        // 라벨 색상 순서대로 정렬 (ClassroomList와 동일한 로직)
        const labelOrder = LABEL_OPTIONS.map((opt) => opt.id);

        newMaterials.sort((a, b) => {
          // 둘 다 라벨이 없으면 날짜 순
          if (!a.label && !b.label) {
            return (
              parseDate(b.uploadDate).getTime() -
              parseDate(a.uploadDate).getTime()
            );
          }
          // a만 라벨이 없으면 b가 앞으로
          if (!a.label) return 1;
          // b만 라벨이 없으면 a가 앞으로
          if (!b.label) return -1;

          // 둘 다 라벨이 있으면 라벨 순서대로
          const aIndex = labelOrder.indexOf(a.label);
          const bIndex = labelOrder.indexOf(b.label);

          // 같은 라벨이면 날짜 순
          if (aIndex === bIndex) {
            return (
              parseDate(b.uploadDate).getTime() -
              parseDate(a.uploadDate).getTime()
            );
          }

          return aIndex - bIndex;
        });

        setMaterials(newMaterials);

        // 학생 목록 생성
        const sharedMap = new Map<number, SharedStudentMaterialsDto>();
        for (const s of sharedByStudent) {
          sharedMap.set(s.studentId, s);
        }

        const sharedMaterialIds = new Set<number>(
          newMaterials.map((m) => Number(m.id)),
        );

        const progressMap = new Map<number, number>();

        await Promise.all(
          baseStudents.map(async (stu) => {
            try {
              const progressRes = await fetch(
                `${API_BASE}/api/progress/students/${stu.studentId}/all`,
                { method: 'GET', headers, credentials: 'include' },
              );

              if (!progressRes.ok) {
                console.warn(
                  `진행률 조회 실패 (studentId=${stu.studentId}, status=${progressRes.status})`,
                );
                progressMap.set(stu.studentId, 0);
                return;
              }

              const progressJson =
                (await progressRes.json()) as StudentProgressResponse;

              const items = Array.isArray(progressJson.data)
                ? progressJson.data
                : [];

              // 이 반에서 공유된 자료만 필터링 (없으면 전체 사용)
              let related = items;
              if (sharedMaterialIds.size) {
                related = items.filter((p) =>
                  sharedMaterialIds.has(p.materialId),
                );
              }

              if (!related.length) {
                progressMap.set(stu.studentId, 0);
                return;
              }

              // 평균 비율(0~1 or 0~100) → 퍼센트(0~100)
              const avgRaw =
                related.reduce(
                  (sum, p) => sum + (p.overallProgressPercentage ?? 0),
                  0,
                ) / related.length;

              const avgPercent = avgRaw <= 1 ? avgRaw * 100 : avgRaw;

              console.log('student', stu.studentName, 'avgPercent', avgPercent);

              progressMap.set(stu.studentId, Math.round(avgPercent));
            } catch (e) {
              console.error('진행률 API 오류', e);
              progressMap.set(stu.studentId, 0);
            }
          }),
        );

        // 최종 학생 리스트 (평균 진행률 사용)
        const finalStudents: Student[] = baseStudents.map((s, idx) => {
          const shareInfo = sharedMap.get(s.studentId);

          // 1순위: 진행률 API에서 계산한 평균 값
          let progress =
            progressMap.get(s.studentId) !== undefined
              ? progressMap.get(s.studentId)!
              : 0;

          // 혹시 진행률 API가 비어있다면, 기존 accessed 비율로 fallback
          if (progress === 0 && shareInfo) {
            const total =
              shareInfo.totalCount || shareInfo.materials?.length || 0;
            const accessed =
              shareInfo.materials?.filter((m) => m.accessed).length || 0;
            if (total > 0) {
              progress = Math.round((accessed / total) * 100);
            }
          }

          return {
            id: String(s.studentId),
            name: s.studentName,
            grade: classLabelText,
            avatarUrl: idx % 2 === 0 ? maleImg : femaleImg,
            progressRate: progress,
          };
        });

        setStudents(finalStudents);
      } catch (err: any) {
        console.error('데이터 로딩 실패', err);
        await Swal.fire({
          icon: 'error',
          title: '반 정보를 불러오지 못했습니다',
          text: err?.message ?? '잠시 후 다시 시도해 주세요.',
          confirmButtonColor: '#192b55',
        });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [classroomId]);

  const latestUpdate = useMemo(() => {
    if (!materials.length) return '-';
    return materials
      .map((m) => m.uploadDate)
      .sort()
      .reverse()[0];
  }, [materials]);

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

    // ✅ 라벨 순서를 고려한 정렬
    const labelOrder = LABEL_OPTIONS.map((opt) => opt.id);

    list.sort((a, b) => {
      // matSort가 'new'나 'old'일 때만 날짜 순으로 정렬
      // 기본은 라벨 순서

      // 둘 다 라벨이 없으면 날짜 순
      if (!a.label && !b.label) {
        return matSort === 'new'
          ? parseDate(b.uploadDate).getTime() -
              parseDate(a.uploadDate).getTime()
          : parseDate(a.uploadDate).getTime() -
              parseDate(b.uploadDate).getTime();
      }
      // a만 라벨이 없으면 b가 앞으로
      if (!a.label) return 1;
      // b만 라벨이 없으면 a가 앞으로
      if (!b.label) return -1;

      // 둘 다 라벨이 있으면 라벨 순서대로
      const aIndex = labelOrder.indexOf(a.label);
      const bIndex = labelOrder.indexOf(b.label);

      // 같은 라벨이면 날짜 순
      if (aIndex === bIndex) {
        return matSort === 'new'
          ? parseDate(b.uploadDate).getTime() -
              parseDate(a.uploadDate).getTime()
          : parseDate(a.uploadDate).getTime() -
              parseDate(b.uploadDate).getTime();
      }

      return aIndex - bIndex;
    });

    return list;
  }, [materials, matQuery, matSort, activeLabels]);

  const handleViewMaterial = async (materialId: string) => {
    try {
      const material = materials.find((m) => m.id === materialId);
      if (!material) {
        await Swal.fire({
          icon: 'error',
          title: '자료를 찾을 수 없습니다',
          confirmButtonColor: '#192b55',
        });
        return;
      }

      const pdfId = material.pdfId;

      if (!pdfId) {
        await Swal.fire({
          icon: 'error',
          title: '자료 정보가 부족합니다',
          text: '파일 ID를 찾을 수 없습니다.',
          confirmButtonColor: '#192b55',
        });
        return;
      }

      void Swal.fire({
        title: '자료를 불러오는 중입니다',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const accessToken = localStorage.getItem('accessToken');

      const pdfRes = await fetch(`${API_BASE}/api/pdf/${pdfId}/json`, {
        method: 'GET',
        headers: {
          accept: '*/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: 'include',
      });

      if (!pdfRes.ok) {
        const text = await pdfRes.text().catch(() => '');
        throw new Error(
          text || `자료 내용을 불러오지 못했습니다. (status: ${pdfRes.status})`,
        );
      }

      const parsedData = await pdfRes.json();
      console.log('📄 Classroom parsedData:', parsedData);

      // chapters 추출
      let chapters: any[] = [];
      if (parsedData.chapters && Array.isArray(parsedData.chapters)) {
        chapters = parsedData.chapters;
      } else if (
        parsedData.parsedData?.chapters &&
        Array.isArray(parsedData.parsedData.chapters)
      ) {
        chapters = parsedData.parsedData.chapters;
      } else if (
        parsedData.editedJson?.chapters &&
        Array.isArray(parsedData.editedJson.chapters)
      ) {
        chapters = parsedData.editedJson.chapters;
      } else if (
        parsedData.chapters &&
        typeof parsedData.chapters === 'object'
      ) {
        chapters = Object.values(parsedData.chapters);
      } else if (
        parsedData.parsedData?.chapters &&
        typeof parsedData.parsedData.chapters === 'object'
      ) {
        chapters = Object.values(parsedData.parsedData.chapters);
      } else if (
        parsedData.editedJson?.chapters &&
        typeof parsedData.editedJson.chapters === 'object'
      ) {
        chapters = Object.values(parsedData.editedJson.chapters);
      }

      let labelColor: string | undefined;
      if (parsedData.labelColor) {
        labelColor = parsedData.labelColor.toLowerCase();
      } else if (parsedData.label) {
        labelColor = parsedData.label.toLowerCase();
      } else if (material.label) {
        labelColor = material.label;
      }

      await Swal.close();

      if (!chapters || chapters.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: '내용이 없습니다',
          text: '이 자료에는 표시할 내용이 없습니다.',
          confirmButtonColor: '#192b55',
        });
        return;
      }

      navigate('/editor', {
        state: {
          fileName: material.title,
          chapters,
          pdfId,
          materialId,
          mode: 'edit',
          from: 'classroom',
          initialLabel: labelColor,
        },
      });
    } catch (err: any) {
      console.error('자료 조회 실패', err);
      await Swal.close();
      await Swal.fire({
        icon: 'error',
        title: '자료를 불러올 수 없습니다',
        text: err?.message ?? '잠시 후 다시 시도해 주세요.',
        confirmButtonColor: '#192b55',
      });
    }
  };

  const handleLabelMaterial = async (
    materialId: string,
    currentLabel?: LabelId,
  ) => {
    let picked: LabelId | undefined = currentLabel;

    const result = await Swal.fire({
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
    });

    if (!result.isConfirmed) return;

    const selectedLabel = result.value as LabelId | undefined;

    // API 호출
    try {
      void Swal.fire({
        title: '라벨을 저장하는 중입니다',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        accept: '*/*',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      const res = await fetch(`${API_BASE}/api/documents/label`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          materialId: Number(materialId),
          label: selectedLabel ? selectedLabel.toUpperCase() : 'RED',
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          text || `라벨 수정에 실패했습니다. (status: ${res.status})`,
        );
      }

      await Swal.close();

      // 로컬 state 업데이트
      setMaterials((prev) =>
        prev.map((mat) =>
          mat.id === materialId ? { ...mat, label: selectedLabel } : mat,
        ),
      );

      await Swal.fire({
        icon: 'success',
        title: '라벨이 저장되었습니다',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      console.error('라벨 수정 실패', err);
      await Swal.close();
      await Swal.fire({
        icon: 'error',
        title: '라벨 저장에 실패했습니다',
        text: err?.message ?? '잠시 후 다시 시도해 주세요.',
        confirmButtonColor: '#192b55',
      });
    }
  };

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

  const handleStudentClick = (student: Student) => {
    navigate(`/student/${student.id}`, {
      state: {
        student: {
          id: student.id,
          name: student.name,
          grade: student.grade,
          avatarUrl: student.avatarUrl,
          progressRate: student.progressRate,
        },
        classroomId: classroomId,
        classLabel: classLabel,
      },
    });
  };

  return (
    <div className="cl-root cl-root--no-page-scroll classroom-page">
      <header className="cl-header">
        <div className="cl-header-wrapper">
          <h1
            className="cl-header-title cl-header-title--clickable"
            onClick={() => navigate('/classrooms')}
          >
            DO:DREAM
          </h1>
          <div className="cl-header-button">
            <button
              type="button"
              className="cl-logout-button"
              onClick={() => navigate('/classrooms')}
              title="목록으로"
            >
              <ArrowLeft size={18} />
              <span>목록으로</span>
            </button>
          </div>
        </div>
      </header>

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
            <p className="cl-profile-label-mini">
              {classLabel ? `${classLabel}` : '담당 반 정보 없음'}
            </p>
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

      <main className="cl-main-fixed">
        <div className="cl-two-columns">
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

            <div className="cl-section-scroll">
              <div className="cl-materials-list">
                {isLoading && !materials.length ? (
                  <p className="cl-empty-hint">불러오는 중입니다…</p>
                ) : !materials.length ? (
                  <div className="cl-empty-materials">
                    <FileText size={48} />
                    <p>공유된 자료가 없습니다</p>
                    <p className="cl-empty-hint">
                      교실 페이지에서 자료를 공유하면 이곳에 표시됩니다.
                    </p>
                  </div>
                ) : filteredMaterials.length === 0 ? (
                  <div className="cl-empty-materials">
                    <FileText size={48} />
                    <p>검색 결과가 없습니다</p>
                    <p className="cl-empty-hint">
                      다른 검색어나 필터를 시도해보세요.
                    </p>
                  </div>
                ) : (
                  filteredMaterials.map((m) => (
                    <div
                      key={m.id}
                      className="cl-material-item"
                      onClick={() => handleViewMaterial(m.id)}
                      style={{ cursor: 'pointer' }}
                    >
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
                          <span className="cl-material-date">
                            {m.uploadDate}
                          </span>
                        </div>
                      </div>
                      <div className="cl-material-actions">
                        <button
                          className="cl-material-action-btn label-btn"
                          title="라벨 편집"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLabelMaterial(m.id, m.label);
                          }}
                        >
                          <Tag size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

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
              {isLoading && !students.length ? (
                <p className="cl-empty-hint">불러오는 중입니다…</p>
              ) : !students.length ? (
                <p className="cl-empty-hint">
                  아직 등록된 학생이 없거나, 반 정보가 없습니다.
                </p>
              ) : filteredStudents.length === 0 ? (
                <div className="cl-empty-materials">
                  <FileText size={48} />
                  <p>검색 결과가 없습니다</p>
                  <p className="cl-empty-hint">다른 검색어를 시도해보세요.</p>
                </div>
              ) : (
                getFilledStudents(filteredStudents).map((s) => {
                  if (s.isEmpty) {
                    return (
                      <div
                        key={s.id}
                        className="cl-student-card cl-student-card-empty"
                        style={{ visibility: 'hidden' }}
                      />
                    );
                  }

                  return (
                    <div
                      key={s.id}
                      className="cl-student-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleStudentClick(s)}
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
                        <span className="cl-progress-text">
                          {s.progressRate}%
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
