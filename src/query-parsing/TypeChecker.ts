import { Query } from "../stores/Store.js";
import { Filter, Filters } from "../ValidFilters.js";
import {
  ColumnTypeName,
  ColumnValue,
  Schema,
  ValidSchema,
} from "../ValidSchema.js";
import { ParseResult } from "./index.js";
import { Token, TokenType } from "./Lexer.js";
import { ColumnNameToken, ParsedFilter, ValueToken } from "./Parser.js";

const tokenTypeNames: Record<ValueToken["type"], ColumnTypeName> = {
  [TokenType.Number]: "number",
  [TokenType.String]: "string",
};

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

    const filtersResult = this.checkFilters(parsedFilters);

    return filtersResult.ok
      ? { ok: true, value: { project, filters: filtersResult.value } }
      : filtersResult;
  }

  private checkFilters(
    parsedFilters: ParsedFilter[],
  ): ParseResult<Filters<TSchema>> {
    return parsedFilters.reduce<
      ParseResult<Record<string, Filter<ColumnValue<ColumnTypeName>>>>
    >(
      (result, { columnToken, operatorToken, valueToken }) => {
        if (!result.ok) {
          return result;
        }

        const columnName = columnToken.value;
        const typeName = tokenTypeNames[valueToken.type];
        const expectedTypeName = this.schema.getColumnType(columnName);
        if (typeName !== expectedTypeName) {
          return error(`Expected a ${expectedTypeName}`, valueToken);
        }

        const filters = result.value;
        const filter = (filters[columnName] ??= {});
        if (filter[operatorToken.value] !== undefined) {
          return error(`Duplicate filter for column`, operatorToken);
        }

        filter[operatorToken.value] = valueToken.value;
        return { ok: true, value: filters };
      },
      { ok: true, value: {} },
    ) as ParseResult<Filters<TSchema>>;
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
