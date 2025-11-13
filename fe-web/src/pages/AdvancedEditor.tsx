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
  conceptCheckCount: number;
  data: Array<{
    s_title: string;
    contents: string;
    ss_titles?: Array<{
      ss_title?: string;
      contents?: string;
    }>;
  }>;
  pdfId: number;
  filename: string;
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
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

  useEffect(() => {
    if (initialChapters && initialChapters.length > 0) {
      setChapters(initialChapters);
      setActiveChapterId(initialChapters[0].id);
    } else {
      const defaultContent = extractedText || '<p>내용을 입력하세요...</p>';
      setChapters([
        {
          id: '1',
          title: '챕터 1',
          content: defaultContent,
          type: 'content',
        },
      ]);
      setActiveChapterId('1');
    }
  }, [initialChapters, extractedText]);

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

  // 🔥 에디터 업데이트 감지 + 분할선 자동 감지
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

      // 🔥 분할선 존재 여부 확인
      const hasChapterBreak = /<hr[^>]*data-chapter-break=["']true["'][^>]*>/gi.test(newContent);
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
        title: '최소 하나의 챕터가 필요합니다',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    Swal.fire({
      title: '챕터를 삭제하시겠습니까?',
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
          title: '챕터가 삭제되었습니다',
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
      chapters.reduce(
        (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
        0,
      ) + 1;

    const first = parts[0];
    const rest = parts.slice(1);

    setChapters((prev) => {
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
        return {
          id: nextId,
          title: extractTitle(content, `챕터 ${nextId}`),
          content,
          type: 'content',
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

    const mergedContent = selected.map((ch) => ch.content).join('\n<hr class="ae-chapter-divider" />\n');
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
        const titleInput = document.getElementById('mergedTitle') as HTMLInputElement;
        return titleInput?.value || mergedTitle;
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const newTitle = result.value;
        const firstId = selected[0].id;

        setChapters((prev) => {
          const unselected = prev.filter((ch) => !selectedChapters.has(ch.id));
          const merged: Chapter = {
            id: firstId,
            title: newTitle,
            content: mergedContent,
            type: 'content',
          };
          
          return [...unselected, merged].sort((a, b) => parseInt(a.id) - parseInt(b.id));
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
      const response = await fetch(`${API_BASE}/api/pdf/${pdfId}/concept-check`, {
        method: 'GET',
        headers: {
          accept: '*/*',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('문제를 불러오지 못했습니다');
      }

      const data: ConceptCheckResponse = await response.json();
      
      await Swal.close();

      if (!data.data || data.data.length === 0) {
        Swal.fire({
          icon: 'info',
          title: '문제가 없습니다',
          text: '이 자료에는 개념 체크 문제가 없습니다',
          confirmButtonColor: '#192b55',
        });
        return;
      }

      const quizChapters: Chapter[] = data.data.map((quiz, idx) => {
        const maxId = chapters.reduce(
          (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
          0,
        );
        
        let content = `<h2>${quiz.s_title}</h2>\n`;
        content += `<div class="quiz-content">\n${quiz.contents.replace(/\n/g, '<br/>')}\n</div>\n`;
        
        if (quiz.ss_titles && quiz.ss_titles.length > 0) {
          quiz.ss_titles.forEach((ss) => {
            if (ss.ss_title) {
              content += `<h3>${ss.ss_title}</h3>\n`;
            }
            if (ss.contents) {
              content += `<p>${ss.contents.replace(/\n/g, '<br/>')}</p>\n`;
            }
          });
        }

        return {
          id: String(maxId + idx + 1),
          title: `📝 ${quiz.s_title}`,
          content,
          type: 'quiz',
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
      title: '문제 추가',
      html: `
        <input id="quizTitle" class="swal2-input" placeholder="문제 제목 (예: 개념 Check)" />
        <textarea id="quizContent" class="swal2-textarea" placeholder="문제 내용을 입력하세요..." rows="6"></textarea>
      `,
      showCancelButton: true,
      confirmButtonColor: '#192b55',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '추가',
      cancelButtonText: '취소',
      reverseButtons: true,
      preConfirm: () => {
        const titleInput = document.getElementById('quizTitle') as HTMLInputElement;
        const contentInput = document.getElementById('quizContent') as HTMLTextAreaElement;
        
        const title = titleInput?.value.trim();
        const content = contentInput?.value.trim();

        if (!title || !content) {
          Swal.showValidationMessage('제목과 내용을 모두 입력하세요');
          return null;
        }

        return { title, content };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const maxId = chapters.reduce(
          (max, ch) => Math.max(max, parseInt(ch.id, 10) || 0),
          0,
        );

        const newQuiz: Chapter = {
          id: String(maxId + 1),
          title: `📝 ${result.value.title}`,
          content: `<h2>${result.value.title}</h2>\n<p>${result.value.content.replace(/\n/g, '<br/>')}</p>`,
          type: 'quiz',
        };

        setChapters((prev) => [...prev, newQuiz]);
        setActiveChapterId(newQuiz.id);

        Swal.fire({
          icon: 'success',
          title: '문제가 추가되었습니다',
          confirmButtonColor: '#192b55',
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

  const handlePublish = () => {
    if (!materialTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '제목을 입력하세요',
        confirmButtonColor: '#192b55',
      });
      return;
    }

    Swal.fire({
      icon: 'success',
      title: '발행되었습니다!',
      text: `"${materialTitle}" 발행 완료`,
      confirmButtonColor: '#192b55',
    }).then(() => {
      setHasUnsavedChanges(false);
      onPublish(materialTitle, chapters, selectedLabel);
    });
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
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px',
        color: '#192b55'
      }}>
        에디터 초기화 중...
      </div>
    );
  }

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

      {/* 🆕 새로운 레이아웃 */}
      <div className="ae-layout">
        {/* 🆕 오른쪽 챕터 사이드바 */}
        <aside className="ae-chapter-sidebar">
          <div className="ae-sidebar-header">
            <h3>챕터 목록</h3>
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
                className={`ae-chapter-item ${activeChapterId === ch.id ? 'active' : ''} ${
                  ch.type === 'quiz' ? 'quiz-item' : ''
                } ${mergeMode && selectedChapters.has(ch.id) ? 'selected' : ''}`}
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

        <div className="ae-main">
          {/* 🔥 개선된 툴바 */}
          <div className="ae-toolbar-enhanced">
            <div className="ae-toolbar-section">
              <button
                onClick={insertChapterBreak}
                disabled={!editor}
                className={`ae-tool-btn-new split ${isSplitMode ? 'active' : ''}`}
                title="분할선 추가"
              >
                <Scissors size={18} />
                <span>분할선</span>
              </button>
              <button
                onClick={splitByChapterBreaks}
                disabled={!editor || !isSplitMode}
                className="ae-tool-btn-new split"
                title="챕터 분할"
              >
                분할 실행
              </button>
            </div>

            <div className="ae-toolbar-divider" />

            <div className="ae-toolbar-section">
              <button
                onClick={toggleMergeMode}
                className={`ae-tool-btn-new merge ${mergeMode ? 'active' : ''}`}
                title="챕터 병합"
              >
                <Merge size={18} />
                <span>{mergeMode ? '병합 취소' : '챕터 병합'}</span>
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
                  <span>AI 생성 퀴즈 만들기</span>
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

          {isSplitMode && !mergeMode && (
            <div className="ae-split-hint">
              <strong>✂️ 분할 모드</strong>
              <span>
                분할선을 추가한 후 "분할 실행" 버튼을 클릭하면 챕터를 나눌 수 있습니다
              </span>
            </div>
          )}

          {mergeMode && (
            <div className="ae-merge-hint">
              <strong>🔗 병합 모드</strong>
              <span>
                병합할 챕터를 2개 이상 선택한 후 "병합하기" 버튼을 클릭하세요
              </span>
            </div>
          )}

          <div className={`ae-editor-wrapper ${activeChapter?.type === 'quiz' ? 'quiz-editor' : ''}`}>
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