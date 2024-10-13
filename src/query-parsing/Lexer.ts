import { Operator } from "../ValidFilters.js";
import { ParseResult } from "./index.js";

export enum TokenType {
  Comma,
  Operator,
  Identifier,
  Keyword,
  Number,
  String,
}

const KEYWORDS = ["PROJECT", "FILTER"] as const;

export type Keyword = (typeof KEYWORDS)[number];

export type TokenWithoutPosition =
  | { type: TokenType.Comma }
  | { type: TokenType.Operator; value: Operator }
  | { type: TokenType.Identifier; value: string }
  | { type: TokenType.Keyword; value: Keyword }
  | { type: TokenType.Number; value: number }
  | { type: TokenType.String; value: string };

export type Token = TokenWithoutPosition & { start: number; length: number };

const OPERATORS: Record<string, Operator> = {
  "=": "equals",
  "!=": "not",
  "<>": "not",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
};

const OPERATOR_CHARS = ["=", "<", ">", "!"];
const WHITESPACE_CHARS = [" ", "\t", "\n", "\r"];
const QUOTE_CHARS = ["'", '"'];
const IDENTIFIER_START_CHAR_REGEX = /[a-zA-Z_]/;
const IDENTIFIER_CHAR_REGEX = /[a-zA-Z_0-9]/;
const NUMBER_START_CHAR_REGEX = /[0-9-]/;

const ESCAPE_SEQUENCE: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
};

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
    } else if (OPERATOR_CHARS.includes(currentChar)) {
      const operator = OPERATORS[this.eatOperator()];
      if (!operator) {
        return error("Unknown operator");
      }

      return token({ type: TokenType.Operator, value: operator });
    } else if (IDENTIFIER_START_CHAR_REGEX.test(currentChar)) {
      const identifier = this.eatIdentifier();
      const keyword = KEYWORDS_MAP[identifier.toUpperCase()];

      return keyword !== undefined
        ? token({ type: TokenType.Keyword, value: keyword })
        : token({ type: TokenType.Identifier, value: identifier });
    } else if (NUMBER_START_CHAR_REGEX.test(currentChar)) {
      return token({ type: TokenType.Number, value: this.eatNumber() });
    } else if (QUOTE_CHARS.includes(currentChar)) {
      const { value, isTerminated } = this.eatString();

      if (isTerminated) {
        return token({ type: TokenType.String, value });
      } else {
        return error("Reached end of query without closing quote");
      }
    } else {
      this.advance();
      return error("Unexpected character");
    }
  }

  private eatOperator(): string {
    return this.takeWhile((char) => OPERATOR_CHARS.includes(char));
  }

  private eatIdentifier(): string {
    return this.takeWhile((char) => IDENTIFIER_CHAR_REGEX.test(char));
  }

  private eatNumber(): number {
    const isNegative = this.peek() === "-";
    if (isNegative) {
      this.advance();
    }

    const string = this.takeWhile((char) => /[0-9]/.test(char));
    const positiveValue = Number(string);
    return isNegative ? -positiveValue : positiveValue;
  }

  private eatString(): { value: string; isTerminated: boolean } {
    const quote = this.peek();
    this.advance();

    const parts: string[] = [];
    while (this.peek() !== quote && this.peek() !== null) {
      const part = this.takeWhile((char) => char !== quote && char !== "\\");
      parts.push(part);

      // Handle escape sequences.
      if (this.peek() === "\\") {
        this.advance();
        const escapedChar = this.peek();

        if (escapedChar !== null) {
          const escapedCharValue = ESCAPE_SEQUENCE[escapedChar] ?? escapedChar;
          parts.push(escapedCharValue);
          this.advance();
        }
      }
    }

    const isTerminated = this.peek() === quote;
    if (isTerminated) {
      this.advance();
    }

    return { value: parts.join(""), isTerminated };
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
