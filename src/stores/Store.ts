import { ColumnValue, Schema, ValidSchema } from "../ValidSchema.js";

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
}
