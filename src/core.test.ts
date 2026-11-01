import test from "node:test";
import assert from "node:assert/strict";
import { run, runAsync } from "./core.js";

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


test("keeps prototype-like variable names as safe own data properties", () => {
  const program = run('__proto__ = {polluted: true}\nconstructor = "safe"');
  const globals = program.getGlobals();
  assert.equal(Object.getPrototypeOf(globals), Object.prototype);
  assert.equal(Object.hasOwn(globals, "__proto__"), true);
  assert.equal((globals["__proto__"] as { polluted: boolean }).polluted, true);
  assert.equal(globals.constructor, "safe");
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});


test("runs async functions with awaitable host functions", async () => {
  const program = await runAsync(`async func loadUser(id):
    response = await fetchUser(id)
    return response.name

async func greeting(id):
    name = await loadUser(id)
    return "Hello " + name
`, {
    asyncFunctions: {
      fetchUser: async (id) => {
        await Promise.resolve();
        return { id: id as number, name: "ORU" };
      }
    }
  });
  assert.equal(await program.callAsync("greeting", 7), "Hello ORU");
});

test("preserves synchronous execution and rejects async functions through sync call", () => {
  const program = run("async func later():\n    return 42");
  assert.throws(() => program.call("later"), /must be invoked with callAsync/);
});

test("rejects await outside async functions", async () => {
  await assert.rejects(() => runAsync("value = await fetchValue()", {
    asyncFunctions: { fetchValue: async () => 1 }
  }), /await can only be used inside an async function/);
});

test("supports async state updates and sequential awaits", async () => {
  const program = await runAsync(`state status = pass
async func refresh():
    first = await getValue(1)
    second = await getValue(2)
    status = first + second
    return status
`, { asyncFunctions: { getValue: async (n) => Number(n) } });
  assert.equal(await program.callAsync("refresh"), 3);
  assert.equal(program.getGlobals().status, 3);
});


test("keeps core collection builtins available in async programs", async () => {
  const program = await runAsync(`async func total():
    values = range(1, 4)
    return len(values)
`);
  assert.equal(await program.callAsync("total"), 3);
  await assert.rejects(() => runAsync("async func bad():\n    return range(1, 2, 0)\nbad()").then(x => x.callAsync("bad")), /range step cannot be zero/);
});


test("awaits host calls sequentially and preserves their order", async () => {
  const order: number[] = [];
  const program = await runAsync(`async func load():
    first = await fetchValue(1)
    second = await fetchValue(2)
    return first + second
`, {
    asyncFunctions: {
      fetchValue: async (value) => {
        await Promise.resolve();
        order.push(Number(value));
        return Number(value);
      }
    }
  });
  assert.equal(await program.callAsync("load"), 3);
  assert.deepEqual(order, [1, 2]);
});

test("propagates rejected host promises without corrupting state", async () => {
  const program = await runAsync(`state status = "idle"
async func refresh():
    status = await fetchStatus()
`, {
    asyncFunctions: {
      fetchStatus: async () => { throw new Error("network unavailable"); }
    }
  });
  await assert.rejects(() => program.callAsync("refresh"), /network unavailable/);
  assert.equal(program.getGlobals().status, "idle");
});

test("enforces execution limits across asynchronous functions", async () => {
  const program = await runAsync(`async func repeat():
    count = 0
    while count < 10:
        count = count + 1
`, { maxSteps: 5 });
  await assert.rejects(() => program.callAsync("repeat"), /Execution step limit exceeded|Loop iteration limit exceeded/);
});

test("allows awaited host calls in async loops and conditionals", async () => {
  const program = await runAsync(`state total = 0
async func accumulate():
    for item in [1, 2, 3]:
        value = await fetchValue(item)
        if value > 1:
            total = total + value
    return total
`, { asyncFunctions: { fetchValue: async value => Number(value) } });
  assert.equal(await program.callAsync("accumulate"), 5);
  assert.equal(program.getGlobals().total, 5);
});
