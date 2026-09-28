// Table exports for reports. Both formats get the same headers and rows.

export type ExportCell = string | number | Date | null;

export interface ExportColumn {
  header: string;
  width?: number;
}

const pad = (n: number) => String(n).padStart(2, '0');
const formatDate = (date: Date) => `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;

const csvValue = (cell: ExportCell): string => {
  if (cell === null) return '';
  const text = cell instanceof Date ? formatDate(cell) : String(cell);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const triggerDownload = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// UTF-8 with BOM so Excel shows accents correctly when it opens the file.
export const downloadCsv = (fileName: string, columns: ExportColumn[], rows: ExportCell[][]) => {
  const lines = [columns.map((c) => csvValue(c.header)), ...rows.map((row) => row.map(csvValue))].map((line) => line.join(','));
  triggerDownload(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${fileName}.csv`);
};

// Loaded on demand so the library only downloads when someone exports.
export const downloadXlsx = async (fileName: string, sheetName: string, columns: ExportColumn[], rows: ExportCell[][]) => {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const header = columns.map((c) => ({ value: c.header, fontWeight: 'bold' as const }));
  const body = rows.map((row) => row.map((cell) => {
    if (cell === null) return null;
    if (cell instanceof Date) return { value: cell, type: Date, format: 'dd/mm/yyyy' };
    if (typeof cell === 'number') return { value: cell, type: Number };
    return { value: cell, type: String };
  }));
  await writeXlsxFile([header, ...body], {
    sheet: sheetName.slice(0, 31),
    columns: columns.map((c) => ({ width: c.width ?? 18 })),
    stickyRowsCount: 1,
  }).toFile(`${fileName}.xlsx`);
};
