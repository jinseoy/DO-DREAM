// src/pages/AdvancedEditor.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Swal from 'sweetalert2';
import {
  ChevronLeft,
  Plus,
  Edit2,
  Sun,
  Moon,
  Scissors,
  Tag,
  Send,
  X,
  Merge,
  FileQuestion,
  Download,
  PlusCircle,
} from 'lucide-react';
import './AdvancedEditor.css';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chapterBreak: {
      setChapterBreak: () => ReturnType;
    };
  }
}

type Chapter = {
  id: string;
  title: string;
  content: string;
  type?: 'content' | 'quiz';
  qa?: { question: string; answer: string }[];
};

type EditorProps = {
  initialTitle?: string;
  extractedText?: string;
  initialChapters?: Chapter[];
  onPublish: (title: string, chapters: Chapter[], label?: string) => void;
  onBack: () => void;
  pdfId?: number;
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

const ChapterBreak = HorizontalRule.extend({
  name: 'chapterBreak',

  addAttributes() {
    return {
      'data-chapter-break': {
        default: 'true',
        parseHTML: () => 'true',
        renderHTML: () => ({ 'data-chapter-break': 'true' }),
      },
      class: {
        default: 'ae-chapter-break',
      },
    };
  },

  addCommands() {
    return {
      setChapterBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});

type ConceptCheckResponse = {
  pdfId: number;
  filename: string;
  conceptCheckCount: number;
  data: Array<{
    index: string;
    index_title: string;
    questions: Array<{
      question: string;
      answer: string;
    }>;
  }>;
};

export default function AdvancedEditor({
  initialTitle = '새로운 자료',
  initialChapters,
  extractedText,
  onPublish,
  onBack,
  pdfId,
}: EditorProps) {
  const [materialTitle, setMaterialTitle] = useState(initialTitle);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [draggedChapterId, setDraggedChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(
    null,
  );

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

  const [chapters, setChapters] = useState<Chapter[]>(() => {
    console.log('🔍 [AdvancedEditor] chapters 초기화:', {
      initialChapters,
      initialChaptersLength: initialChapters?.length,
    });

    if (initialChapters && initialChapters.length > 0) {
      console.log('✅ initialChapters 사용:', initialChapters.length, '개');
      return initialChapters;
    }

    console.log('✅ 기본 챕터 생성');
    const defaultContent = extractedText || '<p>내용을 입력하세요...</p>';
    return [
      {
        id: '1',
        title: '챕터 1',
        content: defaultContent,
        type: 'content',
      },
    ];
  });

  const [activeChapterId, setActiveChapterId] = useState<string>(() => {
    if (initialChapters && initialChapters.length > 0) {
      console.log('✅ activeChapterId 설정:', initialChapters[0].id);
      return initialChapters[0].id;
    }
    console.log('✅ 기본 activeChapterId: 1');
    return '1';
  });

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId),
    [chapters, activeChapterId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      ChapterBreak,
    ],
    content: '<p>내용을 입력하세요...</p>',
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor || !activeChapterId || chapters.length === 0) return;

    const chapter = chapters.find((c) => c.id === activeChapterId);
    if (!chapter) return;

    const html = chapter.content || '<p>내용을 입력하세요...</p>';
    editor.commands.setContent(html);
  }, [editor, activeChapterId, chapters.length]);

  // 에디터 업데이트 감지 + 분할선 자동 감지
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const newContent = editor.getHTML();
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === activeChapterId ? { ...ch, content: newContent } : ch,
        ),
      );
      setHasUnsavedChanges(true);

      // 분할선 존재 여부 확인
      const hasChapterBreak =
        /<hr[^>]*data-chapter-break=["']true["'][^>]*>/gi.test(newContent);
      if (!hasChapterBreak && isSplitMode) {
        setIsSplitMode(false);
      }
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, activeChapterId, isSplitMode]);

  useEffect(() => {
    if (materialTitle !== initialTitle) {
      setHasUnsavedChanges(true);
    }
  }, [materialTitle, initialTitle]);

  const handleAddChapter = () => {
    const maxId = chapters.reduce(
      (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
      0,
    );
    const newId = String(maxId + 1);

    const newChapter: Chapter = {
      id: newId,
      title: `챕터 ${newId}`,
      content: '<p>새 챕터의 내용을 입력하세요...</p>',
      type: 'content',
    };

    setChapters((prev) => [...prev, newChapter]);
    setActiveChapterId(newId);
  };

  const handleDeleteChapter = (id: string) => {
    if (chapters.length === 1) {
      Swal.fire({
        icon: 'warning',
        title: '최소 하나의 항목이 필요합니다',
        text: '적어도 하나의 학습/퀴즈 항목은 남겨두어야 합니다',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    const target = chapters.find((c) => c.id === id);
    const targetLabel = target?.type === 'quiz' ? '퀴즈' : '챕터';

    Swal.fire({
      title: `${targetLabel}를 삭제하시겠습니까?`,
      text: '이 작업은 되돌릴 수 없습니다',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        const newChapters = chapters.filter((c) => c.id !== id);
        setChapters(newChapters);
        if (activeChapterId === id && newChapters.length > 0) {
          setActiveChapterId(newChapters[0].id);
        }
        Swal.fire({
          icon: 'success',
          title: `${targetLabel}가 삭제되었습니다`,
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  const handleEditChapterTitle = (id: string, title: string) => {
    setEditingChapterId(id);
    setEditingTitle(title);
  };

  const handleSaveChapterTitle = (id: string) => {
    if (!editingTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '제목을 입력하세요',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    setChapters((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, title: editingTitle } : ch)),
    );
    setEditingChapterId(null);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    chapterId: string,
  ) => {
    setDraggedChapterId(chapterId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', chapterId);
  };

  const handleDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    chapterId: string,
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverChapterId(chapterId);
  };

  const handleDragLeave = () => {
    setDragOverChapterId(null);
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetChapterId: string,
  ) => {
    e.preventDefault();
    setDragOverChapterId(null);

    if (!draggedChapterId || draggedChapterId === targetChapterId) {
      return;
    }

    setChapters((prev) => {
      const draggedIndex = prev.findIndex((ch) => ch.id === draggedChapterId);
      const targetIndex = prev.findIndex((ch) => ch.id === targetChapterId);

      if (draggedIndex === -1 || targetIndex === -1) {
        return prev;
      }

      const newChapters = [...prev];
      const [draggedChapter] = newChapters.splice(draggedIndex, 1);
      newChapters.splice(targetIndex, 0, draggedChapter);

      return newChapters;
    });

    setDraggedChapterId(null);
    setHasUnsavedChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedChapterId(null);
    setDragOverChapterId(null);
  };

  const insertChapterBreak = () => {
    editor?.chain().focus().setChapterBreak().run();
    setIsSplitMode(true);
  };

  const splitByChapterBreaks = () => {
    if (!editor) return;

    const html = editor.getHTML();

    const parts = html
      .split(/<hr[^>]*data-chapter-break=["']true["'][^>]*>/gi)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parts.length <= 1) {
      Swal.fire({
        icon: 'info',
        title: '분할할 위치가 없어요',
        text: '먼저 "분할선"을 추가해 주세요.',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    const extractTitle = (fragmentHtml: string, fallback: string) => {
      try {
        const doc = new DOMParser().parseFromString(fragmentHtml, 'text/html');
        const h = doc.querySelector('h1, h2, h3, h4, h5, h6');
        const t = h?.textContent?.trim();
        return t && t.length > 0 ? t : fallback;
      } catch {
        return fallback;
      }
    };

    const baseIndex =
      chapters.reduce((max, ch) => Math.max(max, parseInt(ch.id, 10) || 0), 0) +
      1;

    const first = parts[0];
    const rest = parts.slice(1);

    setChapters((prev) => {
      const currentChapter = prev.find((ch) => ch.id === activeChapterId);
      const originalType = currentChapter?.type || 'content';

      const updated = prev.map((ch) =>
        ch.id === activeChapterId
          ? {
              ...ch,
              content: first,
              title: extractTitle(first, ch.title || '챕터'),
            }
          : ch,
      );

      const newOnes: Chapter[] = rest.map((content, idx) => {
        const nextId = String(baseIndex + idx);

        const defaultTitle =
          originalType === 'quiz' ? `문제 ${nextId}` : `챕터 ${nextId}`;

        const extractedTitle = extractTitle(content, defaultTitle);

        let finalContent = content;
        if (originalType === 'quiz') {
          if (!content.trim().startsWith('<h2>') && !content.includes('<h2')) {
            finalContent = `<h2>${extractedTitle}</h2>\n${content}`;
          }
        }

        return {
          id: nextId,
          title: extractedTitle,
          content: finalContent,
          type: originalType,
        };
      });

      return [...updated, ...newOnes];
    });

    setIsSplitMode(false);

    Swal.fire({
      icon: 'success',
      title: `${parts.length}개의 챕터로 분리했어요`,
      confirmButtonColor: '#192b55',
    });
  };

  const toggleMergeMode = () => {
    if (mergeMode) {
      setSelectedChapters(new Set());
    }
    setMergeMode(!mergeMode);
  };

  const toggleChapterSelection = (id: string) => {
    if (!mergeMode) return;

    const newSelection = new Set(selectedChapters);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedChapters(newSelection);
  };

  const mergeSelectedChapters = () => {
    if (selectedChapters.size < 2) {
      Swal.fire({
        icon: 'warning',
        title: '최소 2개 이상의 챕터를 선택하세요',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    const selected = chapters
      .filter((ch) => selectedChapters.has(ch.id))
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));

    const mergedContent = selected
      .map((ch) => ch.content)
      .join('\n<hr class="ae-chapter-divider" />\n');
    const mergedTitle = selected.map((ch) => ch.title).join(' + ');

    Swal.fire({
      title: '선택한 챕터를 병합하시겠습니까?',
      html: `
        <div style="text-align: left; margin: 1rem 0;">
          <strong>병합할 챕터:</strong><br/>
          ${selected.map((ch) => `• ${ch.title}`).join('<br/>')}
        </div>
        <div style="margin-top: 1rem;">
          <input id="mergedTitle" class="swal2-input" placeholder="병합된 챕터 제목" value="${mergedTitle}" />
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '병합',
      cancelButtonText: '취소',
      reverseButtons: true,
      preConfirm: () => {
        const titleInput = document.getElementById(
          'mergedTitle',
        ) as HTMLInputElement;
        return titleInput?.value || mergedTitle;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const newTitle = result.value;
        const firstId = selected[0].id;

        // 선택한 챕터가 전부 quiz 타입이면 병합된 챕터도 quiz 유지
        const mergedType: Chapter['type'] = selected.every(
          (ch) => ch.type === 'quiz',
        )
          ? 'quiz'
          : 'content';

        setChapters((prev) => {
          const unselected = prev.filter((ch) => !selectedChapters.has(ch.id));
          const merged: Chapter = {
            id: firstId,
            title: newTitle,
            content: mergedContent,
            type: mergedType,
          };

          return [...unselected, merged].sort(
            (a, b) => parseInt(a.id) - parseInt(b.id),
          );
        });

        setActiveChapterId(firstId);
        setSelectedChapters(new Set());
        setMergeMode(false);

        Swal.fire({
          icon: 'success',
          title: '챕터가 병합되었습니다',
          confirmButtonColor: '#192b55',
        });
      }
    });
  };

  const fetchQuizFromAPI = async () => {
    if (!pdfId) {
      Swal.fire({
        icon: 'error',
        title: 'PDF ID가 없습니다',
        text: '문제를 불러올 수 없습니다',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    void Swal.fire({
      title: '문제를 불러오는 중...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const url = `${API_BASE}/api/pdf/${pdfId}/concept-check`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: '*/*',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        await Swal.close();

        // 500 에러 특별 처리
        if (response.status === 500) {
          Swal.fire({
            icon: 'warning',
            title: '문제 불러오기 기능 준비 중',
            html: `
            <div style="text-align: left; line-height: 1.7;">
              <p style="margin-bottom: 12px;">
                AI 생성 퀴즈 기능이 현재 준비 중입니다.
              </p>
              <p style="margin-bottom: 12px; padding: 12px; background: #f3f4f6; border-radius: 8px;">
                💡 <strong>해결 방법:</strong><br/>
                "<strong>직접 퀴즈 추가</strong>" 버튼으로 문제를 만들어보세요!
              </p>
              <div style="font-size: 13px; color: #666; margin-top: 12px;">
                <strong>참고:</strong> 백엔드 팀에서 API 구조 업데이트 중입니다.
              </div>
            </div>
          `,
            confirmButtonColor: '#192b55',
            confirmButtonText: '확인',
          });
          return;
        }

        throw new Error('문제를 불러오지 못했습니다');
      }

      const data: ConceptCheckResponse = await response.json();
      await Swal.close();

      if (!data.data || data.data.length === 0) {
        Swal.fire({
          icon: 'info',
          title: '생성된 문제가 없습니다',
          html: `
          <p>이 자료에는 아직 개념 체크 문제가 없습니다.</p>
          <p style="margin-top: 10px; font-size: 14px; color: #666;">
            "직접 퀴즈 추가" 버튼으로 문제를 추가할 수 있습니다.
          </p>
        `,
          confirmButtonColor: '#192b55',
        });
        return;
      }

      // 기존 코드...
      const maxIdBase = chapters.reduce(
        (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
        0,
      );

      const quizChapters: Chapter[] = data.data.map((block, idx) => {
        const newId = String(maxIdBase + idx + 1);

        let content = `<h2>${block.index}. ${block.index_title}</h2>\n`;
        content += `<div class="quiz-content">\n<ol>\n`;

        block.questions.forEach((q) => {
          content += `
    <li>
      <p>${q.question}</p>
      <p><strong>정답:</strong> ${q.answer}</p>
    </li>
  `;
        });

        content += `</ol>\n</div>\n`;

        return {
          id: newId,
          title: `${block.index}. ${block.index_title}`,
          content,
          type: 'quiz',
          qa: block.questions.map((q) => ({
            question: q.question,
            answer: q.answer,
          })),
        };
      });

      setChapters((prev) => [...prev, ...quizChapters]);

      Swal.fire({
        icon: 'success',
        title: '문제를 불러왔습니다!',
        text: `${quizChapters.length}개의 문제를 추가했습니다`,
        confirmButtonColor: '#192b55',
      });
    } catch (error) {
      await Swal.close();
      console.error('❌ Quiz fetch error:', error);

      Swal.fire({
        icon: 'error',
        title: '문제 불러오기 실패',
        text: error instanceof Error ? error.message : '다시 시도해주세요',
        confirmButtonColor: '#192b55',
      });
    }
  };

  const addManualQuiz = () => {
    Swal.fire({
      title: '퀴즈 생성',
      html: `
      <div class="ae-quiz-form">
        <div class="ae-quiz-field">
          <label class="ae-quiz-label">퀴즈 제목</label>
          <input 
            id="quizTitle" 
            class="ae-quiz-input" 
            placeholder="예: 개념 Check, 서술형 문제"
          />
        </div>
        
        <div class="ae-quiz-field">
          <label class="ae-quiz-label">질문</label>
          <textarea 
            id="quizQuestion" 
            class="ae-quiz-textarea" 
            placeholder="질문 내용을 입력하세요...

예시:
자연 현상과 사회·문화 현상을 구분하여 설명하시오."
          ></textarea>
        </div>

        <div class="ae-quiz-field">
          <label class="ae-quiz-label">정답</label>
          <textarea 
            id="quizAnswer" 
            class="ae-quiz-textarea" 
            placeholder="모범 답안을 입력하세요..."></textarea>
        </div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: '추가',
      cancelButtonText: '취소',
      reverseButtons: true,
      width: '560px',
      customClass: {
        popup: 'ae-quiz-modal',
        confirmButton: 'ae-quiz-btn ae-quiz-btn-confirm',
        cancelButton: 'ae-quiz-btn ae-quiz-btn-cancel',
      },
      buttonsStyling: false,
      preConfirm: () => {
        const titleInput = document.getElementById(
          'quizTitle',
        ) as HTMLInputElement;
        const qInput = document.getElementById(
          'quizQuestion',
        ) as HTMLTextAreaElement;
        const aInput = document.getElementById(
          'quizAnswer',
        ) as HTMLTextAreaElement;

        const title = titleInput?.value.trim();
        const question = qInput?.value.trim();
        const answer = aInput?.value.trim();

        if (!title || !question || !answer) {
          Swal.showValidationMessage('제목, 질문, 정답을 모두 입력하세요');
          return null;
        }

        return { title, question, answer };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { title, question, answer } = result.value;
        const maxId = chapters.reduce(
          (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
          0,
        );

        const formattedQuestion = question.replace(/\n/g, '<br/>');
        const formattedAnswer = answer.replace(/\n/g, '<br/>');

        const content = `
        <h2>${title}</h2>
        <div class="quiz-content">
          <ol>
            <li>
              <p>${formattedQuestion}</p>
              <p><strong>정답:</strong> ${formattedAnswer}</p>
            </li>
          </ol>
        </div>
      `;

        const newQuiz: Chapter = {
          id: String(maxId + 1),
          title: `${title}`,
          content,
          type: 'quiz',
          qa: [{ question, answer }],
        };

        setChapters((prev) => [...prev, newQuiz]);
        setActiveChapterId(newQuiz.id);

        Swal.fire({
          icon: 'success',
          title: '문제가 추가되었습니다!',
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleLabelSelect = () => {
    Swal.fire({
      title: '라벨 선택',
      html: `
        <div class="ae-label-grid" id="labelGrid">
          ${LABEL_OPTIONS.map(
            (label) => `
            <button 
              class="ae-label-option ${
                selectedLabel === label.id ? 'active' : ''
              }" 
              data-label="${label.id}"
              style="background-color: ${label.color}; ${
                selectedLabel === label.id
                  ? `border: 3px solid ${label.color};`
                  : ''
              }" 
              title="${label.name}"
            >
              <span>${selectedLabel === label.id ? '✓' : ''}</span>
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

        const buttons = grid.querySelectorAll('.ae-label-option');
        buttons.forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const label = (e.currentTarget as HTMLElement).getAttribute(
              'data-label',
            );
            if (!label) return;

            buttons.forEach((b) => {
              const htmlElement = b as HTMLElement;
              const isActive = htmlElement.getAttribute('data-label') === label;
              if (isActive) {
                htmlElement.classList.add('active');
                htmlElement.style.border = '3px solid #000';
                htmlElement.innerHTML = '<span>✓</span>';
              } else {
                htmlElement.classList.remove('active');
                htmlElement.style.border = '';
                htmlElement.innerHTML = '<span></span>';
              }
            });

            setSelectedLabel(label);
          });
        });
      },
    });
  };

  const handlePublish = async () => {
    if (!materialTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '제목을 입력하세요',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    if (!pdfId) {
      Swal.fire({
        icon: 'error',
        title: 'PDF ID가 없습니다',
        text: '발행을 진행할 수 없습니다',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    const token = localStorage.getItem('accessToken');

    if (!token) {
      Swal.fire({
        icon: 'error',
        title: '인증이 필요합니다',
        text: '다시 로그인해주세요.',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    const payload = {
      materialTitle,
      labelColor: selectedLabel ? selectedLabel.toUpperCase() : null,
      editedJson: {
        chapters,
      },
    };

    try {
      // ✅ await 제거! void만 사용
      void Swal.fire({
        title: '발행 중입니다...',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      const res = await fetch(`${API_BASE}/api/documents/${pdfId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const responseText = await res.text();
      console.log('📤 Publish Response:', {
        status: res.status,
        statusText: res.statusText,
        body: responseText,
      });

      // ✅ fetch 완료 후 로딩 모달 닫기
      await Swal.close();

      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('isLoggedIn');

          Swal.fire({
            icon: 'error',
            title: '인증이 만료되었습니다',
            text: '다시 로그인해주세요.',
            confirmButtonColor: '#192b55',
          }).then(() => {
            window.location.href = '/';
          });
          return;
        }

        if (res.status === 500) {
          Swal.fire({
            icon: 'error',
            title: '서버 오류',
            text: '서버에서 오류가 발생했습니다.',
            confirmButtonColor: '#192b55',
          });
          return;
        }

        throw new Error(responseText || '서버에서 오류가 발생했습니다');
      }

      await Swal.fire({
        icon: 'success',
        title: '발행되었습니다!',
        text: `"${materialTitle}" 발행 완료`,
        confirmButtonColor: '#192b55',
      });

      setHasUnsavedChanges(false);
      onPublish(materialTitle, chapters, selectedLabel);
    } catch (error) {
      await Swal.close();
      console.error('❌ Publish error:', error);

      Swal.fire({
        icon: 'error',
        title: '발행 실패',
        text: error instanceof Error ? error.message : '다시 시도해주세요',
        confirmButtonColor: '#192b55',
      });
    }
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      Swal.fire({
        icon: 'warning',
        title: '저장하지 않은 변경사항이 있습니다',
        text: '지금 나가면 변경사항이 모두 사라집니다',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#d1d5db',
        confirmButtonText: '나가기',
        cancelButtonText: '계속 편집',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          onBack();
        }
      });
    } else {
      onBack();
    }
  };

  if (chapters.length === 0 || !activeChapterId) {
    console.log('⏳ 로딩 중:', {
      chaptersLength: chapters.length,
      activeChapterId,
    });
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#192b55',
        }}
      >
        에디터 초기화 중...
      </div>
    );
  }

  console.log('✅ 에디터 렌더링:', { chapters, activeChapterId });

  return (
    <div className={`ae-root ${darkMode ? 'dark' : ''}`}>
      <header className="ae-header">
        <div className="ae-header-wrapper">
          <button
            className="ae-back-btn"
            onClick={handleBackClick}
            title="뒤로가기"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="ae-title-section">
            {showTitleInput ? (
              <input
                type="text"
                className="ae-title-input"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                onBlur={() => setShowTitleInput(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShowTitleInput(false);
                }}
                autoFocus
              />
            ) : (
              <h1
                className="ae-title"
                onClick={() => setShowTitleInput(true)}
                title="클릭하여 제목 편집"
              >
                {materialTitle}
              </h1>
            )}
          </div>

          <div className="ae-header-actions">
            <button
              className="ae-icon-btn"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="ae-icon-btn"
              onClick={handleLabelSelect}
              title="라벨 선택"
            >
              <Tag
                size={18}
                style={{
                  color: selectedLabel
                    ? LABEL_OPTIONS.find((l) => l.id === selectedLabel)?.color
                    : 'currentColor',
                }}
              />
            </button>
            <button className="ae-btn-publish" onClick={handlePublish}>
              <Send size={16} />
              발행
            </button>
          </div>
        </div>
      </header>

      <div className="ae-layout">
        {/* 오른쪽 챕터 사이드바 */}
        <aside className="ae-chapter-sidebar">
          <div className="ae-sidebar-header">
            <div className="ae-sidebar-title-wrapper">
              <h3>챕터 목록</h3>
              {!mergeMode && (
                <span className="ae-sidebar-hint">드래그하여 순서 변경</span>
              )}
            </div>
            <button
              className="ae-sidebar-add-btn"
              onClick={handleAddChapter}
              title="새 챕터"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="ae-chapter-list">
            {chapters.map((ch) => (
              <div
                key={ch.id}
                className={`ae-chapter-item ${
                  activeChapterId === ch.id ? 'active' : ''
                } ${ch.type === 'quiz' ? 'quiz-item' : ''} ${
                  mergeMode && selectedChapters.has(ch.id) ? 'selected' : ''
                } ${draggedChapterId === ch.id ? 'dragging' : ''} ${
                  dragOverChapterId === ch.id ? 'drag-over' : ''
                }`}
                draggable={!mergeMode && !editingChapterId}
                onDragStart={(e) => handleDragStart(e, ch.id)}
                onDragOver={(e) => handleDragOver(e, ch.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, ch.id)}
                onDragEnd={handleDragEnd}
                onClick={() => {
                  if (mergeMode) {
                    toggleChapterSelection(ch.id);
                  } else {
                    setActiveChapterId(ch.id);
                  }
                }}
              >
                {editingChapterId === ch.id ? (
                  <input
                    type="text"
                    className="ae-chapter-input"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveChapterTitle(ch.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={() => handleSaveChapterTitle(ch.id)}
                    autoFocus
                  />
                ) : (
                  <>
                    {mergeMode && (
                      <div className="ae-chapter-checkbox">
                        {selectedChapters.has(ch.id) ? '☑' : '☐'}
                      </div>
                    )}
                    <span className="ae-chapter-title">{ch.title}</span>
                    {!mergeMode && (
                      <div className="ae-chapter-actions">
                        <button
                          className="ae-chapter-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditChapterTitle(ch.id, ch.title);
                          }}
                          title="편집"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="ae-chapter-action delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChapter(ch.id);
                          }}
                          title="삭제"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* 메인 영역 */}
        <div className="ae-main">
          {/* 툴바 */}
          <div className="ae-toolbar-enhanced">
            <div className="ae-toolbar-section">
              <button
                onClick={insertChapterBreak}
                disabled={!editor}
                className={`ae-tool-btn-new split ${
                  isSplitMode ? 'active' : ''
                }`}
                title="분할선 추가"
              >
                <Scissors size={18} />
                <span>분할선</span>
              </button>
              {isSplitMode && (
                <button
                  onClick={splitByChapterBreaks}
                  disabled={!editor}
                  className="ae-tool-btn-new split active"
                  title="챕터 분할"
                >
                  분할하기
                </button>
              )}
            </div>

            <div className="ae-toolbar-divider" />

            <div className="ae-toolbar-section">
              <button
                onClick={toggleMergeMode}
                className={`ae-tool-btn-new merge ${mergeMode ? 'active' : ''}`}
                title="항목 병합 모드"
              >
                <Merge size={18} />
                <span>{mergeMode ? '병합 모드 종료' : '항목 병합 모드'}</span>
              </button>
              {mergeMode && (
                <button
                  onClick={mergeSelectedChapters}
                  disabled={selectedChapters.size < 2}
                  className="ae-tool-btn-new merge active"
                  title="선택한 챕터 병합"
                >
                  병합하기 ({selectedChapters.size})
                </button>
              )}
            </div>

            <div className="ae-toolbar-divider" />

            <div className="ae-toolbar-section">
              {pdfId && (
                <button
                  onClick={fetchQuizFromAPI}
                  className="ae-tool-btn-new quiz"
                  title="API에서 문제 불러오기"
                >
                  <Download size={18} />
                  <span>퀴즈 뽑기</span>
                </button>
              )}
              <button
                onClick={addManualQuiz}
                className="ae-tool-btn-new quiz"
                title="수동으로 문제 추가"
              >
                <PlusCircle size={18} />
                <span>직접 퀴즈 추가</span>
              </button>
            </div>
          </div>

          {/* 안내 배너들 */}
          {isSplitMode && !mergeMode && (
            <div className="ae-split-hint">
              <strong>✂️ 분할 모드 : </strong>
              <span>
                분할선을 추가한 후 "분할하기" 버튼을 클릭하면 챕터를 나눌 수
                있습니다
              </span>
            </div>
          )}

          {mergeMode && (
            <div className="ae-merge-hint">
              <strong>🔗 병합 모드 : </strong>
              <span>
                병합할 항목(학습/문제)을 2개 이상 선택한 후 "병합하기" 버튼을
                클릭하세요
              </span>
            </div>
          )}

          {/* 에디터 영역 */}
          <div
            className={`ae-editor-wrapper ${
              activeChapter?.type === 'quiz' ? 'quiz-editor' : ''
            }`}
          >
            {activeChapter?.type === 'quiz' && (
              <div className="quiz-badge">
                <FileQuestion size={16} />
                <span>문제 챕터</span>
              </div>
            )}
            <EditorContent editor={editor} className="ae-editor" />
          </div>
        </div>
      </div>
    </div>
  );
}
