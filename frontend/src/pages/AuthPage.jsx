import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (isSignup && form.password.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    try {
      await (isSignup ? signup(form) : login({ email: form.email, password: form.password }));
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-3xl font-bold text-indigo-600">TaskFlow</h1>
      <form onSubmit={submit} className="space-y-3">
        {isSignup && <input className={input} placeholder="Name" value={form.name} onChange={set('name')} required />}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input className={input} type="password" placeholder="Password" value={form.password} onChange={set('password')} required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white disabled:opacity-50">
          {busy ? 'Please wait...' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        {isSignup ? 'Already have an account?' : 'No account yet?'}{' '}
        <Link className="font-medium text-indigo-600" to={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'Log in' : 'Sign up'}
        </Link>
      </p>
    </main>
  );
}
