import { expect, it } from "vitest";
import { Lexer, Token, TokenType } from "./Lexer.js";
import { ParseResult } from "./parseQuery.js";

function lex(queryString: string): ParseResult<Token[]> {
  return new Lexer(queryString).readTokensUntilEnd();
}

it("ignores whitespace", () => {
  const tokensResult = lex("  \r   \t   \n  ,  \n   \t   \r  ");

  expect(tokensResult).toEqual({
    ok: true,
    value: [expect.objectContaining({ type: TokenType.Comma })],
  });
});

it("lexes commas", () => {
  const tokensResult = lex("  ,  ");

  expect(tokensResult).toEqual({
    ok: true,
    value: [{ type: TokenType.Comma, start: 2, length: 1 }],
  });
});

it("lexes operators", () => {
  const tokensResult = lex("= != <> > >= < <=");

  expect(tokensResult).toEqual({
    ok: true,
    value: [
      { type: TokenType.Operator, value: "equals", start: 0, length: 1 },
      { type: TokenType.Operator, value: "not", start: 2, length: 2 },
      { type: TokenType.Operator, value: "not", start: 5, length: 2 },
      { type: TokenType.Operator, value: "gt", start: 8, length: 1 },
      { type: TokenType.Operator, value: "gte", start: 10, length: 2 },
      { type: TokenType.Operator, value: "lt", start: 13, length: 1 },
      { type: TokenType.Operator, value: "lte", start: 15, length: 2 },
    ],
  });
});

it.each(["!", "=>", "=<", "=="])(
  "returns an error for unknown operator %s",
  (string) => {
    const tokensResult = lex(string);

    expect(tokensResult).toEqual({
      ok: false,
      errorType: "Syntax error",
      message: "Unknown operator",
      start: 0,
      length: string.length,
    });
  },
);

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

it("lexes integers", () => {
  const tokensResult = lex("1234567890 00123 0 -00 -01 -999");

  expect(tokensResult).toEqual({
    ok: true,
    value: [
      { type: TokenType.Number, value: 1234567890, start: 0, length: 10 },
      { type: TokenType.Number, value: 123, start: 11, length: 5 },
      { type: TokenType.Number, value: 0, start: 17, length: 1 },
      { type: TokenType.Number, value: -0, start: 19, length: 3 },
      { type: TokenType.Number, value: -1, start: 23, length: 3 },
      { type: TokenType.Number, value: -999, start: 27, length: 4 },
    ],
  });
});

it("lexes strings", () => {
  const tokensResult = lex(`"hello" 'world' "\\"\\a" '\\n\\t\\r'`);

  expect(tokensResult).toEqual({
    ok: true,
    value: [
      { type: TokenType.String, value: "hello", start: 0, length: 7 },
      { type: TokenType.String, value: "world", start: 8, length: 7 },
      { type: TokenType.String, value: '"a', start: 16, length: 6 },
      { type: TokenType.String, value: "\n\t\r", start: 23, length: 8 },
    ],
  });
});

it.each([`"hello`, `'world\\'`])(
  "returns an error for unterminated string: %s",
  (string) => {
    const tokensResult = lex(string);

    expect(tokensResult).toEqual({
      ok: false,
      errorType: "Syntax error",
      message: "Reached end of query without closing quote",
      start: 0,
      length: string.length,
    });
  },
);

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
