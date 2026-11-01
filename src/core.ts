export type OruValue = string | number | boolean | OruValue[] | { [key: string]: OruValue } | null;
type Expr =
  | { kind: "literal"; value: OruValue }
  | { kind: "name"; name: string }
  | { kind: "list"; items: Expr[] }
  | { kind: "object"; entries: Array<[string, Expr]> }
  | { kind: "unary"; op: string; value: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "call"; callee: Expr; args: Expr[] }
  | { kind: "member"; object: Expr; key: string }
  | { kind: "index"; object: Expr; index: Expr };

type Statement =
  | { kind: "assign"; name: string; value: Expr; line: number }
  | { kind: "global"; name: string; value: Expr; line: number }
  | { kind: "state"; name: string; value: Expr; line: number }
  | { kind: "func"; name: string; params: string[]; body: Statement[]; line: number }
  | { kind: "if"; branches: Array<{ condition: Expr | null; body: Statement[] }>; line: number }
  | { kind: "while"; condition: Expr; body: Statement[]; line: number }
  | { kind: "for"; name: string; iterable: Expr; body: Statement[]; line: number }
  | { kind: "return"; value?: Expr; line: number }
  | { kind: "break"; line: number }
  | { kind: "continue"; line: number }
  | { kind: "expression"; value: Expr; line: number };

type Token = { value: string; kind: "number" | "string" | "name" | "operator" };
const tokenPattern = /\s*(?:(\d+(?:\.\d+)?)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|([A-Za-z_]\w*)|(==|!=|<=|>=|\*\*|\/\/|[+\-*/%<>()\[\]{},:.!]))/y;

function tokenizeExpression(source: string, line: number): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  while (offset < source.length) {
    tokenPattern.lastIndex = offset;
    const match = tokenPattern.exec(source);
    if (!match) {
      if (!source.slice(offset).trim()) break;
      throw new OruError("Invalid expression near " + JSON.stringify(source.slice(offset)), line);
    }
    offset = tokenPattern.lastIndex;
    if (match[1]) tokens.push({ value: match[1], kind: "number" });
    else if (match[2]) tokens.push({ value: match[2], kind: "string" });
    else if (match[3]) tokens.push({ value: match[3], kind: "name" });
    else if (match[4]) tokens.push({ value: match[4], kind: "operator" });
  }
  return tokens;
}

import { OruError } from "./ast.js";

