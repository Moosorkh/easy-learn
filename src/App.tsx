import { useEffect, useMemo, useState } from "react";
import "./App.css";
import level1 from "./levels/linear-search/level1.json";
import level2 from "./levels/linear-search/level2.json";
import level3 from "./levels/linear-search/level3.json";
import type { SimpleLevel } from "./types/level";

const LEVELS: SimpleLevel[] = [
  level1 as SimpleLevel,
  level2 as SimpleLevel,
  level3 as SimpleLevel,
];

const palette = {
  page: "#f5f5f5",
  panel: "#ffffff",
  border: "#d1d5db",
  gradient: "linear-gradient(135deg, #1e40af 0%, #0c4a6e 100%)",
  primary: "#1e40af",
  secondary: "#0c4a6e",
  textPrimary: "#111827",
  textSecondary: "#4b5563",
  textMuted: "#6b7280",
  success: "#059669",
  warning: "#d97706",
  danger: "#dc2626",
  neutral: "#e5e7eb",
  accent: "#0891b2",
};

function useLocalStorage(key: string, initial: string) {
  const [value, setValue] = useState<string>(() => {
    const v = localStorage.getItem(key);
    return v !== null ? v : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const level = LEVELS[levelIndex];
  const codeKey = `code:${level.id}`;
  const [code, setCode] = useLocalStorage(codeKey, level.starterCode);
  const [results, setResults] = useState<
    { pass: boolean; actual: any; expected: any; error?: string }[] | null
  >(null);
  const [running, setRunning] = useState(false);
  const [passed, setPassed] = useState<boolean>(
    () => localStorage.getItem(`passed:${level.id}`) === "true"
  );
  const [progressVersion, setProgressVersion] = useState(0);

  useEffect(() => {
    // When switching levels, refresh code/results state
    const k = `code:${LEVELS[levelIndex].id}`;
    const saved = localStorage.getItem(k);
    setCode(saved ?? LEVELS[levelIndex].starterCode);
    setResults(null);
    setPassed(
      localStorage.getItem(`passed:${LEVELS[levelIndex].id}`) === "true"
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex]);

  const runTests = async () => {
    if (running) return;
    setRunning(true);
    setResults(null);

    // Create worker per run to allow termination on timeout
    const w = new Worker(new URL("./worker/testRunner.ts", import.meta.url), {
      type: "module",
    });
    const TIMEOUT_MS = 4000;

    const outcome: Promise<any> = new Promise((resolve) => {
      const timer = setTimeout(() => {
        try {
          w.terminate();
        } catch {}
        resolve({ timeout: true });
      }, TIMEOUT_MS);
      w.onmessage = (ev) => {
        clearTimeout(timer);
        resolve(ev.data);
      };
    });

    w.postMessage({ code, tests: level.tests, exportName: level.exportName });
    const data = await outcome;
    setRunning(false);

    // Terminate worker after completion to prevent memory leaks
    try {
      w.terminate();
    } catch {}

    if (data?.timeout) {
      setResults([
        {
          pass: false,
          actual: undefined,
          expected: "result within time",
          error: "Timed out (possible infinite loop)",
        },
      ]);
      return;
    }
    if (data?.fatal) {
      setResults([
        {
          pass: false,
          actual: undefined,
          expected: "no fatal error",
          error: String(data.fatal),
        },
      ]);
      return;
    }
    const results = (data?.results ?? []) as {
      pass: boolean;
      actual: any;
      expected: any;
      error?: string;
    }[];
    setResults(results);
    const allPass = results.length > 0 && results.every((r) => r.pass);
    setPassed(allPass);
    if (allPass) {
      localStorage.setItem(`passed:${level.id}`, "true");
      setProgressVersion((v) => v + 1);
    }
  };

  const progress = useMemo(() => {
    const total = LEVELS.length;
    const done = LEVELS.filter(
      (l) => localStorage.getItem(`passed:${l.id}`) === "true"
    ).length;
    return { done, total, isComplete: done === total };
  }, [levelIndex, progressVersion]);

  const hintSections = [
    {
      id: "concept",
      title: "Hints — Conceptual (try first)",
      icon: "🧠",
      colors: { text: palette.danger, bg: "#fff5f5", border: "#fecdd3" },
      items: level.hints.hard,
    },
    {
      id: "pseudo",
      title: "Hints — Pseudo-code",
      icon: "📝",
      colors: { text: "#b7791f", bg: "#fff8eb", border: "#fcd9a6" },
      items: level.hints.medium,
    },
    {
      id: "solution",
      title: "Solution — Line by Line (last resort!)",
      icon: "⚠️",
      colors: { text: palette.warning, bg: "#fffbea", border: "#fde68a" },
      items: level.hints.easy,
    },
  ];

  const indexedResults =
    results?.map((res, index) => ({ ...res, index })) ?? null;

  // Show completion screen if all levels done
  if (progress.isComplete) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: palette.gradient,
        }}
      >
        <div
          style={{
            background: palette.panel,
            borderRadius: 16,
            padding: 48,
            maxWidth: 600,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h1
            style={{
              fontSize: 32,
              marginBottom: 8,
              color: palette.textPrimary,
            }}
          >
            Algorithm Complete!
          </h1>
          <p
            style={{
              fontSize: 18,
              color: palette.textSecondary,
              marginBottom: 32,
            }}
          >
            You've mastered <strong>Linear Search</strong>
          </p>

          <div
            style={{
              background: palette.neutral,
              borderRadius: 12,
              padding: 24,
              marginBottom: 32,
            }}
          >
            <h3
              style={{
                fontSize: 20,
                marginBottom: 16,
                color: palette.textPrimary,
              }}
            >
              Your Stats
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                textAlign: "center",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: palette.primary,
                  }}
                >
                  {progress.total}
                </div>
                <div style={{ fontSize: 14, color: palette.textSecondary }}>
                  Levels Completed
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: "bold",
                    color: palette.secondary,
                  }}
                >
                  100%
                </div>
                <div style={{ fontSize: 14, color: palette.textSecondary }}>
                  Success Rate
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => {
                // Reset progress
                LEVELS.forEach((l) => {
                  localStorage.removeItem(`passed:${l.id}`);
                  localStorage.removeItem(`code:${l.id}`);
                });
                setProgressVersion((v) => v + 1);
                setLevelIndex(0);
              }}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 8,
                background: palette.neutral,
                border: `1px solid ${palette.border}`,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => {
                alert("More algorithms coming soon!");
              }}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 8,
                background: palette.gradient,
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Next Algorithm →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", background: palette.page }}
    >
      <aside
        style={{
          width: 280,
          background: palette.panel,
          borderRight: `1px solid ${palette.border}`,
          padding: 24,
          boxShadow: "2px 0 12px rgba(15, 23, 42, 0.05)",
        }}
      >
        <h2
          style={{
            fontSize: 24,
            marginBottom: 8,
            background: palette.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontWeight: 700,
          }}
        >
          Easy Learn
        </h2>
        <div
          style={{
            fontSize: 14,
            color: palette.textSecondary,
            marginBottom: 20,
          }}
        >
          <strong>Linear Search</strong>
        </div>

        {/* Progress Bar */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: palette.textMuted,
              marginBottom: 6,
              fontWeight: 500,
            }}
          >
            <span>Progress</span>
            <span>
              {progress.done}/{progress.total}
            </span>
          </div>
          <div
            style={{
              height: 8,
              background: palette.neutral,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: palette.gradient,
                width: `${(progress.done / progress.total) * 100}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
          {LEVELS.map((lvl, i) => {
            const ok = localStorage.getItem(`passed:${lvl.id}`) === "true";
            const unlocked =
              i === 0 ||
              localStorage.getItem(`passed:${LEVELS[i - 1].id}`) === "true";
            return (
              <li key={lvl.id} style={{ marginBottom: 10 }}>
                <button
                  onClick={() => unlocked && setLevelIndex(i)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 14px",
                    background:
                      i === levelIndex
                        ? palette.gradient
                        : unlocked
                        ? palette.panel
                        : palette.neutral,
                    color:
                      i === levelIndex
                        ? "white"
                        : unlocked
                        ? palette.textPrimary
                        : palette.textMuted,
                    border:
                      i === levelIndex
                        ? "1px solid transparent"
                        : `1px solid ${palette.border}`,
                    borderRadius: 8,
                    cursor: unlocked ? "pointer" : "not-allowed",
                    fontWeight: i === levelIndex ? 600 : 400,
                    fontSize: 14,
                    boxShadow:
                      i === levelIndex
                        ? "0 6px 16px rgba(91, 108, 255, 0.25)"
                        : "none",
                  }}
                >
                  {ok ? "✅" : unlocked ? "⬜" : "🔒"} {lvl.order}. {lvl.title}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <main
        style={{
          flex: 1,
          padding: 32,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <section
          style={{
            background: palette.panel,
            border: `1px solid ${palette.border}`,
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ fontSize: 20, marginBottom: 8, color: palette.textPrimary }}>
            {level.title}
          </h3>
          <p
            style={{
              whiteSpace: "pre-wrap",
              color: palette.textSecondary,
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {level.description}
          </p>

          <div style={{ marginTop: 20 }}>
            <details
              style={{
                marginBottom: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: palette.accent,
                  fontSize: 14,
                }}
              >
                💡 Hints — Conceptual (try first)
              </summary>
              <ol
                style={{
                  marginTop: 12,
                  paddingLeft: 20,
                  color: palette.textSecondary,
                  fontSize: 14,
                }}
              >
                {level.hints.hard.map((h, idx) => (
                  <li key={idx} style={{ marginTop: 6 }}>
                    {h}
                  </li>
                ))}
              </ol>
            </details>
            <details
              style={{
                marginBottom: 12,
                border: `1px solid ${palette.border}`,
                borderRadius: 8,
                padding: 12,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: palette.warning,
                  fontSize: 14,
                }}
              >
                📝 Hints — Pseudo-code
              </summary>
              <ol
                style={{
                  marginTop: 12,
                  paddingLeft: 20,
                  color: palette.textSecondary,
                  fontSize: 14,
                }}
              >
                {level.hints.medium.map((h, idx) => (
                  <li key={idx} style={{ marginTop: 6 }}>
                    {h}
                  </li>
                ))}
              </ol>
            </details>
            <details
              style={{
                border: `2px solid ${palette.warning}`,
                borderRadius: 8,
                padding: 12,
                background: palette.panel,
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  color: palette.warning,
                  fontSize: 14,
                }}
              >
                ⚠️ Solution — Line by Line (last resort!)
              </summary>
              <pre
                style={{
                  marginTop: 12,
                  padding: 16,
                  background: "#1e1e1e",
                  color: "#d4d4d4",
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.6,
                  overflowX: "auto",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {level.hints.easy.join("\n")}
              </pre>
            </details>
          </div>
          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="editor"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              Code Editor
            </label>
            <textarea
              id="editor"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: "100%",
                height: 340,
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: 14,
                padding: 16,
                borderRadius: 8,
                border: `2px solid ${palette.border}`,
                background: "#1e1e1e",
                color: "#d4d4d4",
                lineHeight: 1.6,
                resize: "vertical",
              }}
            />
            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
              }}
            >
              <button
                onClick={runTests}
                disabled={running}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "none",
                  background: palette.gradient,
                  color: "white",
                  boxShadow: "0 2px 8px rgba(30, 64, 175, 0.3)",
                }}
              >
                {running ? "⏳ Running…" : "▶️ Run Tests"}
              </button>
              <button
                onClick={() => setCode(level.starterCode)}
                disabled={running}
                style={{
                  padding: "10px 20px",
                  fontSize: 14,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: `1px solid ${palette.border}`,
                  background: palette.panel,
                  color: palette.textSecondary,
                }}
              >
                🔄 Reset
              </button>
              {passed && (
                <span
                  style={{
                    alignSelf: "center",
                    color: palette.success,
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  ✅ All tests passed!
                </span>
              )}
              {passed && levelIndex < LEVELS.length - 1 && (
                <button
                  onClick={() => setLevelIndex(levelIndex + 1)}
                  style={{
                    marginLeft: "auto",
                    padding: "10px 20px",
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    border: "none",
                    background: palette.success,
                    color: "white",
                  }}
                >
                  Next Level →
                </button>
              )}
            </div>
          </div>
        </section>

        <section
          style={{
            background: palette.panel,
            border: `1px solid ${palette.border}`,
            borderRadius: 12,
            padding: 24,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          }}
        >
          <h3 style={{ fontSize: 20, marginBottom: 16, color: palette.textPrimary }}>
            Test Results
          </h3>
          {!results && (
            <p style={{ color: palette.textMuted, fontSize: 14 }}>
              Run tests to see results.
            </p>
          )}
          {results && (
            <>
              {results.some((r) => !r.pass) && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: `1px solid #fecaca`,
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <strong style={{ color: palette.danger }}>
                    ❌ Some tests failed
                  </strong>
                  <ul style={{ marginTop: 8, marginBottom: 0 }}>
                    {results
                      .filter((r) => !r.pass)
                      .map((r, i) => (
                        <li key={i} style={{ color: palette.danger, marginTop: 4 }}>
                          Test {results.indexOf(r) + 1}: expected{" "}
                          {formatVal(r.expected)}, got {formatVal(r.actual)}
                          {r.error && (
                            <div style={{ fontSize: 12, marginTop: 4 }}>
                              Error: {r.error}
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {results.every((r) => r.pass) && (
                <div
                  style={{
                    background: "#d1fae5",
                    border: `1px solid #6ee7b7`,
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 16,
                  }}
                >
                  <strong style={{ color: palette.success }}>
                    ✅ All tests passed!
                  </strong>
                </div>
              )}

              <details style={{ marginTop: 12 }}>
                <summary
                  style={{ cursor: "pointer", color: palette.textSecondary, fontSize: 14 }}
                >
                  Show all test results ({results.filter((r) => r.pass).length}/
                  {results.length} passed)
                </summary>
                <ul style={{ marginTop: 8 }}>
                  {results.map((r, i) => (
                    <li
                      key={i}
                      style={{
                        color: r.pass ? palette.success : palette.danger,
                        marginTop: 4,
                      }}
                    >
                      {r.pass ? "✅" : "❌"} Test {i + 1}: expected{" "}
                      {formatVal(r.expected)}, got {formatVal(r.actual)}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
          <h4 style={{ marginTop: 16, color: palette.textPrimary }}>Test Cases</h4>
          <ul style={{ fontSize: 14 }}>
            {level.tests.map((t, i) => (
              <li key={i} style={{ marginTop: 4, color: palette.textSecondary }}>
                <code
                  style={{
                    background: palette.neutral,
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                >
                  {t.code}
                </code>
                {" → "}
                <code
                  style={{
                    background: palette.neutral,
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                >
                  {formatVal(t.expected)}
                </code>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

function formatVal(v: any) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export default App;
