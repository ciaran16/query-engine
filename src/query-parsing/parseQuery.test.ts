import { expect, it } from "vitest";
import { ValidSchema } from "../ValidSchema.js";
import { parseQuery } from "./parseQuery.js";

const schema = new ValidSchema({ name: "string", age: "number" });

it("parses a full query", () => {
  const result = parseQuery(
    schema,
    "  PROJECT name, age \nFILTER name = 'James' , age < 30",
  );

  expect(result).toEqual({
    ok: true,
    value: {
      project: ["name", "age"],
      filters: { name: { equals: "James" }, age: { lt: 30 } },
    },
  });
});

it("gives an error if the query is invalid", () => {
  const result = parseQuery(schema, "PROJECT name age\nFILTER name = 'James'");

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a comma or keyword 'FILTER'",
    start: 13,
    length: 3,
  });
});
