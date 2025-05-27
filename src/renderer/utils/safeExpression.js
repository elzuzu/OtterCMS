export function parseExpression(expr) {
  let index = 0;

  function skipSpaces() {
    while (expr[index] === ' ' || expr[index] === '\t' || expr[index] === '\n') index++;
  }

  function parsePrimary() {
    skipSpaces();
    const char = expr[index];
    if (char === '(') {
      index++;
      const node = parseExpression();
      skipSpaces();
      if (expr[index] === ')') index++; else throw new Error('Expected )');
      return node;
    }
    if (char === '"' || char === '\'') {
      const quote = char;
      index++;
      let str = '';
      while (index < expr.length && expr[index] !== quote) {
        str += expr[index++];
      }
      if (expr[index] !== quote) throw new Error('Unclosed string');
      index++;
      return { type: 'Literal', value: str };
    }
    const numberMatch = /^(?:\d+\.\d+|\d+)/.exec(expr.slice(index));
    if (numberMatch) {
      index += numberMatch[0].length;
      return { type: 'Literal', value: parseFloat(numberMatch[0]) };
    }
    if (expr.startsWith('true', index)) { index += 4; return { type: 'Literal', value: true }; }
    if (expr.startsWith('false', index)) { index += 5; return { type: 'Literal', value: false }; }
    if (expr.startsWith('null', index)) { index += 4; return { type: 'Literal', value: null }; }
    if (expr.startsWith('undefined', index)) { index += 9; return { type: 'Literal', value: undefined }; }
    throw new Error('Unexpected token at ' + index);
  }

  function parseUnary() {
    skipSpaces();
    if (expr[index] === '!') { index++; return { type: 'UnaryExpression', operator: '!', argument: parseUnary() }; }
    if (expr[index] === '-') { index++; return { type: 'UnaryExpression', operator: '-', argument: parseUnary() }; }
    return parsePrimary();
  }

  function parseMultiplicative() {
    let node = parseUnary();
    while (true) {
      skipSpaces();
      const op = expr[index];
      if (op === '*' || op === '/' || op === '%') {
        index++; const right = parseUnary();
        node = { type: 'BinaryExpression', operator: op, left: node, right };
      } else break;
    }
    return node;
  }

  function parseAdditive() {
    let node = parseMultiplicative();
    while (true) {
      skipSpaces();
      const op = expr[index];
      if (op === '+' || op === '-') {
        index++; const right = parseMultiplicative();
        node = { type: 'BinaryExpression', operator: op, left: node, right };
      } else break;
    }
    return node;
  }

  function parseComparison() {
    let node = parseAdditive();
    while (true) {
      skipSpaces();
      if (expr.startsWith('>=', index) || expr.startsWith('<=', index) || expr[index] === '>' || expr[index] === '<') {
        let op;
        if (expr.startsWith('>=', index)) { op = '>='; index += 2; }
        else if (expr.startsWith('<=', index)) { op = '<='; index += 2; }
        else if (expr[index] === '>') { op = '>'; index++; }
        else { op = '<'; index++; }
        const right = parseAdditive();
        node = { type: 'BinaryExpression', operator: op, left: node, right };
      } else break;
    }
    return node;
  }

  function parseEquality() {
    let node = parseComparison();
    while (true) {
      skipSpaces();
      if (expr.startsWith('===', index) || expr.startsWith('!==', index) || expr.startsWith('==', index) || expr.startsWith('!=', index)) {
        let op;
        if (expr.startsWith('===', index)) { op = '==='; index += 3; }
        else if (expr.startsWith('!==', index)) { op = '!=='; index += 3; }
        else if (expr.startsWith('==', index)) { op = '=='; index += 2; }
        else { op = '!='; index += 2; }
        const right = parseComparison();
        node = { type: 'BinaryExpression', operator: op, left: node, right };
      } else break;
    }
    return node;
  }

  function parseLogicalAnd() {
    let node = parseEquality();
    while (true) {
      skipSpaces();
      if (expr.startsWith('&&', index)) {
        index += 2; const right = parseEquality();
        node = { type: 'LogicalExpression', operator: '&&', left: node, right };
      } else break;
    }
    return node;
  }

  function parseLogicalOr() {
    let node = parseLogicalAnd();
    while (true) {
      skipSpaces();
      if (expr.startsWith('||', index)) {
        index += 2; const right = parseLogicalAnd();
        node = { type: 'LogicalExpression', operator: '||', left: node, right };
      } else break;
    }
    return node;
  }

  function parseTernary() {
    let node = parseLogicalOr();
    skipSpaces();
    if (expr[index] === '?') {
      index++;
      const consequent = parseExpression();
      skipSpaces();
      if (expr[index] !== ':') throw new Error('Expected : in ternary');
      index++;
      const alternate = parseExpression();
      node = { type: 'ConditionalExpression', test: node, consequent, alternate };
    }
    return node;
  }

  const result = parseTernary();
  skipSpaces();
  if (index < expr.length) throw new Error('Unexpected input at ' + index);
  return result;
}

export function evaluateAst(node) {
  switch (node.type) {
    case 'Literal':
      return node.value;
    case 'UnaryExpression':
      if (node.operator === '!') return !evaluateAst(node.argument);
      if (node.operator === '-') return -evaluateAst(node.argument);
      throw new Error('Unsupported unary ' + node.operator);
    case 'BinaryExpression': {
      const left = evaluateAst(node.left);
      const right = evaluateAst(node.right);
      switch (node.operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': return left / right;
        case '%': return left % right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left == right;
        case '!=': return left != right;
        case '===': return left === right;
        case '!==': return left !== right;
        default: throw new Error('Unsupported operator ' + node.operator);
      }
    }
    case 'LogicalExpression': {
      if (node.operator === '&&') return evaluateAst(node.left) && evaluateAst(node.right);
      if (node.operator === '||') return evaluateAst(node.left) || evaluateAst(node.right);
      throw new Error('Unsupported logical ' + node.operator);
    }
    case 'ConditionalExpression':
      return evaluateAst(node.test) ? evaluateAst(node.consequent) : evaluateAst(node.alternate);
    default:
      throw new Error('Unknown node type ' + node.type);
  }
}
