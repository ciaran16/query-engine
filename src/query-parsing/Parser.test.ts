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
    message: "Expected keyword 'PROJECT'",
    start: 0,
    length: 0,
  });
});

it("returns an error if the first token is not PROJECT", () => {
  const result = parse([{ type: TokenType.Keyword, value: "FILTER" }]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Expected keyword 'PROJECT'",
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
