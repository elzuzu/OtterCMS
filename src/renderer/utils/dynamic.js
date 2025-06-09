import { parseExpression, evaluateAst } from './safeExpression';

export function evaluateDynamicField(formula, values = {}) {
  if (!formula) return '';
  try {
    let expr = formula.replace(/\{([^}]+)\}/g, (_, key) => JSON.stringify(values[key]));
    const ifRegex = /^\s*if\s+(.*?)\s+then\s+(.*?)\s+else\s+(.*)$/i;
    if (ifRegex.test(expr)) {
      expr = expr.replace(ifRegex, '($1 ? $2 : $3)');
    }
    const ast = parseExpression(expr);
    const result = evaluateAst(ast);
    return result === undefined ? '' : result;
  } catch (e) {
    console.error('Erreur évaluation champ dynamique:', e);
    return '';
  }
}
