/** Expect a value to not be undefined. */
export function notUndefined<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error(`Expected value to not be undefined.`);
  }

  return value;
}

/** Convert an array of keys into an object with those keys. */
export function mapIntoObject<T extends object>(
  keys: readonly (keyof T)[],
  valueForKey: <K extends keyof T>(k: K) => T[K],
): T {
  return Object.fromEntries(keys.map((k) => [k, valueForKey(k)])) as T;
}
