import React, { useMemo, useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import BoldMark from '@tiptap/extension-bold';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Swal from 'sweetalert2';
import {
  ChevronLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Trash2,
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
  extractedText: string;
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
  extractedText,
  onPublish,
  onBack,
}: EditorProps) {
  const [materialTitle, setMaterialTitle] = useState(initialTitle);
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [isSplitMode, setIsSplitMode] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [chapters, setChapters] = useState<Chapter[]>([
    {
      id: '1',
      title: '챕터 1',
      content: extractedText || '<p>내용을 입력하세요...</p>',
    },
  ]);

  const [activeChapterId, setActiveChapterId] = useState('1');
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId),
    [chapters, activeChapterId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        horizontalRule: false,
      }),
      BoldMark,
      ChapterBreak,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Subscript,
      Superscript,
    ],
    content: activeChapter?.content || '<p>내용을 입력하세요...</p>',
    immediatelyRender: false,
  });

  useEffect(() => {
    setMaterialTitle(initialTitle);
  }, [initialTitle]);

  useEffect(() => {
    if (editor && activeChapter) {
      editor.commands.setContent(activeChapter.content);
    }
  }, [activeChapterId, editor, activeChapter]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      if (activeChapter) {
        setChapters((prev) =>
          prev.map((ch) =>
            ch.id === activeChapterId
              ? { ...ch, content: editor.getHTML() }
              : ch,
          ),
        );
        setHasUnsavedChanges(true);
      }
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, activeChapterId, activeChapter]);

  useEffect(() => {
    if (materialTitle !== initialTitle) {
      setHasUnsavedChanges(true);
    }
  }, [materialTitle, initialTitle]);

  const handleAddChapter = () => {
    const newId = String(
      Math.max(...chapters.map((c) => parseInt(c.id)), 0) + 1,
    );
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

    const baseIndex = Math.max(...chapters.map((c) => parseInt(c.id)), 0) + 1;
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
              class="ae-label-option ${selectedLabel === label.id ? 'active' : ''}" 
              data-label="${label.id}"
              style="background-color: ${label.color}; ${
                selectedLabel === label.id ? `border: 3px solid ${label.color};` : ''
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

  const activeIf = (condition: boolean) => (condition ? 'active' : '');

  return (
    <div className={`ae-root ${darkMode ? 'dark' : ''}`}>
      {/* ===== Header ===== */}
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

      {/* ===== Chapter Tabs ===== */}
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

      {/* ===== Main Content ===== */}
      <div className="ae-main">
        {/* Toolbar */}
        <div className="ae-toolbar">
          <div className="ae-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('bold'))}`}
              title="굵게"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('italic'))}`}
              title="기울임"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('underline'))}`}
              title="밑줄"
            >
              <UnderlineIcon size={16} />
            </button>
            <div className="ae-divider" />
            <button
              onClick={() => editor?.chain().focus().toggleHighlight().run()}
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('highlight'))}`}
              title="하이라이트"
            >
              <Highlighter size={16} />
            </button>
          </div>

          <div className="ae-toolbar-group">
            <button
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 1 }).run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('heading', { level: 1 }))}`}
              title="제목 1"
            >
              <Heading1 size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('heading', { level: 2 }))}`}
              title="제목 2"
            >
              <Heading2 size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 3 }).run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('heading', { level: 3 }))}`}
              title="제목 3"
            >
              <Heading3 size={16} />
            </button>
          </div>

          <div className="ae-toolbar-group">
            <button
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('bulletList'))}`}
              title="글머리"
            >
              <List size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().toggleOrderedList().run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive('orderedList'))}`}
              title="번호"
            >
              <ListOrdered size={16} />
            </button>
          </div>

          <div className="ae-toolbar-group">
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign('left').run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive({ textAlign: 'left' }))}`}
              title="왼쪽 정렬"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign('center').run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive({ textAlign: 'center' }))}`}
              title="중앙 정렬"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign('right').run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive({ textAlign: 'right' }))}`}
              title="오른쪽 정렬"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() =>
                editor?.chain().focus().setTextAlign('justify').run()
              }
              disabled={!editor}
              className={`ae-tool-btn ${activeIf(editor?.isActive({ textAlign: 'justify' }))}`}
              title="양쪽 정렬"
            >
              <AlignJustify size={16} />
            </button>
          </div>

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

        {/* Split Hint */}
        {isSplitMode && (
          <div className="ae-split-hint">
            <strong>✂️ 분할 모드</strong>
            <span> : 가위 메뉴로 분할선을 추가한 후 "분할" 을 클릭하면 챕터를 나눌 수 있습니다</span>
          </div>
        )}

        {/* Editor */}
        <div className="ae-editor-wrapper">
          <EditorContent editor={editor} className="ae-editor" />
        </div>
      </div>
    </div>
  );
}