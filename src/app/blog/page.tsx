'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  tags: string[];
  author: string | null;
  thumbnail_url: string | null;
  content: string; // Used for snippet if needed
  created_at: string;
}

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/blog')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
          const allTags = data.flatMap((p) => p.tags || []);
          const uniqueTags = Array.from(new Set(allTags.filter(Boolean)));
          setTags(uniqueTags.sort());
        } else {
          console.error('Invalid data format received from API', data);
          setPosts([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch posts', err);
        setLoading(false);
      });
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const filteredPosts =
    selectedTags.length === 0
      ? posts
      : posts.filter((p) => selectedTags.every((tag) => p.tags?.includes(tag)));

  const getExcerpt = (html: string) => {
    // Strip HTML tags and limit to 150 characters
    const text = html.replace(/<[^>]*>?/gm, '');
    return text.length > 150 ? text.substring(0, 150) + '...' : text;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100 mb-4">
          Publications
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-400 max-w-2xl mx-auto">
          Explore our latest insights, publications, and updates on issues that matter.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar filters */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-slate-100">Tags</h2>
            <ul className="space-y-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <li key={tag}>
                    <button
                      onClick={() => toggleTag(tag)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-[var(--color-cyc-primary)]/10 text-[var(--color-cyc-primary)] font-semibold'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{tag}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[var(--color-cyc-primary)]"></span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="w-full mt-4 text-xs font-medium text-gray-500 hover:text-[var(--color-cyc-primary)] transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Post Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-12 text-center">
              <p className="text-gray-500 dark:text-slate-400 text-lg">
                No posts found for the selected category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 xl:gap-8">
              {filteredPosts.map((post) => (
                <Link
                  href={`/blog/${post.id}`}
                  key={post.id}
                  className="group flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow h-full"
                >
                  <div className="aspect-[16/9] w-full bg-gray-100 dark:bg-slate-700 relative overflow-hidden">
                    {post.thumbnail_url ? (
                      <img
                        src={post.thumbnail_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-slate-500 font-medium bg-gradient-to-br from-gray-50 to-gray-200 dark:from-slate-800 dark:to-slate-700">
                        No Image
                      </div>
                    )}
                    <div className="absolute top-4 left-4 flex flex-wrap gap-1 max-w-full overflow-hidden">
                      {post.tags?.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[var(--color-cyc-primary)] text-xs font-bold uppercase tracking-wider rounded-full shadow-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center text-xs text-gray-500 dark:text-slate-400 mb-3 space-x-2">
                      <span>
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <span>&bull;</span>
                      <span>{post.author || 'Anonymous'}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-3 group-hover:text-[var(--color-cyc-primary)] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 dark:text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                      {getExcerpt(post.content)}
                    </p>
                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-700">
                      <span className="text-[var(--color-cyc-primary)] font-semibold text-sm flex items-center group-hover:underline">
                        Read full article &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
