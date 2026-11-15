export type HttpRequest = { method: string; url: string; headers: Record<string, string>; body: string | null; timeoutMs: number };
export type HttpAnswer = { status: number | null; headers: Record<string, string>; text: string; error: string | null };
export type HttpAdapter = (request: HttpRequest) => Promise<HttpAnswer>;

function failureCode(err: unknown): string {
  const failure = err as { cause?: { code?: string }; name?: string; message?: string };
  return failure.cause?.code ?? failure.name ?? String(failure.message);
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
