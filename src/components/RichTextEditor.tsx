'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Highlighter,
  Palette,
  Heading1,
  Heading2,
  Heading3,
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
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      Color,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-sm focus:outline-none min-h-[40px] px-3 py-2 text-sm max-w-none ${className} ${readOnly ? 'opacity-70 cursor-not-allowed bg-gray-50 dark:bg-slate-800' : ''}`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync value if changed externally
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === '' && editor.getHTML() === '<p></p>')) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div
      className={`border border-gray-300 dark:border-slate-600 rounded-md overflow-hidden bg-white dark:bg-slate-800 transition-all ${readOnly ? 'opacity-70 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-[var(--color-cyc-primary)] focus-within:border-transparent'}`}
    >
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 p-1">
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

          <div className="w-px h-5 bg-gray-300 mx-1"></div>

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

          <div className="w-px h-5 bg-gray-300 mx-1"></div>

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 dark:bg-slate-600 transition-colors ${editor.isActive('highlight') ? 'bg-gray-200 dark:bg-slate-600 text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}
            title="Highlight"
          >
            <Highlighter className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-gray-300 mx-1"></div>

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
                {/* Invisible overlay to catch outside clicks */}
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
                    className="w-5 h-5 rounded-full border border-gray-300 dark:border-slate-600 flex items-center justify-center hover:bg-gray-100 dark:bg-slate-700 bg-white dark:bg-slate-800"
                    title="Reset Color"
                  >
                    &times;
                  </button>
                </div>
              </>
            )}
          </div>
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
