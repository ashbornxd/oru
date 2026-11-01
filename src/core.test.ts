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

test("supports state declarations and updates captured state", () => {
  const program = run('state count = 0\nfunc increment():\n    count = count + 1');
  assert.equal(program.getGlobals().count, 0);
  program.call("increment");
  assert.equal(program.getGlobals().count, 1);
});

test("keeps global values separate and restores them into a later page run", () => {
  const first = run('global visits = 0\nfunc increment():\n    visits = visits + 1');
  first.call("increment");
  assert.equal(first.getGlobalState().visits, 1);
  const second = run('global visits = 0\nfunc current():\n    return visits', { initialGlobals: first.getGlobalState() });
  assert.equal(second.call("current"), 1);
  assert.equal(second.getGlobalState().visits, 1);
});

test("keeps page-local state separate from a same-named global", () => {
  const program = run("global count = 8\nstate count = 0");
  assert.equal(program.getGlobals().count, 0);
  assert.equal(program.getGlobalState().count, 8);
});
test("allows browser input to update a declared string state variable", () => {
  const program = run("state email = pass");
  program.set("email", "user@example.com");
  assert.equal(program.getGlobals().email, "user@example.com");
  assert.throws(() => program.set("missing", "value"), /Unknown variable/);
});

test("updates an existing shared global from functions and nested blocks", () => {
  const program = run(`global count = 0
func increment():
    global count = count + 1
`);
  program.call("increment");
  assert.equal(program.getGlobalState().count, 1);

  const loop = run(`global count = 0
while count < 3:
    global count = count + 1
`);
  assert.equal(loop.getGlobalState().count, 3);
});

test("does not expose inherited object prototype properties", () => {
  assert.throws(() => run('profile = {name: "ORU"}\nprint(profile.constructor)'), /Unknown object key/);
  assert.throws(() => run('profile = {name: "ORU"}\nprint(profile.__proto__)'), /Unknown object key/);
  const result = run('profile = {"__proto__": "safe"}\nprint(profile["__proto__"])');
  assert.deepEqual(result.output, ["safe"]);
});
