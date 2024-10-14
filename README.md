# Query Engine

A simplified query engine in TypeScript.

## Getting started

Using `pnpm` and Node `20.18.0` is recommended. Install dependencies with:

```sh
pnpm install
```

Run tests, build, and lint with:

```sh
pnpm test    # Run tests using vitest.
pnpm build   # Build the project just using TypeScript.
pnpm inspect # Run ESLint and check formatting using Prettier.
pnpm fix     # Fix linting issues and format using Prettier.
```

I picked Vitest because I've heard it works better with TypeScript than Jest but is largely compatible.

I use ESLint with type-aware linting rules, largely using the recommended rules but with a few tweaks.

### Demo

Run the demo script with:

```sh
pnpm demo
```

Try out some valid queries. Multiple filters are supported, and there's support for comparison operators for both strings and numbers: `= != > >= < <=`. For example, to find all companies with between 1000 and 2000 employees:

```ts
> PROJECT Name, Description FILTER "Number of employees" >= 1000, "Number of employees" < 2000

Name                           | Description
------------------------------ | ------------------------------
Chaney-Kent                    | Expanded analyzing Graphic ...
Hood-Becker                    | Automated methodical Graphi...
Hunt Ltd                       | Assimilated optimizing syst...
...

Showing only the first 3 results.

95 results / 1000 rows.
```

Try out some invalid queries to get hopefully good errors. Queries are checked for valid syntax and structure, and are type checked before execution to ensure columns exist and filter values are the same type as the column.

```txt
> PROJECT Name Description FILTER "Number of employees" >= 1000

Malformed query:

PROJECT Name |Description| <- Expected a comma or keyword 'FILTER'.
```

```txt
> PROJECT Name, Description FILTER Name >= 1000, "Number of employees" < 2000

Type error:

PROJECT Name, Description FILTER Name >= |1000| <- Expected a string.
```

**All features:**

- Multiple filters separated by a comma.
- Comparison operators for both strings and numbers: `= != > >= < <=`.
- Type checking before query execution.
- Use identifiers or strings for column names.
- `PROJECT` only queries are supported, and return all rows.
- `FILTER` only queries are supported, and project all columns.
- Positive and negative integers.
- Strings support, using `"` or `'`, including escape sequences (e.g. `"quote \" newline \n"`).
- All whitespace is ignored (although pressing enter executes a query for the demo).

### TypeScript API

There's also a TypeScript API that type checks rows against a schema and infers the types of query results:

```ts
import { MemoryStore, ValidSchema } from "query-engine";

const schema = new ValidSchema({
  name: "string",
  age: "number",
});

const store = MemoryStore.fromRows(schema, [
  { name: "James", age: 29 },
  { name: "Elizabeth", age: 32 },
  // This wouldn't type check as it doesn't match the schema.
  // { name: 123, age: "?" }
]);

// Type `{ name: string }[]` is inferred automatically.
const peopleAged20To30 = store.query({
  project: ["name"],
  filters: {
    age: { gte: 20, lt: 30 },
    // This wouldn't type check as the value doesn't match the schema.
    // name: { equals: 123 },
    // This wouldn't type check as the column doesn't exist.
    // fullName: { not: "James" },
  },
});

// This will log `[{ name: 'James' }]`.
console.log(peopleAged20To30);
```

## Implementation

I've implemented a library for most of the functionality:

