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
import {
  useEffect,
  useMemo,
  useState,
  useRef,
  ChangeEvent,
} from 'react';
import './ClassroomList.css';
import teacherAvatar from '../assets/classList/teacher.png';

import MaterialSendModal2Step from '@/component/MaterialSendModal2step';
import schoolImg from '../assets/classList/school.png';
import maleImg from '../assets/classroom/male.png';
import femaleImg from '../assets/classroom/female.png';

type ClassroomData = {
  id: string;          // classroomId
  grade: string;       // "3학년"
  class: string;       // "1반"
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
  type?: 'content' | 'quiz';
};

type PublishedMaterialDto = {
  materialId: number;
  uploadedFileId: number;
  title: string;
  originalFileName: string;
  label:
    | 'RED'
    | 'ORANGE'
    | 'YELLOW'
    | 'GREEN'
    | 'BLUE'
    | 'PURPLE'
    | 'GRAY'
    | null;
  createdAt: string; // ISO 문자열
  updatedAt: string; // ISO 문자열
};

type PublishedMaterialsResponse = {
  materials: PublishedMaterialDto[];
  totalCount: number;
};

type StudentLite = {
  id: string;          // studentId
  name: string;        // studentName
  grade: string;       // "3학년 1반"
  gender?: 'male' | 'female';
  avatarUrl?: string;
  avatar?: string;
};

/** 담당 반 목록 API 응답 타입 */
type TeacherClassroomDto = {
  classroomId: number;
  year: number;
  gradeLevel: number;
  classNumber: number;
  displayName: string;
  schoolName: string;
  studentCount: number;
  materialCount: number;
};

type TeacherClassesResponse = {
  teacherId: number;
  teacherName: string;
  totalCount: number;
  classrooms: TeacherClassroomDto[];
};

/** 담당 학생 전체 조회 API 응답 타입 */
type ClassStudentsDto = {
  classroomId: number;
  year: number;
  gradeLevel: number;
  classNumber: number;
  displayName: string;
  schoolName: string;
  totalCount: number;
  students: {
    studentId: number;
    studentName: string;
    studentNumber: string;
  }[];
};

/** 자료 공유 API body 타입 */
type MaterialShareRequest = {
  materialId: number;
  shares: {
    [classroomId: string]: {
      type: 'CLASS';
      studentIds: number[];
    };
  };
};

