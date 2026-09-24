import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

afterEach(() => {
  jest.resetAllMocks();
});

test('shows loading state before displaying todos from the API', async () => {
  let finishRequest;
  global.fetch = jest.fn(() => new Promise((resolve) => { finishRequest = resolve; }));

  render(<App />);

  expect(screen.getByText(/loading todos/i)).toBeInTheDocument();
  finishRequest({ ok: true, json: async () => [
    { id: 'todo-1', description: 'Learn Docker' },
  ] });
  expect(await screen.findByText('Learn Docker')).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByText(/loading todos/i)).not.toBeInTheDocument();
  });
});

test('posts a todo and refreshes the list', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: true, json: async () => ({
      id: 'todo-1', description: 'Learn Mongo',
    }) })
    .mockResolvedValueOnce({ ok: true, json: async () => [
      { id: 'todo-1', description: 'Learn Mongo' },
    ] });

  render(<App />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: /todo/i }), {
    target: { value: ' Learn Mongo ' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  expect(await screen.findByText('Learn Mongo')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(global.fetch.mock.calls[1][1]).toEqual({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'Learn Mongo' }),
  });
  expect(screen.getByRole('textbox', { name: /todo/i })).toHaveValue('');
});

test('shows API errors and keeps the unsaved input', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Save failed.' }) });

  render(<App />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: /todo/i }), {
    target: { value: 'Learn Mongo' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed.');
  expect(screen.getByRole('textbox', { name: /todo/i })).toHaveValue('Learn Mongo');
  expect(global.fetch).toHaveBeenCalledTimes(2);
});

test('rejects blank input without making a POST request', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });

  render(<App />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: /todo/i }), {
    target: { value: '   ' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  expect(screen.getByRole('alert')).toHaveTextContent(/1–200 characters/i);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test('shows a useful error when an API failure has no JSON body', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockResolvedValueOnce({ ok: false, json: async () => { throw new SyntaxError('Unexpected token'); } });

  render(<App />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: /todo/i }), {
    target: { value: 'Learn Mongo' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save todo.');
});

test('disables submit while a save is pending', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => [] })
    .mockImplementationOnce(() => new Promise(() => {}));

  render(<App />);
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByRole('textbox', { name: /todo/i }), {
    target: { value: 'Learn Mongo' },
  });
  fireEvent.click(screen.getByRole('button', { name: /add todo/i }));

  expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  expect(global.fetch).toHaveBeenCalledTimes(2);
});
