export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: { field: string; message: string }[] = []) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({ message: 'O servidor retornou uma resposta inválida.' }));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(response.status, data.message ?? 'Não foi possível concluir a operação.', data.errors);
  }
  return data;
}
