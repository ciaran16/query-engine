import { expect, it } from "vitest";
import { ValidSchema } from "../ValidSchema.js";
import { MemoryStore } from "./MemoryStore.js";

const schema = new ValidSchema({ name: "string", age: "number" });

const exampleStore = new MemoryStore(schema, {
  name: ["James", "Elizabeth"],
  age: [29, 32],
});

it("creates a store with the correct size", () => {
  expect(exampleStore.size).toBe(2);
});

it("throws an error if columns are not all the same length", () => {
  expect(() => {
    new MemoryStore(schema, { name: ["James"], age: [29, 32] });
  }).toThrow(TypeError);
});

it("creates a store from an iterable of rows", () => {
  const rows = [
    { name: "James", age: 29 },
    { name: "Elizabeth", age: 32 },
  ];

  const store = MemoryStore.fromRows(schema, rows);

  expect([...store.streamRows(["name", "age"])]).toEqual(rows);
});

it("streams rows", () => {
  const rows = [...exampleStore.streamRows(["name", "age"])];

  expect(rows).toEqual([
    { name: "James", age: 29 },
    { name: "Elizabeth", age: 32 },
  ]);
});

it("only streams the specified columns", () => {
  const rows = [...exampleStore.streamRows(["name"])];

  expect(rows).toEqual([{ name: "James" }, { name: "Elizabeth" }]);
});

it("allows specifying no columns", () => {
  const rows = [...exampleStore.streamRows([])];

  expect(rows).toEqual([{}, {}]);
});
