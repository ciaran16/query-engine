import { parse } from "csv-parse";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { inspect } from "node:util";
import {
  MemoryStore,
  parseQuery,
  ParseResult,
  Query,
  Schema,
  ValidSchema,
} from "query-engine";

type RawColumn = { name: string; values: string[]; isInteger: boolean };
type Column = { name: string } & (
  | { type: "string"; values: string[] }
  | { type: "number"; values: number[] }
);

const FILE_PATH = join(import.meta.dirname, "data.csv");
const INTEGER_REGEX = /^-?\d+$/;
const COLUMN_PRINT_WIDTH = 30;
const COLUMN_SEPARATOR = " | ";
const MAX_RESULTS = 20;

const rawColumns = await readRows(FILE_PATH);
if (!rawColumns) {
  throw new Error("No columns found");
}

const columns: Column[] = rawColumns.map(({ name, values, isInteger }) =>
  isInteger
    ? { name, type: "number", values: values.map((v) => Number(v)) }
    : { name, type: "string", values },
);

println(
  "\n\nAvailable columns:\n\n",
  columns.map((column) => `${column.name}: ${column.type}`).join("\n"),
  "\n\n",
);

const store = loadIntoStore(rawColumns);

println(
  "Enter a query.\n\n",
  "For example, to find all companies with between 1000 and 2000 employees:\n",
);
println(
  `PROJECT Name, Description `,
  `FILTER "Number of employees" >= 1000, "Number of employees" < 2000`,
);

const rl = createInterface({ input: process.stdin, output: process.stdout });

for (
  let queryString = await rl.question("\n\nQuery: ");
  queryString !== "";
  queryString = await rl.question("\n\nQuery: ")
) {
  const parsedQueryResult = parseQuery(store.schema, queryString);
  if (parsedQueryResult.ok) {
    runAndPrintQuery(parsedQueryResult.value, store);
  } else {
    printParseError(queryString, parsedQueryResult);
  }
}

println("\nQuery is empty, exiting.\n");

rl.close();

/** Read and parse a CSV file. */
async function readRows(filePath: string): Promise<RawColumn[] | null> {
  const parser = createReadStream(filePath).pipe(parse());

  let columns: RawColumn[] | null = null;
  for await (const row of parser) {
    if (!isStringArray(row)) {
      throw new Error(`Received invalid row: ${inspect(row)}`);
    }

    if (!columns) {
      columns = row.map((columnName) => ({
        name: columnName,
        values: [],
        isInteger: true,
      }));
    } else {
      columns.forEach((column, index) => {
        const value = row[index] ?? "";
        column.values.push(value);
        column.isInteger = column.isInteger && INTEGER_REGEX.test(value);
      });
    }
  }

  return columns;
}

/** Load a parsed CSV file into an in-memory store. */
function loadIntoStore(rawColumns: RawColumn[]): MemoryStore<Schema> {
  const columns: Column[] = rawColumns.map(({ name, values, isInteger }) =>
    isInteger
      ? { name, type: "number", values: values.map((v) => Number(v)) }
      : { name, type: "string", values },
  );

  const schema = Object.fromEntries(
    columns.map((column) => [column.name, column.type] as const),
  );

  return new MemoryStore(
    new ValidSchema(schema),
    Object.fromEntries(columns.map((c) => [c.name, c.values])),
  );
}

/** Run a query and print the results in a table. */
function runAndPrintQuery(
  { project, filters }: Query<Schema, string[]>,
  store: MemoryStore<Schema>,
): void {
  // Default to all columns if no columns are specified.
  project = project.length > 0 ? project : store.schema.columnNames;

  const stringWidth = (s: string, width: number) =>
    s.length > width ? s.slice(0, width - 3) + "..." : s.padEnd(width);

  // Print column names.
  println(
    "\n\n",
    project
      .map((name) => stringWidth(name, COLUMN_PRINT_WIDTH))
      .join(COLUMN_SEPARATOR),
  );

  const line = "-".repeat(COLUMN_PRINT_WIDTH);
  println(Array(project.length).fill(line).join(COLUMN_SEPARATOR));

  let resultCount = 0;
  for (const row of store.streamQuery({ project, filters })) {
    resultCount++;

    if (resultCount <= MAX_RESULTS) {
      println(
        project
          .map((name) => stringWidth(String(row[name]), COLUMN_PRINT_WIDTH))
          .join(COLUMN_SEPARATOR),
      );
    } else if (resultCount === MAX_RESULTS + 1) {
      println(`...\n\nShowing only the first ${String(MAX_RESULTS)} results.`);
    }
  }

  println(`\n${String(resultCount)} results / ${String(store.size)} rows.`);
}

function printParseError(
  queryString: string,
  { errorType, message, start, length }: ParseResult<never> & { ok: false },
) {
  const highlightRed = (s: string) => `\x1b[41m${s}\x1b[0m`;

  println("\n\n", errorType, ":\n");

  const before = queryString.slice(0, start);
  const invalid = length === 0 ? " " : queryString.slice(start, start + length);

  println(before, highlightRed(invalid), " <- ", message, ".");
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

function println(...parts: string[]) {
  process.stdout.write(parts.join(""));
  process.stdout.write("\n");
}
