export type HttpRequest = { method: string; url: string; headers: Record<string, string>; body: string | null; timeoutMs: number };
export type HttpAnswer = { status: number | null; headers: Record<string, string>; text: string; error: string | null };
export type HttpAdapter = (request: HttpRequest) => Promise<HttpAnswer>;

function causeCode(cause: unknown): string | null {
  if (typeof cause !== "object" || cause === null || !("code" in cause)) return null;
  return typeof cause.code === "string" ? cause.code : null;
}

function failureCode(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  return causeCode(err.cause) ?? err.name;
}

export function httpAdapter(fetchImpl: typeof fetch = fetch): HttpAdapter {
  return async ({ method, url, headers, body, timeoutMs }) => {
    try {
      const response = await fetchImpl(url, { method, headers, body: body ?? undefined, signal: AbortSignal.timeout(timeoutMs) });
      const text = await response.text();
      return { status: response.status, headers: Object.fromEntries(response.headers), text, error: null };
    } catch (err) {
      return { status: null, headers: {}, text: "", error: failureCode(err) };
    }
  };
}
