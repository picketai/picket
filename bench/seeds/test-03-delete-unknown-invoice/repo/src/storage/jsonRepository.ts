import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Invoice } from "../domain/invoice.js";

export interface InvoiceRepository {
  all(): Invoice[];
  byId(id: string): Invoice | undefined;
  save(invoice: Invoice): void;
  remove(id: string): boolean;
  nextId(): string;
}

interface FileShape {
  invoices: Invoice[];
}

export class JsonInvoiceRepository implements InvoiceRepository {
  private readonly path: string;

  constructor(file: string) {
    this.path = resolve(file);
  }

  private read(): FileShape {
    if (!existsSync(this.path)) return { invoices: [] };
    return JSON.parse(readFileSync(this.path, "utf8")) as FileShape;
  }

  private write(shape: FileShape): void {
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(shape, null, 2) + "\n");
  }

  all(): Invoice[] {
    return this.read().invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  byId(id: string): Invoice | undefined {
    return this.read().invoices.find((i) => i.id === id);
  }

  save(invoice: Invoice): void {
    const shape = this.read();
    const idx = shape.invoices.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) shape.invoices[idx] = invoice;
    else shape.invoices.push(invoice);
    this.write(shape);
  }

  remove(id: string): boolean {
    const shape = this.read();
    const kept = shape.invoices.filter((i) => i.id !== id);
    if (kept.length === shape.invoices.length) return false;
    this.write({ invoices: kept });
    return true;
  }

  nextId(): string {
    const ids = this.read().invoices.map((i) => Number(i.id.replace(/^INV-/, "")));
    const max = ids.length ? Math.max(...ids) : 1000;
    return `INV-${max + 1}`;
  }
}

export class MemoryInvoiceRepository implements InvoiceRepository {
  private items = new Map<string, Invoice>();
  private counter = 1000;

  constructor(seed: Invoice[] = []) {
    for (const inv of seed) {
      this.items.set(inv.id, inv);
      this.counter = Math.max(this.counter, Number(inv.id.replace(/^INV-/, "")));
    }
  }

  all(): Invoice[] {
    return [...this.items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  byId(id: string): Invoice | undefined {
    return this.items.get(id);
  }
  save(invoice: Invoice): void {
    this.items.set(invoice.id, invoice);
  }
  remove(id: string): boolean {
    return this.items.delete(id);
  }
  nextId(): string {
    this.counter += 1;
    return `INV-${this.counter}`;
  }
}
