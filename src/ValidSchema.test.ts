import { expect, it } from "vitest";
import { Schema, ValidSchema } from "./ValidSchema.js";

it("throws a type error if there are no columns", () => {
  expect(() => new ValidSchema({} as Schema)).toThrow(TypeError);
});

it("gives column names in alphabetical order", () => {
  const schema = new ValidSchema({ c: "string", a: "string", b: "string" });

  expect(schema.columnNames).toEqual(["a", "b", "c"]);
});