class ExpressionParser {
  private index = 0;
  constructor(private readonly tokens: Token[], private readonly line: number) {}
  private peek(): string { return this.tokens[this.index]?.value ?? ""; }
  private take(): Token {
    const token = this.tokens[this.index++];
    if (!token) throw new OruError("Unexpected end of expression.", this.line);
    return token;
  }
  private expect(value: string): void {
    if (this.take().value !== value) throw new OruError("Expected '" + value + "'.", this.line);
  }
  parse(): Expr {
    const value = this.expression(0);
    if (this.index !== this.tokens.length) throw new OruError("Unexpected token '" + this.peek() + "'.", this.line);
    return value;
  }
  private expression(min: number): Expr {
    let left = this.prefix();
    while (true) {
      const op = this.peek();
      const precedence: Record<string, number> = {
        or: 1, and: 2, "==": 3, "!=": 3, "<": 3, "<=": 3, ">": 3, ">=": 3,
        "+": 4, "-": 4, "*": 5, "/": 5, "//": 5, "%": 5, "**": 6
      };
      const p = precedence[op];
      if (p === undefined || p < min) break;
      this.take();
      const right = this.expression(p + (op === "**" ? 0 : 1));
      left = { kind: "binary", op, left, right };
    }
    return left;
  }
  private prefix(): Expr {
    const token = this.take();
    let value: Expr;
    if (token.value === "!" || token.value === "not" || token.value === "-" || token.value === "+") {
      value = { kind: "unary", op: token.value, value: this.expression(7) };
    } else if (token.value === "(") {
      value = this.expression(0); this.expect(")");
    } else if (token.value === "[") {
      const items: Expr[] = [];
      while (this.peek() && this.peek() !== "]") {
        items.push(this.expression(0));
        if (this.peek() !== ",") break;
        this.take();
      }
      this.expect("]"); value = { kind: "list", items };
    } else if (token.value === "{") {
      const entries: Array<[string, Expr]> = [];
      while (this.peek() && this.peek() !== "}") {
        const key = this.take();
        if (key.kind !== "name" && key.kind !== "string") throw new OruError("Object keys must be names or strings.", this.line);
        this.expect(":"); entries.push([key.kind === "string" ? decodeString(key.value) : key.value, this.expression(0)]);
        if (this.peek() !== ",") break;
        this.take();
      }
      this.expect("}"); value = { kind: "object", entries };
    } else if (token.kind === "number") {
      value = { kind: "literal", value: Number(token.value) };
    } else if (token.kind === "string") {
      value = { kind: "literal", value: decodeString(token.value) };
    } else if (token.value === "true" || token.value === "false") {
      value = { kind: "literal", value: token.value === "true" };
    } else if (token.value === "pass") {
      value = { kind: "literal", value: null };
    } else if (token.kind === "name") {
      value = { kind: "name", name: token.value };
    } else {
      throw new OruError("Unexpected token '" + token.value + "'.", this.line);
    }
    while (true) {
      if (this.peek() === "(") {
        this.take(); const args: Expr[] = [];
        while (this.peek() && this.peek() !== ")") {
          args.push(this.expression(0));
          if (this.peek() !== ",") break;
          this.take();
        }
        this.expect(")"); value = { kind: "call", callee: value, args };
      } else if (this.peek() === ".") {
        this.take(); const key = this.take();
        if (key.kind !== "name") throw new OruError("Expected a property name.", this.line);
        value = { kind: "member", object: value, key: key.value };
      } else if (this.peek() === "[") {
        this.take(); const index = this.expression(0); this.expect("]");
        value = { kind: "index", object: value, index };
      } else break;
    }
    return value;
  }
}

function decodeString(value: string): string {
  const quote = value[0]!;
  return value.slice(1, -1).replace(/\\n/g, "\n").replace(/\\t/g, "\t")
    .replace(new RegExp("\\\\" + quote, "g"), quote).replace(/\\\\/g, "\\");
}
function parseExpr(source: string, line: number): Expr {
  return new ExpressionParser(tokenizeExpression(source, line), line).parse();
}

type SourceLine = { indent: number; text: string; line: number };
function prepareLines(source: string): SourceLine[] {
  const result: SourceLine[] = [];
  let inComment = false;
  source.replace(/\r\n?/g, "\n").split("\n").forEach((raw, i) => {
    let text = raw;
    if (inComment) {
      const end = text.indexOf('"""');
      if (end < 0) return;
      text = text.slice(end + 3); inComment = false;
    }
    while (true) {
      const start = text.indexOf('"""');
      if (start < 0) break;
      const end = text.indexOf('"""', start + 3);
      if (end >= 0) text = text.slice(0, start) + text.slice(end + 3);
      else { text = text.slice(0, start); inComment = true; break; }
    }
    if (!text.trim() || text.trimStart().startsWith("#")) return;
    if (text.includes("\t")) throw new OruError("Use spaces for indentation, not tabs.", i + 1);
    const indent = text.length - text.trimStart().length;
    if (indent % 4 !== 0) throw new OruError("Indentation must use multiples of four spaces.", i + 1);
    result.push({ indent, text: text.trim(), line: i + 1 });
  });
  if (inComment) throw new OruError("Unclosed triple-quoted comment.");
  return result;
}

