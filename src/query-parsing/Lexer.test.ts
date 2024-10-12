import { expect, it } from "vitest";
import { Lexer, Token, TokenType } from "./Lexer.js";
import { ParseResult } from "./parseQuery.js";

function lex(queryString: string): ParseResult<Token[]> {
  return new Lexer(queryString).readTokensUntilEnd();
}

it("lexes commas", () => {
  const tokensResult = lex("  ,  ");

  expect(tokensResult).toEqual({
    ok: true,
    value: [{ type: TokenType.Comma, start: 2, length: 1 }],
  });
});

it("lexes keywords ignoring case", () => {
  const tokensResult = lex("PROject filTER");

  expect(tokensResult).toEqual({
    ok: true,
    value: [
      { type: TokenType.Keyword, value: "PROJECT", start: 0, length: 7 },
      { type: TokenType.Keyword, value: "FILTER", start: 8, length: 6 },
    ],
  });
});

it("lexes identifiers", () => {
  const tokensResult = lex("col1 COL_2");

  expect(tokensResult).toEqual({
    ok: true,
    value: [
      { type: TokenType.Identifier, value: "col1", start: 0, length: 4 },
      { type: TokenType.Identifier, value: "COL_2", start: 5, length: 5 },
    ],
  });
});

it("ignores whitespace", () => {
  const tokensResult = lex("  \r   \t   \n  ,  \n   \t   \r  ");

  expect(tokensResult).toEqual({
    ok: true,
    value: [expect.objectContaining({ type: TokenType.Comma })],
  });
});

it("returns an error for an unexpected character", () => {
  const tokensResult = lex("PROJECT .");

  expect(tokensResult).toEqual({
    ok: false,
    errorType: "Syntax error",
    message: "Unexpected character",
    start: 8,
    length: 1,
  });
});
