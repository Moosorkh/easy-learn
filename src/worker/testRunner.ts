// Simple Web Worker test runner
// Receives: { code: string, tests: { code: string, expected: any }[], exportName: string }
// Returns: { results: { pass: boolean, actual: any, expected: any, error?: string }[] }

interface TestCase {
  code: string;
  expected: any;
}

interface RunMessage {
  code: string;
  tests: TestCase[];
  exportName: string;
}

self.onmessage = async (e: MessageEvent<RunMessage>) => {
  const { code, tests, exportName } = e.data;

  try {
    // Build a function to evaluate user code and expose exports
    const factory = new Function(
      `${code}\n\nreturn (typeof ${exportName} !== 'undefined') ? { ${exportName} } : {};`
    ) as () => Record<string, any>;

    const api = factory();
    const exported = api[exportName];

    // Validate the exported symbol exists and is callable
    if (exported === undefined) {
      (self as any).postMessage({
        fatal: `Function '${exportName}' not found. Make sure you define it.`,
      });
      return;
    }
    if (typeof exported !== "function") {
      (self as any).postMessage({
        fatal: `'${exportName}' exists but is not a function. Expected a function.`,
      });
      return;
    }

    const results = tests.map((t) => {
      try {
        const argNames = [exportName];
        const argValues = [exported];
        const runner = new Function(...argNames, `return ( ${t.code} );`) as (
          ...args: any[]
        ) => any;
        const actual = runner(...argValues);
        const pass = deepEqual(actual, t.expected);
        return { pass, actual, expected: t.expected } as const;
      } catch (err: any) {
        return {
          pass: false,
          actual: undefined,
          expected: t.expected,
          error: String((err && err.message) || err),
        };
      }
    });

    (self as any).postMessage({ results });
  } catch (err: any) {
    (self as any).postMessage({ fatal: String((err && err.message) || err) });
  }
};

function deepEqual(a: any, b: any): boolean {
  // Simple deep equality for primitives, arrays, and plain objects
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a && b && typeof a === "object") {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++)
        if (!deepEqual(a[i], b[i])) return false;
      return true;
    }
    const ak = Object.keys(a).sort();
    const bk = Object.keys(b).sort();
    if (!deepEqual(ak, bk)) return false;
    for (const k of ak) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}