export default function ClassroomList({ onLogout }: ClassroomListProps) {
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [studentsByClassroom, setStudentsByClassroom] = useState<
    Record<string, StudentLite[]>
  >({});

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
      credentials: 'include',
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
          type: 'content',
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
        const pdfId = parsed.pdfId;

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
          pdfId,
        });

        navigate('/editor', {
          state: {
            fileName: docTitle,
            chapters: chapters,
            pdfId: pdfId,
            from: 'classroom',
          },
        });
      } else {
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

  const [materials, setMaterials] = useState<Material[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(new Date());

  // 발행 자료 목록 조회
  useEffect(() => {
    if (!API_BASE) return;

    const fetchPublishedMaterials = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');

        if (!accessToken) {
          console.warn('accessToken 이 없습니다. 로그인 상태를 확인해 주세요.');
        }

        const res = await fetch(`${API_BASE}/api/documents/published`, {
          method: 'GET',
          headers: {
            accept: '*/*',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: 'include',
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(
            text ||
              `발행 자료 목록 조회에 실패했습니다. (status: ${res.status})`,
          );
        }

        const data = (await res.json()) as PublishedMaterialsResponse;

        const mapped: Material[] = data.materials.map((m) => ({
          id: String(m.materialId),
          title: m.title,
          uploadDate: formatKST(new Date(m.createdAt)),
          label: m.label ? m.label.toLowerCase() : undefined,
          status: 'published',
        }));

        setMaterials(mapped);
      } catch (err: any) {
        console.error('발행 자료 목록 조회 실패', err);
        Swal.fire({
          icon: 'error',
          title: '발행된 자료를 불러오지 못했습니다',
          text: err?.message ?? '잠시 후 다시 시도해 주세요.',
          confirmButtonColor: '#192b55',
        });
      }
    };

    void fetchPublishedMaterials();
  }, [API_BASE]);

  // 담당 반 / 학생 목록 조회
  useEffect(() => {
    if (!API_BASE) return;

    const fetchClassesAndStudents = async () => {
      try {
        const accessToken = localStorage.getItem('accessToken');
        const commonHeaders: HeadersInit = {
          accept: '*/*',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        };

        // 1) 내 담당 반 목록
        const classesRes = await fetch(`${API_BASE}/api/classes/teacher`, {
          method: 'GET',
          headers: commonHeaders,
          credentials: 'include',
        });

        if (!classesRes.ok) {
          const text = await classesRes.text().catch(() => '');
          throw new Error(
            text ||
              `담당 반 목록 조회에 실패했습니다. (status: ${classesRes.status})`,
          );
        }

        const classesJson = (await classesRes.json()) as TeacherClassesResponse;

        const mappedClassrooms: ClassroomData[] =
          classesJson.classrooms?.map((c) => ({
            id: String(c.classroomId),
            grade: `${c.gradeLevel}학년`,
            class: `${c.classNumber}반`,
            studentCount: c.studentCount,
            materialCount: c.materialCount,
          })) ?? [];

        setClassrooms(mappedClassrooms);

        if (mappedClassrooms.length === 0) {
          setStudentsByClassroom({});
          return;
        }

        // 2) 담당 학생 전체 조회
        const classroomIds = mappedClassrooms.map((c) => Number(c.id));
        const query = classroomIds
          .map((id) => `classroomIds=${encodeURIComponent(String(id))}`)
          .join('&');

        const studentsRes = await fetch(
          `${API_BASE}/api/classes/students?${query}`,
          {
            method: 'GET',
            headers: commonHeaders,
            credentials: 'include',
          },
        );

        if (!studentsRes.ok) {
          const text = await studentsRes.text().catch(() => '');
          throw new Error(
            text ||
              `담당 학생 목록 조회에 실패했습니다. (status: ${studentsRes.status})`,
          );
        }

        const studentsJson = (await studentsRes.json()) as ClassStudentsDto[];

        const map: Record<string, StudentLite[]> = {};
        studentsJson.forEach((cls) => {
          map[String(cls.classroomId)] =
            cls.students?.map((s) => ({
              id: String(s.studentId),
              name: s.studentName,
              grade: `${cls.gradeLevel}학년 ${cls.classNumber}반`,
            })) ?? [];
        });

        setStudentsByClassroom(map);
      } catch (err: any) {
        console.error('담당 반/학생 목록 조회 실패', err);
        Swal.fire({
          icon: 'error',
          title: '반/학생 정보를 불러오지 못했습니다',
          text: err?.message ?? '잠시 후 다시 시도해 주세요.',
          confirmButtonColor: '#192b55',
        });
      }
    };

    void fetchClassesAndStudents();
  }, [API_BASE]);

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

  // 자료 공유 API 호출
  const shareMaterial = async (
    studentIds: string[],
    classroomIds: string[],
    material: Material,
  ) => {
    if (!API_BASE) return;

    try {
      const accessToken = localStorage.getItem('accessToken');
      const headers: HeadersInit = {
        accept: '*/*',
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      };

      // classroomId별 선택된 학생만 묶어서 body 생성
      const body: MaterialShareRequest = {
        materialId: Number(material.id),
        shares: {},
      };

      classroomIds.forEach((cid) => {
        const allStudents = studentsByClassroom[cid] || [];
        const selectedInClass = allStudents.filter((s) =>
          studentIds.includes(s.id),
        );
        if (selectedInClass.length === 0) return;
        body.shares[cid] = {
          type: 'CLASS',
          studentIds: selectedInClass.map((s) => Number(s.id)),
        };
      });

      if (Object.keys(body.shares).length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: '선택된 학생이 없습니다',
          text: '공유할 학생을 선택해 주세요.',
          confirmButtonColor: '#192b55',
        });
        return;
      }

      void Swal.fire({
        title: '자료를 공유하는 중입니다',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch(`${API_BASE}/api/materials/share`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(
          text ||
            `자료 공유에 실패했습니다. (status: ${res.status})`,
        );
      }

      await Swal.close();

      // 성공 메시지용 정보 구성
      const allSelectedStudents = classroomIds.flatMap(
        (cid) => (studentsByClassroom[cid] || []).filter((s) =>
          studentIds.includes(s.id),
        ),
      );
      const names = allSelectedStudents.map((s) => s.name);

      const classroomNames = classroomIds
        .map((cid) => {
          const c = classrooms.find((cl) => cl.id === cid);
          return c ? `${c.grade} ${c.class}` : cid;
        })
        .join(', ');

      await Swal.fire({
        icon: 'success',
        title: '자료가 공유되었습니다!',
        html: `
          <div style="text-align:left;line-height:1.5">
            <p style="margin:0 0 8px 0"><strong>"${material.title}"</strong></p>
            <p style="margin:0 0 6px 0;color:#374151;"><strong>공유한 반</strong> ${classroomNames}</p>
            <p style="margin:0 0 6px 0;color:#374151;"><strong>공유한 학생</strong> ${names.join(', ')}</p>
            <p style="margin:4px 0 0 0;color:#6b7280;font-size:14px;">${names.length}명에게 공유되었습니다</p>
          </div>
        `,
        confirmButtonColor: '#192b55',
      });

      setShowSendModal(false);
      setSelectedMaterial(null);
    } catch (err: any) {
      console.error('자료 공유 실패', err);
      await Swal.close();
      await Swal.fire({
        icon: 'error',
        title: '자료 공유에 실패했습니다',
        text: err?.message ?? '잠시 후 다시 시도해 주세요.',
        confirmButtonColor: '#192b55',
      });
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
                        <p className="cl-stat-num">
                          {classroom.studentCount}
                        </p>
                        <p className="cl-stat-text">학생</p>
                      </div>
                    </div>
                    <div className="cl-divider" />
                    <div className="cl-stat">
                      <BookOpen size={18} />
                      <div className="cl-stat-info">
                        <p className="cl-stat-num">
                          {classroom.materialCount}
                        </p>
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
            count: (studentsByClassroom[c.id] || []).length,
          }))}
          studentsByClassroom={studentsByClassroom}
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
            void shareMaterial(studentIds, classroomIds, selectedMaterial);
          }}
          schoolImage={schoolImg}
          maleImage={maleImg}
          femaleImage={femaleImg}
        />
      )}
    </div>
  );
}
