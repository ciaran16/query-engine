import { expect, it } from "vitest";
import { ValidFilters } from "./ValidFilters.js";
import { ValidSchema } from "./ValidSchema.js";

const schema = new ValidSchema({ name: "string", age: "number" });

it("gives the correct column names", () => {
  const filters = new ValidFilters(schema, {
    name: { equals: "James" },
    age: { gt: 30 },
  });

  expect(filters.columnNames).toEqual(["name", "age"]);
});

it.each([
  { equals: 29 },
  { not: 32 },
  { gt: 28 },
  { gte: 29 },
  { lt: 30 },
  { lte: 29 },
])("does not filter out number when { age: %o }` matches", (filter) => {
  const filters = new ValidFilters(schema, { age: filter });

  expect(filters.isIncluded({ age: 29 })).toBe(true);
});

it.each([
  { equals: "Elizabeth" },
  { not: "James" },
  { gt: "Eliza" },
  { gte: "Elizabeth" },
  { lt: "Elizabeth." },
  { lte: "Elizabeth" },
])("does not filter out string when { name: %o }` matches", (filter) => {
  const filters = new ValidFilters(schema, { name: filter });

  expect(filters.isIncluded({ name: "Elizabeth" })).toBe(true);
});

it.each([
  { equals: 29 },
  { not: 32 },
  { gt: 32 },
  { gte: 33 },
  { lt: 32 },
  { lte: 31 },
])("filters out number when { age: %o }` does not match", (filter) => {
  const filters = new ValidFilters(schema, { age: filter });

  expect(filters.isIncluded({ age: 32 })).toBe(false);
});

it.each([
  { equals: "Elizabeth" },
  { not: "James" },
  { gt: "James" },
  { gte: "James." },
  { lt: "James" },
  { lte: "Jam" },
])("filters out string when { name: %o }` does not match", (filter) => {
  const filters = new ValidFilters(schema, { name: filter });

  expect(filters.isIncluded({ name: "James" })).toBe(false);
});

it("filters out a row if the filtered column is missing", () => {
  const filters = new ValidFilters(schema, { name: { equals: "James" } });

  expect(filters.isIncluded({ age: 29 })).toBe(false);
});
