'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const payload = await response.json();
        setError(payload.error ?? 'Invalid access key');
        return;
      }

      const redirectTo = searchParams.get('from') ?? '/';
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-10 shadow-2xl shadow-slate-900/40"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Access</h1>
          <p className="mt-2 text-sm text-slate-400">
            Enter the secure dashboard access key to manage your phone assistant.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="key" className="block text-sm font-medium text-slate-200">
            Access Key
          </label>
          <input
            id="key"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-50 shadow focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="••••••"
            required
            disabled={loading}
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-500/90 px-4 py-2 font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {loading ? 'Verifying…' : 'Unlock dashboard'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={(
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-8 py-6 text-sm text-slate-300">Loading…</div>
      </div>
    )}>
      <LoginForm />
    </Suspense>
  );
}
