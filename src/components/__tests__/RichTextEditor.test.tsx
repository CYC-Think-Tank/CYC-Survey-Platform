import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RichTextEditor } from '../RichTextEditor';

vi.mock('@tiptap/react', () => ({
  useEditor: ({ onUpdate, content, editable }: any) => {
    const getHTML = () => content || '<p></p>';
    const getText = () => content?.replace(/<[^>]*>?/gm, '') || '';
    const commands = {
      setContent: (newContent: string) => {
        if (onUpdate) {
          onUpdate({ editor: { getHTML: () => newContent } });
        }
      },
      toggleBold: () => ({ run: vi.fn() }),
      toggleItalic: () => ({ run: vi.fn() }),
      toggleUnderline: () => ({ run: vi.fn() }),
      toggleHighlight: () => ({ run: vi.fn() }),
      setColor: () => ({ run: vi.fn() }),
      unsetColor: () => ({ run: vi.fn() }),
      focus: () => ({ run: vi.fn() }),
    };
    const isActive = () => false;
    return { getHTML, getText, commands, isActive, chain: () => commands };
  },
  EditorContent: ({ editor }: any) => (
    <div data-testid="editor-content">{editor?.getHTML()}</div>
  ),
}));

vi.mock('@tiptap/starter-kit', () => ({ StarterKit: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-underline', () => ({ Underline: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-highlight', () => ({ Highlight: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-text-style', () => ({ TextStyle: { configure: () => ({}) } }));
vi.mock('@tiptap/extension-color', () => ({ Color: { configure: () => ({}) } }));

describe('RichTextEditor', () => {
  it('renders with placeholder', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} placeholder="Type here..." />);
    expect(screen.getByText('Type here...')).toBeInTheDocument();
  });

  it('renders toolbar buttons', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} />);
    expect(screen.getByTitle('Bold')).toBeInTheDocument();
    expect(screen.getByTitle('Italic')).toBeInTheDocument();
    expect(screen.getByTitle('Underline')).toBeInTheDocument();
    expect(screen.getByTitle('Highlight')).toBeInTheDocument();
  });

  it('does not render toolbar in readOnly mode', () => {
    const onChange = vi.fn();
    render(<RichTextEditor value="" onChange={onChange} readOnly={true} />);
    expect(screen.queryByTitle('Bold')).not.toBeInTheDocument();
  });

  it('renders in disabled state when readOnly', () => {
    const onChange = vi.fn();
    const { container } = render(<RichTextEditor value="test content" onChange={onChange} readOnly={true} />);
    expect(container.querySelector('.opacity-70')).toBeInTheDocument();
  });
});
