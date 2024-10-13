import { expect, it } from "vitest";
import { TokenType, TokenWithoutPosition } from "./Lexer.js";
import { Parser } from "./Parser.js";

function parse(tokens: TokenWithoutPosition[]) {
  const tokensWithPosition = tokens.map((token, index) => ({
    ...token,
    start: index,
    length: 1,
  }));

  return new Parser(tokensWithPosition).parse();
}

it("returns an error if the query is empty", () => {
  const result = parse([]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a keyword",
    start: 0,
    length: 0,
  });
});

it("returns an error if the first token is not a keyword", () => {
  const result = parse([{ type: TokenType.Identifier, value: "col1" }]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a keyword",
    start: 0,
    length: 1,
  });
});

it("returns an error if there are no projected columns and query ends", () => {
  const result = parse([{ type: TokenType.Keyword, value: "PROJECT" }]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a column name",
    start: 1,
    length: 0,
  });
});

it("returns an error if there are no projected columns", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "PROJECT" },
    { type: TokenType.Keyword, value: "FILTER" },
  ]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a column name",
    start: 1,
    length: 1,
  });
});

it("parses a query projecting one column", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "PROJECT" },
    { type: TokenType.Identifier, value: "col1" },
  ]);

  expect(result).toEqual({
    ok: true,
    value: {
      projectedColumnTokens: [
        { type: TokenType.Identifier, value: "col1", start: 1, length: 1 },
      ],
      parsedFilters: [],
    },
  });
});

it("parses a query projecting multiple columns", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "PROJECT" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Comma },
    { type: TokenType.String, value: "col 2" },
  ]);

  expect(result).toEqual({
    ok: true,
    value: {
      projectedColumnTokens: [
        { type: TokenType.Identifier, value: "col1", start: 1, length: 1 },
        { type: TokenType.String, value: "col 2", start: 3, length: 1 },
      ],
      parsedFilters: [],
    },
  });
});

it("returns an error if there's no comma between columns", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "PROJECT" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.String, value: "col 2" },
  ]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a comma or keyword 'FILTER'",
    start: 2,
    length: 1,
  });
});

it("parses a query with a filter", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col2" },
    { type: TokenType.Operator, value: "equals" },
    { type: TokenType.Number, value: 123 },
  ]);

  expect(result).toEqual({
    ok: true,
    value: {
      projectedColumnTokens: [],
      parsedFilters: [
        {
          columnToken: {
            type: TokenType.Identifier,
            value: "col2",
            start: 1,
            length: 1,
          },
          operatorToken: {
            type: TokenType.Operator,
            value: "equals",
            start: 2,
            length: 1,
          },
          valueToken: {
            type: TokenType.Number,
            value: 123,
            start: 3,
            length: 1,
          },
        },
      ],
    },
  });
});

it("parses a query with multiple filters", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Operator, value: "equals" },
    { type: TokenType.Number, value: 123 },
    { type: TokenType.Comma },
    { type: TokenType.Identifier, value: "col2" },
    { type: TokenType.Operator, value: "not" },
    { type: TokenType.String, value: "a" },
  ]);

  expect(result).toEqual({
    ok: true,
    value: {
      projectedColumnTokens: [],
      parsedFilters: [
        {
          columnToken: {
            type: TokenType.Identifier,
            value: "col1",
            start: 1,
            length: 1,
          },
          operatorToken: {
            type: TokenType.Operator,
            value: "equals",
            start: 2,
            length: 1,
          },
          valueToken: {
            type: TokenType.Number,
            value: 123,
            start: 3,
            length: 1,
          },
        },
        {
          columnToken: {
            type: TokenType.Identifier,
            value: "col2",
            start: 5,
            length: 1,
          },
          operatorToken: {
            type: TokenType.Operator,
            value: "not",
            start: 6,
            length: 1,
          },
          valueToken: {
            type: TokenType.String,
            value: "a",
            start: 7,
            length: 1,
          },
        },
      ],
    },
  });
});

it("gives an error for missing filter column", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Operator, value: "equals" },
    { type: TokenType.Number, value: 123 },
  ]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a column name",
    start: 1,
    length: 1,
  });
});

it("gives an error for missing filter operator", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Number, value: 123 },
  ]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected an operator",
    start: 2,
    length: 1,
  });
});

it("gives an error for missing filter value", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Operator, value: "equals" },
    { type: TokenType.String, value: "a" },
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Operator, value: "gt" },
  ]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected a value",
    start: 7,
    length: 0,
  });
});

it("parses a query with projected columns and filters", () => {
  const result = parse([
    { type: TokenType.Keyword, value: "PROJECT" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Keyword, value: "FILTER" },
    { type: TokenType.Identifier, value: "col1" },
    { type: TokenType.Operator, value: "equals" },
    { type: TokenType.Number, value: 123 },
  ]);

  expect(result).toEqual({
    ok: true,
    value: {
      projectedColumnTokens: [
        {
          type: TokenType.Identifier,
          value: "col1",
          start: 1,
          length: 1,
        },
      ],
      parsedFilters: [
        {
          columnToken: {
            type: TokenType.Identifier,
            value: "col1",
            start: 3,
            length: 1,
          },
          operatorToken: {
            type: TokenType.Operator,
            value: "equals",
            start: 4,
            length: 1,
          },
          valueToken: {
            type: TokenType.Number,
            value: 123,
            start: 5,
            length: 1,
          },
        },
      ],
    },
  });
});