class StatementParser {
  private index = 0;
  constructor(private readonly lines: SourceLine[]) {}
  parse(): Statement[] {
    const body = this.block(0);
    if (this.index < this.lines.length) throw new OruError("Unexpected indentation.", this.lines[this.index]!.line);
    return body;
  }
  private block(indent: number): Statement[] {
    const body: Statement[] = [];
    while (this.index < this.lines.length) {
      const current = this.lines[this.index]!;
      if (current.indent < indent) break;
      if (current.indent > indent) throw new OruError("Unexpected indentation.", current.line);
      this.index++;
      body.push(this.statement(current));
    }
    return body;
  }
  private childBlock(parent: SourceLine): Statement[] {
    const next = this.lines[this.index];
    if (!next || next.indent <= parent.indent) throw new OruError("Expected an indented block.", parent.line);
    if (next.indent !== parent.indent + 4) throw new OruError("Indentation must increase by four spaces.", next.line);
    return this.block(next.indent);
  }
  private statement(line: SourceLine): Statement {
    let match = line.text.match(/^func\s+([A-Za-z_]\w*)\s*\((.*?)\)\s*:\s*$/);
    if (match) {
      const params = match[2]!.trim() ? match[2]!.split(",").map(x => x.trim()) : [];
      if (params.some(x => !/^[A-Za-z_]\w*$/.test(x)) || new Set(params).size !== params.length)
        throw new OruError("Function parameters must be unique variable names.", line.line);
      return { kind: "func", name: match[1]!, params, body: this.childBlock(line), line: line.line };
    }
    match = line.text.match(/^if\s+(.+)\s*:\s*$/);
    if (match) {
      const branches: Array<{ condition: Expr | null; body: Statement[] }> = [
        { condition: parseExpr(match[1]!, line.line), body: this.childBlock(line) }
      ];
      while (this.index < this.lines.length && this.lines[this.index]!.indent === line.indent) {
        const next = this.lines[this.index]!;
        const elif = next.text.match(/^elif\s+(.+)\s*:\s*$/);
        const otherwise = next.text.match(/^else\s*:\s*$/);
        if (!elif && !otherwise) break;
        this.index++;
        branches.push({ condition: elif ? parseExpr(elif[1]!, next.line) : null, body: this.childBlock(next) });
        if (otherwise) break;
      }
      return { kind: "if", branches, line: line.line };
    }
    match = line.text.match(/^while\s+(.+)\s*:\s*$/);
    if (match) return { kind: "while", condition: parseExpr(match[1]!, line.line), body: this.childBlock(line), line: line.line };
    match = line.text.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+)\s*:\s*$/);
    if (match) return { kind: "for", name: match[1]!, iterable: parseExpr(match[2]!, line.line), body: this.childBlock(line), line: line.line };
    match = line.text.match(/^return(?:\s+(.+))?$/);
    if (match) return { kind: "return", value: match[1] ? parseExpr(match[1], line.line) : undefined, line: line.line };
    if (line.text === "break") return { kind: "break", line: line.line };
    if (line.text === "continue") return { kind: "continue", line: line.line };
    match = line.text.match(/^global\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match) return { kind: "global", name: match[1]!, value: parseExpr(match[2]!, line.line), line: line.line };
    match = line.text.match(/^state\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match) return { kind: "state", name: match[1]!, value: parseExpr(match[2]!, line.line), line: line.line };
    match = line.text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (match) return { kind: "assign", name: match[1]!, value: parseExpr(match[2]!, line.line), line: line.line };
    if (line.text.endsWith(":")) throw new OruError("Unknown block statement.", line.line);
    return { kind: "expression", value: parseExpr(line.text, line.line), line: line.line };
  }
}

