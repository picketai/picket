export interface FieldError {
  field: string;
  message: string;
}

const CURRENCY = /^[A-Z]{3}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyText(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function lineError(line: unknown, at: number): FieldError | null {
  const prefix = `lines[${at}]`;
  if (!isRecord(line)) return { field: prefix, message: "must be an object" };
  if (!isNonEmptyText(line.description)) return { field: `${prefix}.description`, message: "must be a non-empty string" };
  if (!Number.isInteger(line.quantity)) return { field: `${prefix}.quantity`, message: "must be a whole number of at least 0" };
  if (!Number.isInteger(line.unitPriceCents) || (line.unitPriceCents as number) < 0) return { field: `${prefix}.unitPriceCents`, message: "must be whole cents of at least 0" };
  return null;
}

export function newInvoiceError(body: unknown): FieldError | null {
  if (!isRecord(body)) return { field: "body", message: "must be a JSON object" };
  if (!isNonEmptyText(body.customer)) return { field: "customer", message: "must be a non-empty string" };
  if (typeof body.currency !== "string" || !CURRENCY.test(body.currency)) return { field: "currency", message: "must be a three-letter upper-case code" };
  if (!Array.isArray(body.lines) || body.lines.length === 0) return { field: "lines", message: "must be a non-empty list" };
  for (const [at, line] of body.lines.entries()) {
    const error = lineError(line, at);
    if (error) return error;
  }
  return null;
}
