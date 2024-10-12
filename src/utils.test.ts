import { describe, expect, it } from "vitest";
import { mapIntoObject, notUndefined } from "./utils.js";

describe(notUndefined, () => {
  it("returns the value if it's not undefined", () => {
    expect(notUndefined(0)).toBe(0);
  });

  it("throws an error if the value is undefined", () => {
    expect(() => {
      notUndefined(undefined);
    }).toThrow(/undefined/);
  });
});

describe(mapIntoObject, () => {
  it("maps an array of keys into an object with those keys", () => {
    expect(
      mapIntoObject<{ a: string; b: string; c: string }>(["a", "b", "c"], (k) =>
        k.toUpperCase(),
      ),
    ).toEqual({ a: "A", b: "B", c: "C" });
  });
});
