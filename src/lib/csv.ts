/**
 * Minimal CSV export.
 *
 * Values are quoted and inner quotes doubled so commas, newlines and quotes in
 * client names or descriptions cannot break the columns. A BOM is prepended so
 * Excel opens UTF-8 (and Bengali text) correctly rather than as mojibake.
 */

export type CsvRow = (string | number)[];

export function toCsv(rows: CsvRow[]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null || cell === undefined ? "" : String(cell);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(",")
    )
    .join("\r\n");
}

export function downloadCsv(filename: string, rows: CsvRow[]): void {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
