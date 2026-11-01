import test from "node:test";
import assert from "node:assert/strict";
import { run } from "./core.js";

test("runs variables, inferred types, expressions, and output", () => {
  const result = run('name = "ORU"\nversion = 1\nprint(name + " " + "language")\n');
  assert.deepEqual(result.output, ["ORU language"]);
  assert.throws(() => run('name = "ORU"\nname = 1'), /Type error/);
  assert.throws(() => run('name = pass\nprint(name)'), /read before it was assigned/);
});

test("runs functions and conditional branches", () => {
  const result = run('func greet(name):\n    if name == "ORU":\n        return "Hello ORU"\n    elif name == "world":\n        return "Hello world"\n    else:\n        return "Hello"\nprint(greet("ORU"))\nprint(greet("world"))');
  assert.deepEqual(result.output, ["Hello ORU", "Hello world"]);
});

test("runs lists, objects, indexing, properties, and for loops", () => {
  const result = run('items = [2, 4, 6]\nuser = {name: "Kunal", age: 16}\nprint(items[1])\nprint(user.name)\nfor item in items:\n    print(item)');
  assert.deepEqual(result.output, ["4", "Kunal", "2", "4", "6"]);
});

test("runs while loops with break and continue", () => {
  const result = run('count = 0\nwhile count < 5:\n    count = count + 1\n    if count == 2:\n        continue\n    if count == 4:\n        break\n    print(count)');
  assert.deepEqual(result.output, ["1", "3"]);
});

test("rejects loop control outside loops and enforces execution limits", () => {
  assert.throws(() => run("break"), /only be used inside a loop/);
  assert.throws(() => run("while true:\n    print(1)", { maxSteps: 10 }), /limit exceeded/);
});

test("exposes page functions for event-driven invocation", () => {
  const program = run('count = 1\nfunc increment(amount):\n    count = count + amount\n    return count');
  assert.equal(program.call("increment", 2), 3);
  assert.equal(program.getGlobals().count, 3);
});
