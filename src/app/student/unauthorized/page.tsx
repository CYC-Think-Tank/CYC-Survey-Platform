'use client';
import Link from 'next/link';

export default function StudentUnauthorizedPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="card w-full max-w-lg text-center">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Unauthorized</h1>
        <p className="text-gray-600 mt-3">
          This account is not authorized. Use an approved email domain or contact a team leader.
        </p>
        <Link href="/student/login" className="btn-primary inline-flex mt-6">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
