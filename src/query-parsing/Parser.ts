import { Operator } from "../ValidFilters.js";
import { ParseResult } from "./index.js";
import { Keyword, Token, TokenType } from "./Lexer.js";

/** Column names are either identifiers or strings. */
export type ColumnNameToken = Token & {
  type: TokenType.Identifier | TokenType.String;
};

export type ValueToken = Token & { type: TokenType.Number | TokenType.String };

export type ParsedFilter = {
  columnToken: ColumnNameToken;
  operator: Operator;
  valueToken: ValueToken;
};

export class Parser {
  constructor(private readonly tokens: Token[]) {}

  parse(): ParseResult<{
    projectedColumnTokens: ColumnNameToken[];
    parsedFilters: ParsedFilter[];
  }> {
    const projectKeywordResult = this.parseKeyword("PROJECT", this.tokens[0]);
    if (!projectKeywordResult.ok) {
      return projectKeywordResult;
    }

    const columnsResult = this.parseColumns(1);
    if (!columnsResult.ok) {
      return columnsResult;
    }

    const { projectedColumnTokens, iToken } = columnsResult.value;

    const filtersResult = this.parseFilters(iToken);

    return filtersResult.ok
      ? {
          ok: true,
          value: { projectedColumnTokens, parsedFilters: filtersResult.value },
        }
      : filtersResult;
  }

  private parseColumns(
    iToken: number,
    projectedColumnTokens: ColumnNameToken[] = [],
  ): ParseResult<{ projectedColumnTokens: ColumnNameToken[]; iToken: number }> {
    const columnNameResult = this.parseColumnName(this.tokens[iToken]);
    if (!columnNameResult.ok) {
      return columnNameResult;
    }

    projectedColumnTokens.push(columnNameResult.value);
    const nextToken = this.tokens[iToken + 1];

    return nextToken?.type === TokenType.Comma
      ? this.parseColumns(iToken + 2, projectedColumnTokens)
      : { ok: true, value: { projectedColumnTokens, iToken: iToken + 1 } };
  }

  private parseFilters(
    iToken: number,
    filters: ParsedFilter[] = [],
  ): ParseResult<ParsedFilter[]> {
    const filterToken = this.tokens[iToken];
    if (!filterToken) {
      return { ok: true, value: filters };
    }

    const filterKeywordResult = this.parseKeyword("FILTER", filterToken);
    if (!filterKeywordResult.ok) {
      // Improve the error message slightly if this is the first filter.
      return filters.length > 0
        ? filterKeywordResult
        : this.error("Expected a comma or keyword 'FILTER'", filterToken);
    }

    return { ok: true, value: filters };
  }

  private parseColumnName(
    token: Token | undefined,
  ): ParseResult<ColumnNameToken> {
    return token?.type === TokenType.Identifier ||
      token?.type === TokenType.String
      ? { ok: true, value: token }
      : this.error("Expected a column name", token);
  }

  private parseKeyword(
    expectedKeyword: Keyword,
    token: Token | undefined,
  ): ParseResult<Keyword> {
    return token?.type === TokenType.Keyword && token.value === expectedKeyword
      ? { ok: true, value: token.value }
      : this.error(`Expected keyword '${expectedKeyword}'`, token);
  }

  private error(message: string, token: Token | undefined): ParseResult<never> {
    const lastToken = this.tokens[this.tokens.length - 1];
    const { start, length } = token ?? {
      start: lastToken ? lastToken.start + lastToken.length : 0,
      length: 0,
    };

    return {
      ok: false,
      errorType: "Malformed query",
      message,
      start,
      length,
    };
  }
}
