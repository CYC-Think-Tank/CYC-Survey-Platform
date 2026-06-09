'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Palette,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder,
  className = '',
  readOnly = false,
}: RichTextEditorProps) => {
  const [showColors, setShowColors] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      ImageExtension.configure({
        HTMLAttributes: {
          class:
            'rounded-lg max-h-[500px] object-contain my-4 w-auto mx-auto border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class:
            'border-collapse table-auto w-full border border-gray-300 dark:border-slate-600 my-4 shadow-sm',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class:
            'border border-gray-300 dark:border-slate-600 p-2 bg-gray-100 dark:bg-slate-800 font-bold text-left',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 dark:border-slate-600 p-2 relative',
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none min-h-[150px] px-3 py-2 text-sm max-w-none ${className} ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-slate-800' : ''}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === '' && editor.getHTML() === '<p></p>')) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      if (data.url) {
        editor.chain().focus().setImage({ src: data.url }).run();
      }
    } catch {
      alert('Image upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      className={`border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden bg-white dark:bg-slate-800 transition-all ${readOnly ? 'opacity-70 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-[var(--color-cyc-primary)] focus-within:border-transparent'}`}
    >
      {!readOnly && (
        <div className="flex flex-col border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
          <div className="flex flex-wrap items-center gap-1 p-1">
            {/* Formatting */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('bold') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('italic') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('underline') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Underline"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1"></div>

            {/* Colors */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('highlight') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Highlight"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => setShowColors(!showColors)}
                className="p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors text-gray-600 dark:text-slate-400 flex items-center"
                title="Text Color"
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColors && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowColors(false)}></div>
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg rounded p-2 flex gap-1 z-20">
                    {[
                      '#000000',
                      '#ef4444',
                      '#f97316',
                      '#eab308',
                      '#22c55e',
                      '#3b82f6',
                      '#0cb7c4',
                      '#04377e',
                      '#a855f7',
                    ].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          editor.chain().focus().setColor(color).run();
                          setShowColors(false);
                        }}
                        className="w-5 h-5 rounded-full border border-gray-300 dark:border-slate-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        editor.chain().focus().unsetColor().run();
                        setShowColors(false);
                      }}
                      className="w-5 h-5 rounded-full border border-gray-300 dark:border-slate-600 flex items-center justify-center hover:bg-gray-100 dark:bg-slate-700 bg-white dark:bg-slate-800 text-xs"
                      title="Reset Color"
                    >
                      &times;
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1"></div>

            {/* Headings */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1"></div>

            {/* Alignments */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1"></div>

            {/* Lists & Quotes */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Ordered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Blockquote"
            >
              <Quote className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1"></div>

            {/* Links, Images, Tables */}
            <button
              type="button"
              onClick={addLink}
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('link') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
              title="Insert Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>

            <label
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors cursor-pointer ${isUploading ? 'opacity-50 animate-pulse' : 'text-gray-600 dark:text-slate-400'}`}
              title="Upload Image"
            >
              <ImageIcon className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={handleImageUpload}
              />
            </label>

            <button
              type="button"
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
              }
              className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors text-gray-600 dark:text-slate-400`}
              title="Insert Table"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Contextual Table Tools */}
          {editor.isActive('table') && (
            <div className="flex flex-wrap items-center gap-1 p-1 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/30">
              <span className="text-xs font-semibold text-yellow-800 dark:text-yellow-500 mr-2 ml-1">
                Table:
              </span>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                + Col Before
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                + Col After
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
              >
                - Del Col
              </button>

              <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>

              <button
                type="button"
                onClick={() => editor.chain().focus().addRowBefore().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                + Row Before
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                + Row After
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
              >
                - Del Row
              </button>

              <div className="w-px h-4 bg-gray-300 dark:bg-slate-600 mx-1"></div>

              <button
                type="button"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 font-medium"
              >
                Delete Table
              </button>
            </div>
          )}
        </div>
      )}

      {/* Editor Area */}
      <div className="relative">
        {!editor.getText() && placeholder && (
          <div className="absolute inset-y-0 left-0 px-3 py-2 text-sm text-gray-400 dark:text-slate-500 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
