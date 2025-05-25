function inferType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return String(value);
  }

  if (typeof value !== 'string') return value;

  const trimmedValue = value.trim();
  if (trimmedValue === '') return null;

  const lowerValue = trimmedValue.toLowerCase();
  if (lowerValue === 'true') return true;
  if (lowerValue === 'false') return false;
  if (['null', 'undefined', 'vide', 'na', 'n/a'].includes(lowerValue)) return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
    const num = Number(trimmedValue);
    if (!isNaN(num)) return num;
  }

  const dateRegexYYYYMMDD = /^\d{4}-\d{2}-\d{2}$/;
  if (dateRegexYYYYMMDD.test(trimmedValue)) {
    const date = new Date(trimmedValue + 'T00:00:00Z');
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  const dotted = trimmedValue.match(/^(\d{1,2})[.\/\-](\d{1,2})[.\/\-](\d{2,4})$/);
  if (dotted) {
    let p1 = parseInt(dotted[1], 10);
    let p2 = parseInt(dotted[2], 10);
    let year = parseInt(dotted[3], 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;

    let day, month;
    if (p1 > 12) {
      day = p1; month = p2;
    } else if (p2 > 12) {
      day = p2; month = p1;
    } else {
      day = p1; month = p2;
    }

    if (day > 0 && day <= 31 && month > 0 && month <= 12) {
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  return value;
}

module.exports = { inferType };
