import { Operator } from "../ValidFilters.js";
import { ParseResult } from "./index.js";
import { Keyword, Token, TokenType } from "./Lexer.js";

export type ColumnNameToken = Token & { value: string };
export type ValueToken = Token & { type: TokenType.Number | TokenType.String };

export type ParsedFilter = {
  columnToken: ColumnNameToken;
  operator: Operator;
  valueToken: ValueToken;
};

export class Parser {
  constructor(private readonly tokens: Token[]) {}

  parse(): ParseResult<{
    columnNameTokens: ColumnNameToken[];
    parsedFilters: ParsedFilter[];
  }> {
    const projectToken = this.tokens[0];
    if (!projectToken) {
      return this.error("Query is empty", undefined);
    }

    const projectResult = this.parseKeyword(projectToken, "PROJECT");
    if (!projectResult.ok) {
      return projectResult;
    }

    return {
      ok: true,
      value: { columnNameTokens: [], parsedFilters: [] },
    };
  }

  private parseKeyword(
    token: Token,
    expectedKeyword: Keyword,
  ): ParseResult<Keyword> {
    return token.type === TokenType.Keyword && token.value === expectedKeyword
      ? { ok: true, value: token.value }
      : this.error(`Expected keyword '${expectedKeyword}'`, token);
  }

  private error(message: string, token: Token | undefined): ParseResult<never> {
    const { start, length } = token ??
      this.tokens[this.tokens.length - 1] ?? { start: 0, length: 0 };

    return {
      ok: false,
      errorType: "Malformed query",
      message,
      start,
      length,
    };
  }
}
