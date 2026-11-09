/**
 * RFC 4180 Compliant CSV Parser & Generator
 */

/**
 * Escapes a single cell value for CSV output
 */
export function escapeCSVCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // If value is a Date instance
  if (value instanceof Date) {
    str = value.toISOString();
  }

  // If value contains comma, quotes, or newlines, quote it and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats an array of objects into a CSV string
 * @param {Array<{ header: string, key?: string, value?: (row: any) => any }>} columns
 * @param {Array<Object>} rows
 * @returns {string} CSV formatted string
 */
export function formatCSV(columns, rows) {
  const headerLine = columns.map((col) => escapeCSVCell(col.header)).join(',');

  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        let val;
        if (typeof col.value === 'function') {
          val = col.value(row);
        } else if (col.key) {
          val = row[col.key];
        } else {
          val = '';
        }
        return escapeCSVCell(val);
      })
      .join(',')
  );

  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * Parses a CSV string or Buffer into an array of objects
 * @param {string|Buffer} input
 * @returns {{ headers: string[], rows: Object[] }}
 */
export function parseCSV(input) {
  const text = (Buffer.isBuffer(input) ? input.toString('utf8') : String(input || '')).replace(
    /^\uFEFF/,
    ''
  ); // strip BOM

  const lines = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      currentCell = '';
      if (currentRow.some((cell) => cell.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].map((h) => h.trim());
  const rows = [];

  for (let r = 1; r < lines.length; r++) {
    const rowValues = lines[r];
    const rowObj = {};
    for (let c = 0; c < headers.length; c++) {
      rowObj[headers[c]] = rowValues[c] !== undefined ? rowValues[c] : '';
    }
    rows.push(rowObj);
  }

  return { headers, rows };
}

/**
 * Sends a CSV download response with standard headers
 */
export function sendCSVResponse(res, filename, columns, rows) {
  const csvContent = formatCSV(columns, rows);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(csvContent);
}

export default {
  escapeCSVCell,
  formatCSV,
  parseCSV,
  sendCSVResponse,
};