type Binding = { type?: string; initialized: boolean; value?: OruValue };
class Environment {
  private values = new Map<string, Binding>();
  constructor(readonly parent?: Environment) {}
  declare(name: string, value: OruValue, line: number): void {
    const existing = this.values.get(name);
    if (!existing) {
      this.values.set(name, { type: value === null ? undefined : valueType(value), initialized: value !== null, value });
      return;
    }
    if (value === null) {
      if (existing.initialized) throw new OruError("Variable '" + name + "' is already initialized.", line);
      return;
    }
    const type = valueType(value);
    if (existing.type && existing.type !== type) throw new OruError("Type error: '" + name + "' is " + existing.type + ", not " + type + ".", line);
    existing.type = type; existing.initialized = true; existing.value = value;
  }
  assign(name: string, value: OruValue, line: number): void {
    const existing = this.values.get(name);
    if (existing) {
      if (value === null) throw new OruError("Cannot assign pass to an initialized variable.", line);
      const type = valueType(value);
      if (existing.type && existing.type !== type) throw new OruError("Type error: '" + name + "' is " + existing.type + ", not " + type + ".", line);
      existing.type = type; existing.initialized = true; existing.value = value;
      return;
    }
    if (this.parent?.has(name)) {
      this.parent.assign(name, value, line);
      return;
    }
    this.declare(name, value, line);
  }
  has(name: string): boolean {
    return this.values.has(name) || Boolean(this.parent?.has(name));
  }
  snapshot(): Record<string, OruValue> {
    const result: Record<string, OruValue> = {};
    for (const [name, binding] of this.values) if (binding.initialized) result[name] = binding.value!;
    return result;
  }
  get(name: string, line: number): OruValue {
    const binding = this.values.get(name);
    if (binding) {
      if (!binding.initialized) throw new OruError("Variable '" + name + "' was read before it was assigned.", line);
      return binding.value!;
    }
    if (this.parent) return this.parent.get(name, line);
    throw new OruError("Unknown variable '" + name + "'.", line);
  }
}
function valueType(value: OruValue): string {
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "list";
  if (value && typeof value === "object") return "object";
  return "pass";
}
type Callable = { call: (args: OruValue[], line: number) => OruValue };
type RuntimeValue = OruValue | Callable;
class ReturnSignal { constructor(readonly value: OruValue) {} }
class BreakSignal {}
class ContinueSignal {}

export interface RunOptions { output?: (value: OruValue) => void; maxSteps?: number; initialGlobals?: Record<string, OruValue> }
export interface RunResult { output: OruValue[]; globals: Record<string, OruValue>; call(name: string, ...args: OruValue[]): OruValue; getGlobals(): Record<string, OruValue>; getGlobalState(): Record<string, OruValue>; set(name: string, value: OruValue): void }

