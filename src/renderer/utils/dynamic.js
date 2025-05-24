export function evaluateDynamicField(formula, values = {}) {
  if (!formula) return '';
  try {
    let expr = formula.replace(/\{([^}]+)\}/g, (_, key) => `values["${key}"]`);
    const ifRegex = /^\s*if\s+(.*?)\s+then\s+(.*?)\s+else\s+(.*)$/i;
    if (ifRegex.test(expr)) {
      expr = expr.replace(ifRegex, '($1 ? $2 : $3)');
    }
    // eslint-disable-next-line no-new-func
    const fn = new Function('values', `return ${expr};`);
    const result = fn(values);
    return result === undefined ? '' : result;
  } catch (e) {
    console.error('Erreur évaluation champ dynamique:', e);
    return '';
  }
}
