import { Operator } from "../ValidFilters.js";
import { ParseResult } from "./index.js";

export enum TokenType {
  Comma,
  Operator,
  Identifier,
  Keyword,
  String,
  Number,
}

const KEYWORDS = ["PROJECT", "FILTER"] as const;

type Keyword = (typeof KEYWORDS)[number];

export type TokenWithoutPosition =
  | { type: TokenType.Comma }
  | { type: TokenType.Operator; value: Operator }
  | { type: TokenType.Identifier; value: string }
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.String; value: string }
  | { type: TokenType.Number; value: number };

export type Token = TokenWithoutPosition & { start: number; length: number };

const WHITESPACE_CHARS = [" ", "\t", "\n", "\r"];
const IDENTIFIER_START_CHAR_REGEX = /[a-zA-Z_]/;
const IDENTIFIER_CHAR_REGEX = /[a-zA-Z_0-9]/;

const KEYWORDS_MAP: Record<string, Keyword> = Object.fromEntries(
  KEYWORDS.map((keyword) => [keyword, keyword]),
);

export class Lexer {
  private position = 0;

  constructor(private readonly queryString: string) {}

  readTokensUntilEnd(): ParseResult<Token[]> {
    const tokens: Token[] = [];

    let result = this.readToken();
    while (result.ok && result.value) {
      tokens.push(result.value);
      result = this.readToken();
    }

    if (!result.ok) {
      return result;
    } else {
      return { ok: true, value: tokens };
    }
  }

  readToken(): ParseResult<Token | null> {
    this.skipWhitespace();
    const start = this.position;

    const token = (
      tokenWithoutPosition: TokenWithoutPosition,
    ): { ok: true; value: Token } => ({
      ok: true,
      value: { start, length: this.position - start, ...tokenWithoutPosition },
    });

    const error = (message: string): ParseResult<never> => ({
      ok: false,
      errorType: "Syntax error",
      message,
      start,
      length: this.position - start,
    });

    const currentChar = this.peek();
    if (currentChar === null) {
      return { ok: true, value: null };
    } else if (currentChar === ",") {
      this.advance();
      return token({ type: TokenType.Comma });
    } else if (IDENTIFIER_START_CHAR_REGEX.test(currentChar)) {
      const identifier = this.eatIdentifier();
      const keyword = KEYWORDS_MAP[identifier.toUpperCase()];

      return keyword !== undefined
        ? token({ type: TokenType.Keyword, value: keyword })
        : token({ type: TokenType.Identifier, value: identifier });
    } else {
      this.advance();
      return error("Unexpected character");
    }
  }

  private eatIdentifier(): string {
    return this.takeWhile((char) => IDENTIFIER_CHAR_REGEX.test(char));
  }

  private skipWhile(predicate: (char: string) => boolean): void {
    for (
      let char = this.peek();
      char !== null && predicate(char);
      char = this.peek()
    ) {
      this.advance();
    }
  }

  private takeWhile(predicate: (char: string) => boolean): string {
    const start = this.position;
    this.skipWhile(predicate);
    return this.queryString.slice(start, this.position);
  }

  private skipWhitespace(): void {
    this.skipWhile((char) => WHITESPACE_CHARS.includes(char));
  }

  private peek(): string | null {
    return this.queryString[this.position] ?? null;
  }

  private advance(): void {
    this.position++;
  }
}
