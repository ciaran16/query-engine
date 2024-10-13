import { Query } from "../stores/Store.js";
import { Schema, ValidSchema } from "../ValidSchema.js";
import { ParseResult } from "./index.js";
import { Token } from "./Lexer.js";
import { ColumnNameToken, ParsedFilter } from "./Parser.js";

export class TypeChecker<TSchema extends Schema> {
  constructor(private readonly schema: ValidSchema<TSchema>) {}

  check(
    columnNameTokens: ColumnNameToken[],
    parsedFilters: ParsedFilter[],
  ): ParseResult<Query<TSchema, string[]>> {
    // See if any of the columns in the project or filters are unknown.
    const invalidColumnNameToken = [
      ...columnNameTokens,
      ...parsedFilters.map(({ columnToken }) => columnToken),
    ].find((token) => !this.schema.hasColumn(token.value));

    if (invalidColumnNameToken) {
      return error("Unknown column", invalidColumnNameToken);
    }

    const project = columnNameTokens.map((token) => token.value);

    return { ok: true, value: { project, filters: {} } };
  }
}

function error(message: string, token: Token): ParseResult<never> {
  return {
    ok: false,
    errorType: "Type error",
    message,
    start: token.start,
    length: token.length,
  };
}
