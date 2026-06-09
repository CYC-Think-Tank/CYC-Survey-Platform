'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Image as ImageIcon } from 'lucide-react';
import { RichTextEditor } from '@/components/RichTextEditor';

export default function CreateBlogPost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [existingSubjects, setExistingSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/blog/subjects')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExistingSubjects(data);
        }
      })
      .catch(console.error);
  }, []);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return await res.json();
    } catch {
      alert('File upload failed. Please try again.');
      return null;
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    const result = await uploadFile(file);
    if (result) setThumbnailUrl(result.url);
    setThumbnailUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !subject || !content) {
      setError('Title, subject, and content are required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          subject,
          content,
          author: author || null,
          thumbnail_url: thumbnailUrl || null,
          is_published: isPublished,
        }),
      });

      if (!res.ok) throw new Error('Failed to create post');

      router.push('/admin/blog');
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create post');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-8">
      <Link href="/admin/blog" className="text-gray-500 hover:text-gray-700 flex items-center mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Blog Management
      </Link>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-6">
          Create New Blog Post
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Impact of Recent Federal Policies"
              className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[var(--color-cyc-primary)] dark:bg-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Subject Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list="subject-list"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Federal Policies"
                className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[var(--color-cyc-primary)] dark:bg-slate-800 dark:text-slate-100"
                required
              />
              <datalist id="subject-list">
                {existingSubjects.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full p-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[var(--color-cyc-primary)] dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Thumbnail Image
            </label>
            <div className="flex items-center gap-4">
              {thumbnailUrl && (
                <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 border">
                  <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                <ImageIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  {thumbnailUploading
                    ? 'Uploading...'
                    : thumbnailUrl
                      ? 'Change Image'
                      : 'Upload Image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThumbnailUpload}
                  disabled={thumbnailUploading}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <div className="min-h-[300px]">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Write your blog post here..."
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-slate-700">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 text-[var(--color-cyc-primary)] border-gray-300 rounded focus:ring-[var(--color-cyc-primary)]"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                Publish immediately
              </span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex items-center px-6 py-2"
            >
              <Save className="w-4 h-4 mr-2" />
              {submitting ? 'Saving...' : 'Save Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
