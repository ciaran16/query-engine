/** The supported column type names and their TypeScript types. */
type ColumnTypeMap = {
  string: string;
  number: number;
};

/** The name of a column type as a literal string type (for example, `"number"`). */
export type ColumnTypeName = keyof ColumnTypeMap;

/** A type representing an unvalidated schema. */
export type Schema = Record<string, ColumnTypeName>;

/** Gives the type of a column's value for a type name. */
export type ColumnValue<TColumnTypeName extends ColumnTypeName> =
  ColumnTypeMap[TColumnTypeName];

/** A schema that has been validated. */
export class ValidSchema<TSchema extends Schema> {
  /** The names of the columns in the schema, in alphabetical order. */
  readonly columnNames: [keyof TSchema, ...(keyof TSchema)[]];

  /**
   * Construct a new schema.
   *
   * The schema must have at least one column.
   *
   * @example
   * // This schema allows rows of type `{ name: string, age: number }`.
   * const schema = new ValidSchema({ name: "string", age: "number" });
   */
  constructor(
    private readonly schema: keyof TSchema extends never ? never : TSchema,
  ) {
    const columnNames = Object.keys(this.schema);
    columnNames.sort();
    const [firstColumnName, ...otherColumnNames] = columnNames;

    if (firstColumnName === undefined) {
      throw new TypeError("The schema must have at least one column.");
    }

    this.columnNames = [firstColumnName, ...otherColumnNames];
  }
}
