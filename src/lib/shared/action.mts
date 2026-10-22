import type { Context } from "./context.mts";

export type Details = Record<string, unknown>;

export type Outcome<T> =
  | { status: "done"; value: T }
  | { status: "failed"; value: T }
  | { status: "refused"; message: string; details: Details };

export type Action<I, O> = (input: I, context: Context) => Promise<Outcome<O>>;

export const EXIT = { done: 0, failed: 2, refused: 2, usage: 1, crash: 1 } as const;

export type ExitCode = (typeof EXIT)[keyof typeof EXIT];

export function done<T>(value: T): Outcome<T> {
  return { status: "done", value };
}

export function failed<T>(value: T): Outcome<T> {
  return { status: "failed", value };
}

export const refuse = (message: string, details: Details = {}): Outcome<never> => ({ status: "refused", message, details });

export class Refused extends Error {
  details: Details;
  constructor(message: string, details: Details = {}) {
    super(message);
    this.details = details;
  }
}

export function action<I, O>(run: Action<I, O>): Action<I, O> {
  return async (input, context) => {
    try {
      return await run(input, context);
    } catch (err) {
      if (err instanceof Refused) return refuse(err.message, err.details);
      throw err;
    }
  };
}

export function describeExit<T>(outcome: Outcome<T>): { code: ExitCode; json: unknown } {
  if (outcome.status === "refused") return { code: EXIT.refused, json: { ok: false, error: outcome.message, ...outcome.details } };
  return { code: EXIT[outcome.status], json: outcome.value };
}
