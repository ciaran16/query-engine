import { mapIntoObject } from "../utils.js";
import { Filters, ValidFilters } from "../ValidFilters.js";
import { ColumnValue, Schema, ValidSchema } from "../ValidSchema.js";

export type Query<
  TSchema extends Schema,
  TColumnNames extends readonly (keyof TSchema)[],
> = {
  project: TColumnNames;
  filters?: Filters<TSchema>;
};

/** A store holds a collection of rows that match its schema. */
export abstract class Store<TSchema extends Schema> {
  constructor(readonly schema: ValidSchema<TSchema>) {}

  /**
   * Stream rows from a store.
   *
   * @example
   * const rows: { name: string }[] = [...store.streamRows(["name"])];
   */
  abstract streamRows<TColumnNames extends readonly (keyof TSchema)[]>(
    columnNames: TColumnNames,
  ): IterableIterator<{ [K in TColumnNames[number]]: ColumnValue<TSchema[K]> }>;

  /** Stream rows from a store that match a set of filters. */
  *streamQuery<TColumnNames extends readonly (keyof TSchema)[]>({
    project,
    filters,
  }: Query<TSchema, TColumnNames>): Generator<
    { [K in TColumnNames[number]]: ColumnValue<TSchema[K]> },
    void
  > {
    const validFilters = new ValidFilters(this.schema, filters ?? {});

    // Select the column names needed for filtering too.
    const combinedColumnNames = [
      ...new Set([...project, ...validFilters.columnNames]),
    ];

    for (const row of this.streamRows(combinedColumnNames)) {
      if (validFilters.isIncluded(row)) {
        yield mapIntoObject<{
          [K in TColumnNames[number]]: ColumnValue<TSchema[K]>;
        }>(project, (columnName) => row[columnName]);
      }
    }
  }

  /**
   * Filter rows from a store, returning an array of matching rows.
   *
   * Note: this will load all matching rows into memory at once. Consider using `streamQuery` to
   * process matching rows one at a time.
   *
   * @example
   * // Find the names of all people aged 18 or over.
   * const adults = store.query({
   *   project: ["name"],
   *   filters: { age: { gte: 18 } },
   * });
   */
  query<TColumnNames extends readonly (keyof TSchema)[]>({
    project,
    filters,
  }: Query<TSchema, TColumnNames>): {
    [K in TColumnNames[number]]: ColumnValue<TSchema[K]>;
  }[] {
    return Array.from(this.streamQuery({ project, filters }));
  }
}
