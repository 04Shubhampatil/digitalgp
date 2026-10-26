import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
  className?: string;
}

/** Figma admin table: soft header row, 55px rows, hairline dividers. Server-component friendly. */
export function DataTable<T>({ columns, rows, rowKey, emptyMessage, className }: DataTableProps<T>) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-surface-table text-left text-[10px] font-semibold tracking-wide text-muted uppercase">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2.5 font-semibold", c.align === "right" && "text-right", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-surface-soft/60">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-3 align-middle", c.align === "right" && "text-right", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
