import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
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
  Home,
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
} from 'lucide-react';
import './AdvancedEditor.css';

type Chapter = {
  id: string;
  title: string;
  content: string;
};

type EditorProps = {
  extractedText: string;
  onPublish: (title: string, chapters: Chapter[]) => void;
  onBack: () => void;
};

export default function AdvancedEditor({
  extractedText,
  onPublish,
  onBack,
}: EditorProps) {
  const [materialTitle, setMaterialTitle] = useState('새로운 자료');
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
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

  const activeChapter = chapters.find((c) => c.id === activeChapterId);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      Subscript,
      Superscript,
      HorizontalRule,
    ],
    content: activeChapter?.content || '<p>내용을 입력하세요...</p>',
  });

  // 챕터 전환 시 에디터 업데이트
  React.useEffect(() => {
    if (editor && activeChapter) {
      editor.commands.setContent(activeChapter.content);
    }
  }, [activeChapterId, editor]);

  // 에디터 내용 저장
  const saveChapterContent = () => {
    if (editor && activeChapter) {
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === activeChapterId
            ? { ...ch, content: editor.getHTML() }
            : ch
        )
      );
    }
  };

  const handleAddChapter = () => {
    saveChapterContent();
    const newId = String(Math.max(...chapters.map((c) => parseInt(c.id)), 0) + 1);
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
        confirmButtonColor: '#28427b',
      });
      return;
    }

    Swal.fire({
      title: '챕터를 삭제하시겠습니까?',
      text: '이 작업은 되돌릴 수 없습니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '삭제',
      cancelButtonText: '취소',
    }).then((result) => {
      if (result.isConfirmed) {
        const newChapters = chapters.filter((c) => c.id !== id);
        setChapters(newChapters);
        if (activeChapterId === id) {
          setActiveChapterId(newChapters[0].id);
        }
        Swal.fire({
          icon: 'success',
          title: '챕터가 삭제되었습니다',
          confirmButtonColor: '#28427b',
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
        confirmButtonColor: '#28427b',
      });
      return;
    }

    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, title: editingTitle } : ch
      )
    );
    setEditingChapterId(null);
  };

  const handlePublish = () => {
    saveChapterContent();

    if (!materialTitle.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '제목을 입력하세요',
        text: '자료의 제목을 입력해주세요.',
        confirmButtonColor: '#28427b',
      });
      return;
    }

    if (chapters.some((ch) => !ch.content || ch.content === '<p></p>')) {
      Swal.fire({
        icon: 'warning',
        title: '모든 챕터에 내용이 필요합니다',
        text: '비어있는 챕터가 있습니다.',
        confirmButtonColor: '#28427b',
      });
      return;
    }

    window.dispatchEvent(
      new CustomEvent('materialPublished', {
        detail: { title: materialTitle, chapters },
      })
    );

    Swal.fire({
      icon: 'success',
      title: '자료가 발행되었습니다!',
      text: '자료함으로 돌아갑니다.',
      confirmButtonColor: '#28427b',
      confirmButtonText: '확인',
    }).then(() => {
      onPublish(materialTitle, chapters);
    });
  };

  const handleBack = () => {
    Swal.fire({
      title: '돌아가시겠습니까?',
      text: '저장하지 않은 내용은 사라집니다.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#28427b',
      cancelButtonColor: '#d1d5db',
      confirmButtonText: '돌아가기',
      cancelButtonText: '계속 작성',
    }).then((result) => {
      if (result.isConfirmed) {
        onBack();
      }
    });
  };

  if (!editor) return null;

  return (
    <div className={`ae-root ${darkMode ? 'dark' : 'light'}`}>
      <header className="ae-header">
        <div className="ae-header-wrapper">
          <button className="ae-back-btn" onClick={handleBack}>
            <Home size={20} />
            <span>돌아가기</span>
          </button>

          <div className="ae-title-section">
            {showTitleInput ? (
              <input
                type="text"
                value={materialTitle}
                onChange={(e) => setMaterialTitle(e.target.value)}
                className="ae-title-input"
                onBlur={() => setShowTitleInput(false)}
                autoFocus
                maxLength={100}
              />
            ) : (
              <h1
                className="ae-title"
                onClick={() => setShowTitleInput(true)}
                title="클릭하여 제목 수정"
              >
                {materialTitle}
              </h1>
            )}
          </div>

          <div className="ae-header-actions">
            <button
              className="ae-theme-btn"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? '라이트 모드' : '다크 모드'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="ae-publish-btn" onClick={handlePublish}>
              <span>발행하기</span>
            </button>
          </div>
        </div>
      </header>

      <div className="ae-container">
        {/* Left Panel - Chapters */}
        <aside className="ae-chapters-panel">
          <div className="ae-chapters-header">
            <h2>챕터</h2>
            <button className="ae-add-chapter-btn" onClick={handleAddChapter}>
              <Plus size={18} />
            </button>
          </div>

          <div className="ae-chapters-list">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`ae-chapter-item ${
                  activeChapterId === chapter.id ? 'active' : ''
                }`}
                onClick={() => {
                  saveChapterContent();
                  setActiveChapterId(chapter.id);
                }}
              >
                {editingChapterId === chapter.id ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="ae-chapter-input"
                    onBlur={() => handleSaveChapterTitle(chapter.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveChapterTitle(chapter.id);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className="ae-chapter-name">{chapter.title}</span>
                )}

                <div className="ae-chapter-actions">
                  <button
                    className="ae-chapter-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChapterTitle(chapter.id, chapter.title);
                    }}
                    title="편집"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="ae-chapter-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChapter(chapter.id);
                    }}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Editor Area */}
        <main className="ae-editor-area">
          {/* Toolbar */}
          <div className="ae-toolbar">
            <div className="ae-toolbar-group">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`ae-tool-btn ${editor.isActive('bold') ? 'active' : ''}`}
                title="Bold"
              >
                <Bold size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`ae-tool-btn ${
                  editor.isActive('italic') ? 'active' : ''
                }`}
                title="Italic"
              >
                <Italic size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`ae-tool-btn ${
                  editor.isActive('underline') ? 'active' : ''
                }`}
                title="Underline"
              >
                <UnderlineIcon size={18} />
              </button>

              <div className="ae-divider" />

              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 1 }).run()
                }
                className={`ae-tool-btn ${
                  editor.isActive('heading', { level: 1 }) ? 'active' : ''
                }`}
                title="Heading 1"
              >
                <Heading1 size={18} />
              </button>

              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                className={`ae-tool-btn ${
                  editor.isActive('heading', { level: 2 }) ? 'active' : ''
                }`}
                title="Heading 2"
              >
                <Heading2 size={18} />
              </button>

              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                className={`ae-tool-btn ${
                  editor.isActive('heading', { level: 3 }) ? 'active' : ''
                }`}
                title="Heading 3"
              >
                <Heading3 size={18} />
              </button>
            </div>

            <div className="ae-toolbar-group">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`ae-tool-btn ${
                  editor.isActive('bulletList') ? 'active' : ''
                }`}
                title="Bullet List"
              >
                <List size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`ae-tool-btn ${
                  editor.isActive('orderedList') ? 'active' : ''
                }`}
                title="Ordered List"
              >
                <ListOrdered size={18} />
              </button>

              <div className="ae-divider" />

              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`ae-tool-btn ${
                  editor.isActive({ textAlign: 'left' }) ? 'active' : ''
                }`}
                title="Align Left"
              >
                <AlignLeft size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`ae-tool-btn ${
                  editor.isActive({ textAlign: 'center' }) ? 'active' : ''
                }`}
                title="Align Center"
              >
                <AlignCenter size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`ae-tool-btn ${
                  editor.isActive({ textAlign: 'right' }) ? 'active' : ''
                }`}
                title="Align Right"
              >
                <AlignRight size={18} />
              </button>

              <button
                onClick={() =>
                  editor.chain().focus().setTextAlign('justify').run()
                }
                className={`ae-tool-btn ${
                  editor.isActive({ textAlign: 'justify' }) ? 'active' : ''
                }`}
                title="Align Justify"
              >
                <AlignJustify size={18} />
              </button>
            </div>

            <div className="ae-toolbar-group">
              <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`ae-tool-btn ${
                  editor.isActive('highlight') ? 'active' : ''
                }`}
                title="Highlight"
              >
                <Highlighter size={18} />
              </button>

              <button
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={`ae-tool-btn ${
                  editor.isActive('subscript') ? 'active' : ''
                }`}
                title="Subscript"
              >
                <span className="ae-subscript">x₂</span>
              </button>

              <button
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={`ae-tool-btn ${
                  editor.isActive('superscript') ? 'active' : ''
                }`}
                title="Superscript"
              >
                <span className="ae-superscript">x²</span>
              </button>

              <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className="ae-tool-btn"
                title="Horizontal Rule"
              >
                <span>―</span>
              </button>
            </div>

            <div className="ae-toolbar-group">
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`ae-tool-btn ${
                  editor.isActive('blockquote') ? 'active' : ''
                }`}
                title="Blockquote"
              >
                <span>❝</span>
              </button>

              <button
                onClick={() => editor.chain().focus().undo().run()}
                className="ae-tool-btn"
                title="Undo"
              >
                <span>↶</span>
              </button>

              <button
                onClick={() => editor.chain().focus().redo().run()}
                className="ae-tool-btn"
                title="Redo"
              >
                <span>↷</span>
              </button>

              <button
                onClick={() => editor.chain().focus().clearContent().run()}
                className="ae-tool-btn danger"
                title="Clear All"
              >
                <span>⊘</span>
              </button>
            </div>
          </div>

          {/* Editor */}
          <div className="ae-editor-wrapper">
            <EditorContent editor={editor} className="ae-editor" />
          </div>
        </main>
      </div>
    </div>
  );
}