export function run(source: string, options: RunOptions = {}): RunResult {
  const statements = new StatementParser(prepareLines(source)).parse();
  const output: OruValue[] = [];
  let steps = 0;
  const maxSteps = options.maxSteps ?? 100_000;
  const shared = new Environment();
  const globalNames = new Set(Object.keys(options.initialGlobals ?? {}));
  for (const [name, value] of Object.entries(options.initialGlobals ?? {})) shared.declare(name, value, 0);
  const global = new Environment(shared);
  const allGlobals = () => ({ ...shared.snapshot(), ...global.snapshot() });
  const functions = new Map<string, { params: string[]; body: Statement[]; closure: Environment }>();
  const builtins = new Map<string, Callable>();
  builtins.set("print", { call: args => { const value = args.map(displayValue).join(" "); output.push(value); options.output?.(value); return null; } });
  builtins.set("len", { call: (args, line) => {
    if (args.length !== 1) throw new OruError("len expects one argument.", line);
    const value = args[0]!;
    if (typeof value === "string" || Array.isArray(value)) return value.length;
    if (value && typeof value === "object") return Object.keys(value).length;
    throw new OruError("len expects a string, list, or object.", line);
  } });
  builtins.set("range", { call: (args, line) => {
    if (args.length < 1 || args.length > 3 || args.some(x => typeof x !== "number")) throw new OruError("range expects one to three numbers.", line);
    const start = args.length === 1 ? 0 : args[0] as number;
    const end = args.length === 1 ? args[0] as number : args[1] as number;
    const step = args.length === 3 ? args[2] as number : 1;
    if (step === 0) throw new OruError("range step cannot be zero.", line);
    const values: OruValue[] = [];
    for (let n = start; step > 0 ? n < end : n > end; n += step) {
      if (values.length >= 100_000) throw new OruError("range is too large.", line);
      values.push(n);
    }
    return values;
  } });
  let invokeFunction: (name: string, args: OruValue[], line: number) => OruValue = () => null;
  const evalExpr = (expr: Expr, env: Environment): OruValue => {
    switch (expr.kind) {
      case "literal": return expr.value;
      case "name": return env.get(expr.name, 0);
      case "list": return expr.items.map(x => evalExpr(x, env));
      case "object": return Object.fromEntries(expr.entries.map(([k, v]) => [k, evalExpr(v, env)]));
      case "unary": {
        const value = evalExpr(expr.value, env);
        if (expr.op === "!" || expr.op === "not") return !truthy(value);
        if (typeof value !== "number") throw new OruError("Unary '" + expr.op + "' expects a number.", 0);
        return expr.op === "-" ? -value : value;
      }
      case "binary": {
        const left = evalExpr(expr.left, env);
        if (expr.op === "and") return truthy(left) ? evalExpr(expr.right, env) : left;
        if (expr.op === "or") return truthy(left) ? left : evalExpr(expr.right, env);
        const right = evalExpr(expr.right, env);
        switch (expr.op) {
          case "+": if (typeof left === "string" && typeof right === "string") return left + right; return numeric(left, right, expr.op);
          case "-": case "*": case "/": case "//": case "%": case "**": return numeric(left, right, expr.op);
          case "==": return equal(left, right);
          case "!=": return !equal(left, right);
          case "<": case "<=": case ">": case ">=":
            if (typeof left === "number" && typeof right === "number") {
              if (expr.op === "<") return left < right;
              if (expr.op === "<=") return left <= right;
              if (expr.op === ">") return left > right;
              return left >= right;
            }
            if (typeof left === "string" && typeof right === "string") {
              if (expr.op === "<") return left < right;
              if (expr.op === "<=") return left <= right;
              if (expr.op === ">") return left > right;
              return left >= right;
            }
            throw new OruError("Values cannot be ordered.", 0);
        }
        return null;
      }
      case "member": {
        const object = evalExpr(expr.object, env);
        if (!object || typeof object !== "object" || Array.isArray(object)) throw new OruError("Property access requires an object.", 0);
        if (!(expr.key in object)) throw new OruError("Unknown object key '" + expr.key + "'.", 0);
        return (object as Record<string, OruValue>)[expr.key]!;
      }
      case "index": {
        const object = evalExpr(expr.object, env);
        const index = evalExpr(expr.index, env);
        if (Array.isArray(object) && typeof index === "number") return object[index] ?? null;
        if (typeof object === "string" && typeof index === "number") return object[index] ?? "";
        if (object && typeof object === "object" && typeof index === "string") return (object as Record<string, OruValue>)[index] ?? null;
        throw new OruError("Invalid index operation.", 0);
      }
      case "call": {
        if (expr.callee.kind !== "name") throw new OruError("Only named functions can be called in this release.", 0);
        return invokeFunction(expr.callee.name, expr.args.map(x => evalExpr(x, env)), 0);
      }
    }
  };
  function truthy(value: OruValue): boolean { return value !== false && value !== null && value !== 0 && value !== ""; }
  function equal(a: OruValue, b: OruValue): boolean { return JSON.stringify(a) === JSON.stringify(b); }
  function numeric(a: OruValue, b: OruValue, op: string): number {
    if (typeof a !== "number" || typeof b !== "number") throw new OruError("Operator '" + op + "' expects numbers.", 0);
    if ((op === "/" || op === "//" || op === "%") && b === 0) throw new OruError("Division by zero.", 0);
    switch (op) {
      case "+": return a + b; case "-": return a - b; case "*": return a * b;
      case "/": return a / b; case "//": return Math.floor(a / b); case "%": return a % b;
      default: return a ** b;
    }
  }
  function displayValue(value: OruValue): string { return typeof value === "string" ? value : JSON.stringify(value); }
  const executeBlock = (body: Statement[], env: Environment, inFunction = false, inLoop = false): void => {
    for (const statement of body) {
      if (++steps > maxSteps) throw new OruError("Execution step limit exceeded.", statement.line);
      switch (statement.kind) {
        case "assign": env.assign(statement.name, evalExpr(statement.value, env), statement.line); break;
        case "global":
          globalNames.add(statement.name);
          if (!shared.has(statement.name)) shared.declare(statement.name, evalExpr(statement.value, env), statement.line);
          break;
        case "state": env.declare(statement.name, evalExpr(statement.value, env), statement.line); break;
        case "expression": evalExpr(statement.value, env); break;
        case "func": functions.set(statement.name, { params: statement.params, body: statement.body, closure: env }); break;
        case "if": {
          const branch = statement.branches.find(x => x.condition === null || truthy(evalExpr(x.condition, env)));
          if (branch) executeBlock(branch.body, env, inFunction, inLoop);
          break;
        }
        case "while": {
          let count = 0;
          while (truthy(evalExpr(statement.condition, env))) {
            if (++count > maxSteps) throw new OruError("Loop iteration limit exceeded.", statement.line);
            try { executeBlock(statement.body, env, inFunction, true); }
            catch (signal) { if (signal instanceof BreakSignal) break; if (!(signal instanceof ContinueSignal)) throw signal; }
          }
          break;
        }
        case "for": {
          const iterable = evalExpr(statement.iterable, env);
          const values = Array.isArray(iterable) ? iterable : typeof iterable === "string" ? [...iterable] : null;
          if (!values) throw new OruError("for loops require a list or string.", statement.line);
          for (const value of values) {
            env.declare(statement.name, value, statement.line);
            try { executeBlock(statement.body, env, inFunction, true); }
            catch (signal) { if (signal instanceof BreakSignal) break; if (!(signal instanceof ContinueSignal)) throw signal; }
          }
          break;
        }
        case "return":
          if (!inFunction) throw new OruError("return can only be used inside a function.", statement.line);
          throw new ReturnSignal(statement.value ? evalExpr(statement.value, env) : null);
        case "break":
          if (!inLoop) throw new OruError("break can only be used inside a loop.", statement.line);
          throw new BreakSignal();
        case "continue":
          if (!inLoop) throw new OruError("continue can only be used inside a loop.", statement.line);
          throw new ContinueSignal();
      }
    }
  };
  invokeFunction = (name, args, line) => {
    const builtin = builtins.get(name);
    if (builtin) return builtin.call(args, line);
    const fn = functions.get(name);
    if (!fn) throw new OruError("Unknown function '" + name + "'.", line);
    if (args.length !== fn.params.length) throw new OruError("Function '" + name + "' expects " + fn.params.length + " argument(s).", line);
    const env = new Environment(fn.closure);
    fn.params.forEach((param, i) => env.declare(param, args[i]!, line));
    try { executeBlock(fn.body, env, true, false); }
    catch (signal) { if (signal instanceof ReturnSignal) return signal.value; throw signal; }
    return null;
  };
  executeBlock(statements, global);
  return { output, globals: allGlobals(), call: (name, ...args) => invokeFunction(name, args, 0), getGlobals: allGlobals, getGlobalState: () => Object.fromEntries(Object.entries(shared.snapshot()).filter(([name]) => globalNames.has(name))), set: (name, value) => { if (!global.has(name)) throw new OruError("Unknown variable: " + name, 0); global.assign(name, value, 0); } };
}
