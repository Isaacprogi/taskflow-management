import { useEffect, useState } from 'react';
import { api, errorMessage } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

export default function TasksPage() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setError('');
    try { await fn(); } catch (e) { setError(errorMessage(e)); }
  };

  useEffect(() => {
    run(async () => setTasks((await api.get('/tasks')).data.tasks)).finally(() => setLoading(false));
  }, []);

  const add = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    run(async () => {
      const { data } = await api.post('/tasks', { title });
      setTasks((t) => [data.task, ...t]);
      setTitle('');
    });
  };

  const toggle = (task) => run(async () => {
    const { data } = await api.patch(`/tasks/${task.id}`, { done: !task.done });
    setTasks((t) => t.map((x) => (x.id === task.id ? data.task : x)));
  });

  const remove = (task) => run(async () => {
    await api.delete(`/tasks/${task.id}`);
    setTasks((t) => t.filter((x) => x.id !== task.id));
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-indigo-600">TaskFlow</h1>
          <p className="text-sm text-slate-500">Hi, {user.name}</p>
        </div>
        <button onClick={logout} className="text-sm font-medium text-slate-600 underline">Log out</button>
      </header>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          placeholder="Add a task..." className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-indigo-500" />
        <button className="rounded-lg bg-indigo-600 px-4 font-semibold text-white">Add</button>
      </form>

      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-slate-500">Loading tasks...</p>}
      {!loading && tasks.length === 0 && <p className="py-10 text-center text-slate-400">No tasks yet. Add your first one.</p>}

      <ul className="space-y-2">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} className="size-5" />
            <span className={`flex-1 break-words ${t.done ? 'text-slate-400 line-through' : ''}`}>{t.title}</span>
            <button onClick={() => remove(t)} className="text-sm text-red-600" aria-label="Delete task">Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
