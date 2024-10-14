import { mapIntoObject, notUndefined } from "../utils.js";
import { ColumnValue, Schema, ValidSchema } from "../ValidSchema.js";
import { Store } from "./Store.js";

/** An in-memory store where rows are stored as arrays of column values. */
export class MemoryStore<TSchema extends Schema> extends Store<TSchema> {
  readonly size: number;

  /**
   * Create a new in-memory store.
   *
   * It's recommended not to construct this directly. Instead, use `MemoryStore.fromRows`.
   *
   * All column arrays must have the same length and can not be modified after construction.
   */
  constructor(
    schema: ValidSchema<TSchema>,
    private readonly columns: {
      [K in keyof TSchema]: ColumnValue<TSchema[K]>[];
    },
  ) {
    super(schema);

    // This is guaranteed to be a string because ValidSchema ensures at least one column.
    const columnName = schema.columnNames[0];
    this.size = columns[columnName].length;

    const allSameLength = this.schema.columnNames.every(
      (columnName) => this.columns[columnName].length === this.size,
    );
    if (!allSameLength) {
      throw new TypeError("All column arrays must have the same length.");
    }
  }

  /**
   * Create an in-memory store from an iterable of rows.
   *
   * @example
   * const schema = new ValidSchema({ name: "string", age: "number" });
   *
   * const store = MemoryStore.fromRows(schema, [
   *   { name: "James", age: 29 },
   *   { name: "Elizabeth", age: 32 }
   * ]);
   */
  static fromRows<TSchema extends Schema>(
    schema: ValidSchema<TSchema>,
    rows: Iterable<{ [K in keyof TSchema]: ColumnValue<TSchema[K]> }>,
  ): Store<TSchema> {
    const columns = mapIntoObject<{
      [K in keyof TSchema]: ColumnValue<TSchema[K]>[];
    }>(schema.columnNames, () => []);

    for (const row of rows) {
      for (const columnName of schema.columnNames) {
        columns[columnName].push(row[columnName]);
      }
    }

    return new MemoryStore(schema, columns);
  }

  override *streamRows<TColumnNames extends readonly (keyof TSchema)[]>(
    columnNames: TColumnNames,
  ): Generator<{ [K in TColumnNames[number]]: ColumnValue<TSchema[K]> }> {
    for (let rowIndex = 0; rowIndex < this.size; rowIndex++) {
      yield mapIntoObject<{
        [K in TColumnNames[number]]: ColumnValue<TSchema[K]>;
      }>(columnNames, (columnName) =>
        // This won't be undefined because we've already checked rowIndex < this.size.
        notUndefined(this.columns[columnName][rowIndex]),
      );
    }
  }
}
