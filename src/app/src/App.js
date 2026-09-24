import { useCallback, useEffect, useState } from 'react';
import './App.css';

const TODOS_URL = 'http://localhost:8000/todos/';

export function App() {
  const [todos, setTodos] = useState([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(TODOS_URL);
      if (!response.ok) throw new Error('Could not load todos.');
      setTodos(await response.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos().catch((err) => setError(err.message));
  }, [loadTodos]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const cleaned = description.trim();
    if (!cleaned || cleaned.length > 200) {
      setError('Description must be 200 characters.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(TODOS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: cleaned }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = typeof body?.error === 'string'
          ? body.error
          : 'Could not save todo.';
        throw new Error(message);
      }

      setDescription('');
      await loadTodos();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="App">
      <h1>List of TODOs</h1>
      {loading && <p role="status">Loading todos…</p>}
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.description}</li>
        ))}
      </ul>

      <h2>Create a ToDo</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="todo">ToDo: </label>
        <input
          id="todo"
          type="text"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={200}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Add ToDo!'}
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default App;
