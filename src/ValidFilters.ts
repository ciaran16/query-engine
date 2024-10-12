import {
  ColumnTypeName,
  ColumnValue,
  Schema,
  ValidSchema,
} from "./ValidSchema.js";

type OperatorFunction = <T extends ColumnValue<ColumnTypeName>>(
  a: T,
  b: T,
) => boolean;

/** All supported operators for filtering, and their functions. */
const OPERATOR_FUNCTIONS = {
  equals: (l, r) => l === r,
  not: (l, r) => l !== r,
  gt: (l, r) => l > r,
  gte: (l, r) => l >= r,
  lt: (l, r) => l < r,
  lte: (l, r) => l <= r,
} satisfies Record<string, OperatorFunction>;

/** An operator for filtering, for example `"equals"`. */
export type Operator = keyof typeof OPERATOR_FUNCTIONS;

/** The operators and values to filter a single column. */
export type Filter<T extends ColumnValue<ColumnTypeName>> = {
  [O in Operator]?: T;
};

/** A set of filters to apply to multiple columns. */
export type Filters<TSchema extends Schema> = {
  [K in keyof TSchema]?: Filter<ColumnValue<TSchema[K]>>;
};

/** An internal class to represent a set of valid filters. */
export class ValidFilters<TSchema extends Schema> {
  /** The names of the columns that have filtering applied. */
  readonly columnNames: (keyof TSchema)[];

  private readonly filtersArray: {
    [K in keyof TSchema]: [K, Filter<ColumnValue<TSchema[K]>>];
  }[keyof TSchema][];

  constructor(
    readonly schema: ValidSchema<TSchema>,
    filters: Filters<TSchema>,
  ) {
    this.filtersArray = Object.entries<
      Filter<ColumnValue<TSchema[keyof TSchema]>> | undefined
    >(filters).flatMap(([columnName, filter]) =>
      filter ? [[columnName, filter]] : [],
    );

    this.columnNames = this.filtersArray.map(([columnName]) => columnName);
  }

  /** Check if a row matches the filters. */
  isIncluded(
    row: Partial<{ [K in keyof TSchema]: ColumnValue<TSchema[K]> }>,
  ): boolean {
    const functions: Record<string, OperatorFunction> = OPERATOR_FUNCTIONS;

    return this.filtersArray.every(([columnName, filter]) => {
      const l = row[columnName];

      return (
        l !== undefined &&
        Object.entries(filter).every(
          ([operator, r]) => functions[operator]?.(l, r) ?? true,
        )
      );
    });
  }
}
