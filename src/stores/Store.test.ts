import { expect, it } from "vitest";
import { mapIntoObject } from "../utils.js";
import { ColumnValue, Schema, ValidSchema } from "../ValidSchema.js";
import { Store } from "./Store.js";

class TestStore<TSchema extends Schema> extends Store<TSchema> {
  constructor(
    schema: ValidSchema<TSchema>,
    private readonly rows: { [K in keyof TSchema]: ColumnValue<TSchema[K]> }[],
  ) {
    super(schema);
  }

  override streamRows<TColumnNames extends readonly (keyof TSchema)[]>(
    columnNames: TColumnNames,
  ): IterableIterator<{
    [K in TColumnNames[number]]: ColumnValue<TSchema[K]>;
  }> {
    return this.rows
      .map((row) =>
        mapIntoObject<{
          [K in TColumnNames[number]]: ColumnValue<TSchema[K]>;
        }>(columnNames, (columnName) => row[columnName]),
      )
      .values();
  }
}

const schema = new ValidSchema({ name: "string", age: "number" });

const store = new TestStore(schema, [
  { name: "James", age: 29 },
  { name: "Elizabeth", age: 32 },
]);

it("filters rows", () => {
  const rows = store.query({
    project: ["name", "age"],
    filters: { name: { equals: "James" }, age: { lt: 30 } },
  });

  expect(rows).toEqual([{ name: "James", age: 29 }]);
});

it("projects rows when there are no filters", () => {
  const rows = store.query({ project: ["name"] });

  expect(rows).toEqual([{ name: "James" }, { name: "Elizabeth" }]);
});

it("filters correctly when filtered columns aren't selected", () => {
  const rows = store.query({
    project: ["name"],
    filters: { age: { gt: 30 } },
  });

  expect([...rows]).toEqual([{ name: "Elizabeth" }]);
});

it("allows projecting no columns", () => {
  const rows = store.query({ project: [] });

  expect(rows).toEqual([{}, {}]);
});
