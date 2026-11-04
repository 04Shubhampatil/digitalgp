/**
 * Minimal RFC 4180 CSV writer for admin exports.
 *
 * Cells are quoted when needed, and cells that a spreadsheet would treat as a formula
 * (starting with = + - @ or a tab / carriage return) are prefixed with an apostrophe so an
 * exported value typed by a citizen or admin can never run as a formula (CSV injection).
 */
export type CsvValue = string | number | boolean | null | undefined | Date;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !(typeof value === "number")) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: readonly string[], rows: readonly (readonly CsvValue[])[]): string {
  // BOM so Excel opens Marathi text as UTF-8.
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
      "cache-control": "no-store",
    },
  });
}

/** Maximum rows in one export; narrow the filters for more. */
export const EXPORT_MAX_ROWS = 5000;
