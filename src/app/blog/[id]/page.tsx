'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Calendar } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  tags: string[];
  author: string | null;
  thumbnail_url: string | null;
  content: string;
  created_at: string;
  is_published: boolean;
}

export default function BlogPostDetail() {
  const params = useParams();
  const id = params.id as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/blog/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Post not found');
        return res.json();
      })
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto py-24 px-4 text-center">
        <h1 className="font-display text-3xl font-normal tracking-tight text-ink mb-4">
          Post not found
        </h1>
        <p className="text-ink-soft mb-8">
          The blog post you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/blog" className="btn-primary inline-flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8 w-full">
      <div className="mb-8">
        <Link
          href="/blog"
          className="text-gray-500 hover:text-[var(--color-cyc-primary)] flex items-center mb-8 w-fit transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to all posts
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {post.tags?.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-[var(--color-cyc-primary)]/10 text-[var(--color-cyc-primary)] text-xs font-bold uppercase tracking-wider rounded-full"
            >
              {tag}
            </span>
          ))}
          {!post.is_published && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold uppercase tracking-wider rounded-full">
              Draft
            </span>
          )}
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tighter text-ink mb-6 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center text-sm text-ink-soft gap-6 border-b border-border pb-8">
          <div className="flex items-center">
            <User className="w-4 h-4 mr-2" />
            <span className="font-medium">{post.author || 'Anonymous'}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              {new Date(post.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {post.thumbnail_url && (
        <div className="mb-10 rounded-2xl overflow-hidden shadow-lg border border-gray-100 dark:border-slate-800 bg-gray-50">
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="w-full h-auto max-h-96 object-contain bg-gray-100 dark:bg-slate-900"
          />
        </div>
      )}

      {/* Uses prose from tailwind typography for styling the raw HTML from TipTap */}
      <div
        className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-ink prose-a:text-[var(--color-cyc-primary)]"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
