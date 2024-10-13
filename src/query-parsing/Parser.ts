import { ParseResult } from "./index.js";
import { Token, TokenType } from "./Lexer.js";

/** Column names are either identifiers or strings. */
export type ColumnNameToken = Token & {
  type: TokenType.Identifier | TokenType.String;
};

export type OperatorToken = Token & { type: TokenType.Operator };

export type ValueToken = Token & { type: TokenType.Number | TokenType.String };

export type ParsedFilter = {
  columnToken: ColumnNameToken;
  operatorToken: OperatorToken;
  valueToken: ValueToken;
};

export class Parser {
  constructor(private readonly tokens: Token[]) {}

  parse(): ParseResult<{
    projectedColumnTokens: ColumnNameToken[];
    parsedFilters: ParsedFilter[];
  }> {
    const keywordToken = this.tokens[0];
    if (!keywordToken || keywordToken.type !== TokenType.Keyword) {
      return this.error("Expected a keyword", keywordToken);
    }

    const projectedColumnsResult: ParseResult<{
      projectedColumnTokens: ColumnNameToken[];
      iToken: number;
    }> =
      keywordToken.value === "PROJECT"
        ? this.parseColumns(1)
        : { ok: true, value: { projectedColumnTokens: [], iToken: 0 } };

    if (!projectedColumnsResult.ok) {
      return projectedColumnsResult;
    }

    const { projectedColumnTokens, iToken } = projectedColumnsResult.value;

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

    return this.tokens[iToken + 1]?.type === TokenType.Comma
      ? this.parseColumns(iToken + 2, projectedColumnTokens)
      : { ok: true, value: { projectedColumnTokens, iToken: iToken + 1 } };
  }

  private parseFilters(
    iToken: number,
    filters: ParsedFilter[] = [],
  ): ParseResult<ParsedFilter[]> {
    const token = this.tokens[iToken];
    if (!token) {
      return { ok: true, value: filters };
    }

    if (
      (token.type !== TokenType.Keyword || token.value !== "FILTER") &&
      token.type !== TokenType.Comma
    ) {
      return this.error("Expected a comma or keyword 'FILTER'", token);
    }

    const filterTokens = this.tokens.slice(iToken + 1, iToken + 4);
    const filterResult = this.parseFilter(filterTokens);
    if (!filterResult.ok) {
      return filterResult;
    }

    filters.push(filterResult.value);
    return this.parseFilters(iToken + 4, filters);
  }

  private parseFilter([
    columnNameToken,
    operatorToken,
    valueToken,
  ]: Token[]): ParseResult<ParsedFilter> {
    if (!columnNameToken) {
      return this.error("Expected a column name", undefined);
    }

    const columnNameResult = this.parseColumnName(columnNameToken);
    if (!columnNameResult.ok) {
      return columnNameResult;
    }

    if (operatorToken?.type !== TokenType.Operator) {
      return this.error("Expected an operator", operatorToken);
    }

    if (
      valueToken?.type !== TokenType.Number &&
      valueToken?.type !== TokenType.String
    ) {
      return this.error("Expected a value", valueToken);
    }

    return {
      ok: true,
      value: { columnToken: columnNameResult.value, operatorToken, valueToken },
    };
  }

  private parseColumnName(
    token: Token | undefined,
  ): ParseResult<ColumnNameToken> {
    return token?.type === TokenType.Identifier ||
      token?.type === TokenType.String
      ? { ok: true, value: token }
      : this.error("Expected a column name", token);
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
