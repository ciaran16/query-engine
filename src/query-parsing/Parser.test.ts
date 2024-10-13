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

it("parses a query with no projected columns or filters", () => {
  const result = parse([{ type: TokenType.Keyword, value: "PROJECT" }]);

  expect(result).toEqual({
    ok: true,
    value: { columnNameTokens: [], parsedFilters: [] },
  });
});

it("returns an error if the query is empty", () => {
  const result = parse([]);

  expect(result).toEqual({
    ok: false,
    errorType: "Malformed query",
    message: "Query is empty",
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
