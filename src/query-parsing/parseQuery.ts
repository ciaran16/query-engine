import { Query } from "../stores/Store.js";
import { Schema } from "../ValidSchema.js";
import { Lexer } from "./Lexer.js";
import { Parser } from "./Parser.js";

export type ParseResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      errorType: string;
      message: string;
      start: number;
      length: number;
    };

export function parseQuery<TSchema extends Schema>(
  queryString: string,
): ParseResult<Query<TSchema, string[]>> {
  const tokensResult = new Lexer(queryString).readTokensUntilEnd();
  if (!tokensResult.ok) {
    return tokensResult;
  }

  const parsingResult = new Parser(tokensResult.value).parse();
  if (!parsingResult.ok) {
    return parsingResult;
  }

  return {
    ok: false,
    errorType: "Not implemented",
    message: queryString,
    start: 0,
    length: 0,
  };
}
