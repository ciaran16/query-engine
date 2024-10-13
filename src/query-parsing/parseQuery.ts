import { Query } from "../stores/Store.js";
import { Schema, ValidSchema } from "../ValidSchema.js";
import { Lexer } from "./Lexer.js";
import { Parser } from "./Parser.js";
import { TypeChecker } from "./TypeChecker.js";

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

/**
 * Parse and type check a query string.
 *
 * @example
 * const query = parseQuery(schema, "PROJECT name, age FILTER name = 'James', age < 30");
 *
 * query === {
 *   ok: true,
 *   value: {
 *     project: ["name", "age"],
 *     filters: { name: { equals: "James" }, age: { lt: 30 } }
 *   }
 * }
 */
export function parseQuery<TSchema extends Schema>(
  schema: ValidSchema<TSchema>,
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

  const { projectedColumnTokens, parsedFilters } = parsingResult.value;
  return new TypeChecker(schema).check(projectedColumnTokens, parsedFilters);
}
