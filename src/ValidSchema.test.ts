import { expect, it } from "vitest";
import { Schema, ValidSchema } from "./ValidSchema.js";

it("throws a type error if there are no columns", () => {
  expect(() => new ValidSchema({} as Schema)).toThrow(TypeError);
});

it("gives column names in alphabetical order", () => {
  const schema = new ValidSchema({ c: "string", a: "string", b: "string" });

  expect(schema.columnNames).toEqual(["a", "b", "c"]);
});

it("returns true if a column exists", () => {
  const schema = new ValidSchema({ name: "string", age: "number" });

  expect(schema.hasColumn("name")).toBe(true);
});

it("returns false if a column doesn't exist", () => {
  const schema = new ValidSchema({ name: "string", age: "number" });

  expect(schema.hasColumn("height")).toBe(false);
});

it("returns the type name of a column", () => {
  const schema = new ValidSchema({ name: "string", age: "number" });

  expect(schema.getColumnType("name")).toBe("string");
});