- Different types of stores go in `src/stores/` (currently there's just `MemoryStore` and its parent class).
- Parsing and type checking of query strings (`PROJECT ... FILTER ...`) is in `src/query-parsing/`.

CSV handling is currently just done as part of the demo script in `demo/demo.ts` due to time constraints (along with detecting the schema to use). I didn't want to add this to the main library, but if I'd had more time I would probably put this in a separate package e.g. a command line tool for using the core library for querying files.

## Questions

### What were some of the tradeoffs you made when building this and why were these acceptable tradeoffs?

#### Columnar storage vs row-based storage

One of the things mentioned in the instructions was:

> Performance-aware data traversal and filtering: try not to loop through data more than necessary

I thought it would be interesting to store the data as a set of column arrays, as this means I only need to read the data for columns used in a query.

```ts
{
  name: ["James", "Elizabeth"],
  age: [29, 32],
}
```

This should give better query performance (in theory! In practice, I'd need to benchmark) and lower memory usage (as column names don't need to be stored for each row/object).

**Justification:** The main tradeoff here is that it adds some code and typing complexity.. However given that the main purpose of this library is to load a dataset once then query it repeatedly, the tradeoffs seem very worth it. It may also slightly decrease the performance for queries that use most of the columns, but again, I'd need to benchmark to confirm.

#### Yielding rows one at a time

Internally, rows are yielded one at a time when loading or querying them. For example, the `streamQuery` method on a store reads each row in the store one at a time, and yields matching rows one at a time in turn.

**Justification**: This increases code complexity, especially since JavaScript doesn't have particularly nice ways of managing iterators yet (like using `map`). However, there are a lot of pros. Memory usage is significantly reduced, preventing effectively doubling the memory usage if a query matches most rows. Yielding rows one at a time also allows lower latency for initial results, and means pagination and `LIMIT` queries can be built on top. The developer experience isn't compromised either, because there is still a method for querying to an array for small data sets.

#### Error handling vs performance

> Human-friendly errors: ensure that every thrown error is handled

I focused on making sure errors returned from query parsing were high quality and gave the exact location of the issue. I also returned error messages using a `ParseResult` type, rather than throwing error objects.

**Justification:** Good error messages improve the developer experience for users of the library, and encoding error messages in the return type means developers means errors won't be missed by users or contributors. There's a small performance impact to query parsing, but this should be negligible compared to the time spent executing the query.

#### Custom parsing vs third-party libraries

Honestly I mainly chose custom because I have experience writing custom parsers and I thought it would be quicker that learning a new library. However, custom parsing tends to lead to higher quality error messages and should make it simpler to integrate type checking. It's also fully flexible so always full control over the query language design.

If more requirements were added, it might make sense to look into third-party parsing libraries.

### What changes are needed to process extremely large datasets

For large datasets that still fit in memory, things should already work fairly well:

- Rows are iterated/yielded one at a time, rather than all duplicated in memory at once, as mentioned above.
- Columnar storage means column names are not re-stored along with every row.

For datasets that are too large to fit in memory, it should be fairly straightforward to add another `Store` subclass that only keeps a subset of its data in memory, with some minor changes to the `Store` interface (e.g. making `streamRows` and `streamQuery` async generators instead).

Adding **index support** would also likely be necessary to retain good query performance – see the section below on potential improvements.

### Given more time, what improvements or optimizations would you want to add? When would you add them?

It's worth noting that I've already added some features not in the initial requirements. Part of this was to make it easier to support the future requirements hinted at by these questions (e.g. large datasets), but in practice I wouldn't add features if they weren't in the requirements unless it seemed very likely they would be needed in the future and adding support later would be difficult.

So in general, I would add these features when the team decided it was worth adding these features, probably in response to business requirements or user requests.

#### Other store types

The `Store` abstract class should make it fairly straightforward to add other store types like on-disk storage, or reading across a network.

**When to add:** Given that one the questions is around extremely large datasets, adding support for a `DiskStore` would likely be a priority. Other store types would likely be less of a priority.

#### Index support

Adding indexes could significantly improve filter performance and would help for implementing ordering and supporting large datasets while maintaining good performance.

At their most basic, assuming we're not adding the ability to update existing stores/datasets, indexes could be represented as an array of values in order for a column, with each value alongside its index in the store. We could tthen binary search that array to efficiently filter for all currently implemented operators (`= != > >= < <=`).

This would likely also require a basic query optimiser, to decide when to use an index vs just doing a full scan, and to combine multiple operators for a column (e.g. currently any combination of supported operators can be combined into a single, possibly open ended, range).

Other index types, like hash maps for equality-only filtering, or B-trees if we're allowing modification of the Store, may also be appropriate.

**When to add:** this could add a lot of complexity, but could also massively improve performance, and could be important for some features like ordering of results or very large datasets. It would really depend on how the library will be used going forward.

### What changes are needed to accommodate changes to support other data types, multiple filters, or ordering of results?

**Other data types:** For the TypeScript API, the type name and TypeScript type needs to be added to the `ColumnTypeMap` in `ValidSchema.ts`. The operator functions in `ValidFilters.ts` will also need to be extended to support the added type, or alternatively it might be necessary to refactor so that not all operators can be used on all types. Lexing and parsing support will also need to be added in `src/query-parsing/`.

**Multiple filters:** Already supported! For both the query language and the TypeScript API. See the getting started section at the top.

**Ordering of results:** Adding basic support for this would be fairly straightforward – add a new `order` property for the TypeScript API, and add syntax to the lexer/parser (e.g. `ORDER`/`DESC`/`ASC` keywords). However, this would undo the benefits of the streaming API, since now all rows would need to be read up front, before sorting and then yielding the first row. Index support and a query optimiser would be necessary to keep the advantages of the streaming API, as mentioned in the index support section above.

### What do you still need to do to make this code production ready?

The library code is somewhat production ready, if lacking in features. It has great test coverage, quite a few doc comments, and should work in Node or in a browser. It would need some more documentation, a better name, and some integration testing and benchmarking with larger datasets.

The CSV handling isn't currently part of the main feature set, so it would either need to be added to the library, or moved into its own package that uses the library as a dependency. I could see other adaptors being added as separate packages, e.g. `@query-engine/json` etc.
