import { API_BASE_URL } from "./api";
export async function liveRequest<T = Record<string, any>>(
  path: string,
  token: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const r = await fetch(`${API_BASE_URL}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  const value = await r.json().catch(() => null);
  if (!r.ok)
    throw new Error(
      typeof value?.detail === "string"
        ? value.detail
        : value
          ? JSON.stringify(value)
          : `No se pudo completar la solicitud (${r.status}).`,
    );
  return value as T;
}
