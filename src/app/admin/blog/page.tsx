'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Edit3, Trash2, ArrowLeft, Check, X } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  tags: string[];
  author: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminBlogDashboard() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = () => {
    fetch('/api/blog?include_unpublished=true')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
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
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (post: BlogPost) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${post.title}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPosts();
      } else {
        alert('Failed to delete post.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting.');
    }
  };

  const handleTogglePublish = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/blog/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !post.is_published }),
      });
      if (res.ok) {
        fetchPosts();
      } else {
        alert('Failed to update post.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-cyc-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 sm:gap-0">
        <div>
          <Link href="/admin" className="text-gray-500 hover:text-gray-700 flex items-center mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-[var(--color-cyc-secondary)] dark:text-slate-100">
            Blog Management
          </h1>
          <p className="text-gray-500 dark:text-slate-500 mt-1">
            Create and manage blog posts for the think tank.
          </p>
        </div>
        <div>
          <Link href="/admin/blog/create" className="btn-primary flex items-center">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Post
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow border border-gray-200 dark:border-slate-700 overflow-x-auto overflow-y-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 dark:bg-slate-900/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                Title & Tags
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                Author
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50 dark:bg-slate-900/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-[var(--color-cyc-secondary)] dark:text-slate-100">
                    {post.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {post.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[var(--color-cyc-primary)]/10 text-[var(--color-cyc-primary)] text-[10px] font-bold uppercase tracking-wider rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {post.author || 'Anonymous'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${post.is_published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {post.is_published ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => handleTogglePublish(post)}
                      className={`flex items-center ${post.is_published ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                      title={post.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {post.is_published ? (
                        <X className="w-4 h-4 mr-1" />
                      ) : (
                        <Check className="w-4 h-4 mr-1" />
                      )}
                      {post.is_published ? 'Unpublish' : 'Publish'}
                    </button>

                    <Link
                      href={`/admin/blog/edit/${post.id}`}
                      className="text-[var(--color-cyc-primary)] hover:text-teal-700 flex items-center"
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(post)}
                      className="text-red-500 hover:text-red-700 ml-2"
                      title="Delete Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No blog posts found. Create one to get started!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
