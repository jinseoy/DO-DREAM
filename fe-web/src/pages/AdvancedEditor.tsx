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
};

type EditorProps = {
  initialTitle?: string;
  extractedText?: string;
  initialChapters?: Chapter[];
  onPublish: (title: string, chapters: Chapter[], label?: string) => void;
  onBack: () => void;
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

export default function AdvancedEditor({
  initialTitle = '새로운 자료',
  initialChapters,
  extractedText,
  onPublish,
  onBack,
}: EditorProps) {
  console.log('[AdvancedEditor] 마운트됨');
  console.log('[AdvancedEditor] 받은 props:', {
    initialTitle,
    hasInitialChapters: !!initialChapters,
    chaptersLength: initialChapters?.length,
    extractedTextLength: extractedText?.length,
    firstChapter: initialChapters?.[0],
  });

  const [materialTitle, setMaterialTitle] = useState(initialTitle);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [isSplitMode, setIsSplitMode] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string>('');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // 🔥 초기 데이터 설정
  useEffect(() => {
    console.log('[AdvancedEditor] useEffect 실행');
    console.log('[AdvancedEditor] initialChapters:', initialChapters);
    
    if (initialChapters && initialChapters.length > 0) {
      console.log('[AdvancedEditor] initialChapters로 설정');
      console.log('[AdvancedEditor] 챕터 목록:', initialChapters.map(c => ({
        id: c.id,
        title: c.title,
        contentLength: c.content.length
      })));
      
      setChapters(initialChapters);
      setActiveChapterId(initialChapters[0].id);
    } else {
      console.log('[AdvancedEditor] 기본 챕터 생성');
      const defaultContent = extractedText || '<p>내용을 입력하세요...</p>';
      setChapters([
        {
          id: '1',
          title: '챕터 1',
          content: defaultContent,
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

  // 🔥 activeChapterId 변경 시 에디터 내용 업데이트
  useEffect(() => {
    if (!editor || !activeChapterId || chapters.length === 0) return;
    
    const chapter = chapters.find((c) => c.id === activeChapterId);
    if (!chapter) return;

    const html = chapter.content || '<p>내용을 입력하세요...</p>';
    
    console.log('[AdvancedEditor] 에디터 내용 업데이트:', {
      chapterId: activeChapterId,
      title: chapter.title,
      contentLength: html.length,
      preview: html.substring(0, 100),
    });
    
    editor.commands.setContent(html);
  }, [editor, activeChapterId, chapters.length]);

  // 에디터 업데이트 감지
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
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, activeChapterId]);

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
        text: '먼저 "✂️ 분할선"을 추가해 주세요.',
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

  // 로딩 상태
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

      <div className="ae-chapter-tabs">
        <div className="ae-tabs-scroll">
          {chapters.map((ch) => (
            <div
              key={ch.id}
              className={`ae-tab ${activeChapterId === ch.id ? 'active' : ''}`}
              onClick={() => setActiveChapterId(ch.id)}
            >
              {editingChapterId === ch.id ? (
                <input
                  type="text"
                  className="ae-tab-input"
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
                  <span className="ae-tab-title">{ch.title}</span>
                  <div className="ae-tab-actions">
                    <button
                      className="ae-tab-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditChapterTitle(ch.id, ch.title);
                      }}
                      title="편집"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="ae-tab-action delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChapter(ch.id);
                      }}
                      title="삭제"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          <button
            className="ae-tab-add"
            onClick={handleAddChapter}
            title="새 챕터"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="ae-main">
        <div className="ae-toolbar">
          <div className="ae-toolbar-group">
            <button
              onClick={insertChapterBreak}
              disabled={!editor}
              className={`ae-tool-btn ${isSplitMode ? 'ae-primary' : ''}`}
              title="분할선"
            >
              <Scissors size={16} />
            </button>
            <button
              onClick={splitByChapterBreaks}
              disabled={!editor || !isSplitMode}
              className="ae-tool-btn ae-primary"
              title="분할"
            >
              분할
            </button>
          </div>
        </div>

        {isSplitMode && (
          <div className="ae-split-hint">
            <strong>✂️ 분할 모드</strong>
            <span>
              {' '}
              : 가위 메뉴로 분할선을 추가한 후 &quot;분할&quot; 을 클릭하면
              챕터를 나눌 수 있습니다
            </span>
          </div>
        )}

        <div className="ae-editor-wrapper">
          <EditorContent editor={editor} className="ae-editor" />
        </div>
      </div>
    </div>
  );
}