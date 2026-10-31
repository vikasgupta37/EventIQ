export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Connection failed." }));
    throw new Error(error.error ?? "Please try again.");
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
