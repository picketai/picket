export const STALL_REPEATS = 3;

type Row = { readonly verdict: string };

const BLOCK_VERDICTS = ["DRIFT DETECTED", "PHASE STALLED"];
const AMENDED = "AMENDED";

function isBlockRow(row: Row | undefined): boolean {
  return row !== undefined && BLOCK_VERDICTS.includes(row.verdict);
}

export function newestBlockRow<R extends Row>(rows: readonly R[]): R | null {
  for (let i = rows.length - 1; i >= 0; i--) if (isBlockRow(rows[i])) return rows[i];
  return null;
}

export function amendmentsAnsweringBlocks<R extends Row>(rows: readonly R[]): R[] {
  let answered: Row | undefined;
  const answering: R[] = [];
  for (const row of rows) {
    if (row.verdict !== AMENDED) answered = row;
    else if (isBlockRow(answered)) answering.push(row);
  }
  return answering;
}
