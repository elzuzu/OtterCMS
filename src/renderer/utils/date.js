// Utility functions to parse/format dates consistently

export function formatDateToDDMMYYYY(value) {
  if (value === null || value === undefined || value === '') return value;
  let dateObj;
  if (value instanceof Date) {
    dateObj = value;
  } else if (typeof value === 'number') {
    // treat as timestamp
    dateObj = new Date(value);
  } else if (typeof value === 'string') {
    // try to parse ISO first
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      dateObj = new Date(Date.UTC(parseInt(isoMatch[1],10), parseInt(isoMatch[2],10)-1, parseInt(isoMatch[3],10)));
    } else {
      // handle dd.mm.yyyy or dd/mm/yyyy or mm/dd/yyyy etc
      const match = value.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})$/);
      if (match) {
        let d1 = parseInt(match[1], 10);
        let d2 = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        if (year < 100) year += year < 50 ? 2000 : 1900;
        let day, month;
        if (d1 > 12) {
          day = d1; month = d2;
        } else if (d2 > 12) {
          day = d2; month = d1;
        } else {
          day = d1; month = d2;
        }
        dateObj = new Date(Date.UTC(year, month-1, day));
      } else {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
    }
  }
  if (dateObj && !isNaN(dateObj.getTime())) {
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const year = dateObj.getUTCFullYear();
    return `${day}.${month}.${year}`;
  }
  return value;
}

