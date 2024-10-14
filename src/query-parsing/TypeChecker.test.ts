import { expect, it } from "vitest";
import { ValidSchema } from "../ValidSchema.js";
import { TokenType } from "./Lexer.js";
import { TypeChecker } from "./TypeChecker.js";

const schema = new ValidSchema({ name: "string", age: "number" });
const checker = new TypeChecker(schema);

it("allows projecting columns in the schema", () => {
  const result = checker.check(
    [
      { type: TokenType.Identifier, value: "name", start: 0, length: 1 },
      { type: TokenType.String, value: "age", start: 1, length: 1 },
    ],
    [],
  );

  expect(result).toEqual({
    ok: true,
    value: { project: ["name", "age"], filters: {} },
  });
});

it("gives an error if a projected column is not in the schema", () => {
  const result = checker.check(
    [
      { type: TokenType.Identifier, value: "name", start: 0, length: 1 },
      { type: TokenType.String, value: "height", start: 1, length: 1 },
    ],
    [],
  );

  expect(result).toEqual({
    ok: false,
    errorType: "Type error",
    message: "Unknown column",
    start: 1,
    length: 1,
  });
});

it("allows filter values with the correct type", () => {
  const result = checker.check(
    [],
    [
      {
        columnToken: {
          type: TokenType.String,
          value: "age",
          start: 0,
          length: 1,
        },
        operatorToken: {
          type: TokenType.Operator,
          value: "equals",
          start: 1,
          length: 1,
        },
        valueToken: { type: TokenType.Number, value: 29, start: 2, length: 3 },
      },
    ],
  );

  expect(result).toEqual({
    ok: true,
    value: { project: [], filters: { age: { equals: 29 } } },
  });
});

it("gives an error if a filter column is not in the schema", () => {
  const result = checker.check(
    [],
    [
      {
        columnToken: {
          type: TokenType.Identifier,
          value: "height",
          start: 0,
          length: 1,
        },
        operatorToken: {
          type: TokenType.Operator,
          value: "equals",
          start: 1,
          length: 1,
        },
        valueToken: { type: TokenType.Number, value: 123, start: 2, length: 3 },
      },
    ],
  );

  expect(result).toEqual({
    ok: false,
    errorType: "Type error",
    message: "Unknown column",
    start: 0,
    length: 1,
  });
});

it("gives an error if a column is filtered using a duplicate operator", () => {
  const result = checker.check(
    [],
    [
      {
        columnToken: {
          type: TokenType.Identifier,
          value: "name",
          start: 0,
          length: 1,
        },
        operatorToken: {
          type: TokenType.Operator,
          value: "equals",
          start: 1,
          length: 1,
        },
        valueToken: { type: TokenType.String, value: "a", start: 2, length: 1 },
      },
      {
        columnToken: {
          type: TokenType.Identifier,
          value: "name",
          start: 3,
          length: 1,
        },
        operatorToken: {
          type: TokenType.Operator,
          value: "equals",
          start: 4,
          length: 1,
        },
        valueToken: { type: TokenType.String, value: "a", start: 5, length: 1 },
      },
    ],
  );

  expect(result).toEqual({
    ok: false,
    errorType: "Type error",
    message: "Duplicate filter for column",
    start: 4,
    length: 1,
  });
});

it("gives an error if a filter value has the wrong type", () => {
  const result = checker.check(
    [],
    [
      {
        columnToken: {
          type: TokenType.Identifier,
          value: "name",
          start: 0,
          length: 1,
        },
        operatorToken: {
          type: TokenType.Operator,
          value: "equals",
          start: 1,
          length: 1,
        },
        valueToken: { type: TokenType.Number, value: 123, start: 2, length: 3 },
      },
    ],
  );

  expect(result).toEqual({
    ok: false,
    errorType: "Type error",
    message: "Expected a string",
    start: 2,
    length: 3,
  });
});
