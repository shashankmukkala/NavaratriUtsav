/** Fetches JSON, returning null on a network error, a non-OK response, or a
 * response with no body (e.g. a 500 thrown before Supabase env vars are
 * configured) instead of letting `res.json()` throw on empty input. */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) return null;
    return data as T;
  } catch {
    return null;
  }
}

const memo = new Map<string, { at: number; promise: Promise<unknown> }>();

/** fetchJson, but repeat calls for the same URL within `ttlMs` share one
 * request — several components on a page (nav, detail card, modals) all
 * ask for the session or the payment settings, and opening each listing
 * card re-asked for the same sponsor pool. Failures aren't remembered, so
 * the next call retries. */
export function fetchJsonCached<T>(url: string, ttlMs: number = 60_000): Promise<T | null> {
  const hit = memo.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T | null>;
  const promise = fetchJson<T>(url).then((data) => {
    if (data === null) memo.delete(url);
    return data;
  });
  memo.set(url, { at: Date.now(), promise });
  return promise;
}

/** Sends a JSON request (defaults to POST) and reports success/failure with a
 * human-readable error, without letting an empty error body (e.g. a 500
 * thrown before Supabase env vars are configured) throw on `res.json()`. */
export async function sendJson<T>(
  url: string,
  body?: unknown,
  method: string = "POST"
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message = data && typeof data === "object" && "error" in data ? String(data.error) : "Something went wrong";
      return { ok: false, error: message };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
