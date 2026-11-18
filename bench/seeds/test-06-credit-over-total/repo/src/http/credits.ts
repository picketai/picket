export interface CreditNote {
  id: string;
  invoiceId: string;
  amountCents: number;
  reason: string;
}

export interface CreditError {
  field: string;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function creditError(body: unknown): CreditError | null {
  if (!isRecord(body)) return { field: "body", message: "must be a JSON object" };
  if (!Number.isInteger(body.amountCents) || (body.amountCents as number) < 1) return { field: "amountCents", message: "must be whole cents of at least 1" };
  if (typeof body.reason !== "string" || body.reason.trim() === "") return { field: "reason", message: "must be a non-empty string" };
  return null;
}

export class CreditNotes {
  private notes: CreditNote[] = [];

  issue(invoiceId: string, amountCents: number, reason: string): CreditNote {
    const note = { id: `CN-${this.notes.length + 1}`, invoiceId, amountCents, reason };
    this.notes.push(note);
    return note;
  }

  forInvoice(invoiceId: string): CreditNote[] {
    return this.notes.filter((note) => note.invoiceId === invoiceId);
  }
}
