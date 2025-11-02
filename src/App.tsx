import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import level1 from './levels/linear-search/level1.json'

type TestCase = { code: string; expected: any }
type Level = {
  id: string
  order: number
  title: string
  description: string
  exportName: string
  starterCode: string
  tests: TestCase[]
  hints: string[]
}

const LEVELS: Level[] = [level1 as unknown as Level]

function useLocalStorage(key: string, initial: string) {
  const [value, setValue] = useState<string>(() => {
    const v = localStorage.getItem(key)
    return v !== null ? v : initial
  })
  useEffect(() => {
    localStorage.setItem(key, value)
  }, [key, value])
  return [value, setValue] as const
}

function App() {
  const [levelIndex, setLevelIndex] = useState(0)
  const level = LEVELS[levelIndex]
  const codeKey = `code:${level.id}`
  const [code, setCode] = useLocalStorage(codeKey, level.starterCode)
  const [results, setResults] = useState<{ pass: boolean; actual: any; expected: any; error?: string }[] | null>(null)
  const [running, setRunning] = useState(false)
  const [passed, setPassed] = useState<boolean>(() => localStorage.getItem(`passed:${level.id}`) === 'true')
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    // When switching levels, refresh code/results state
    const k = `code:${LEVELS[levelIndex].id}`
    const saved = localStorage.getItem(k)
    setCode(saved ?? LEVELS[levelIndex].starterCode)
    setResults(null)
    setPassed(localStorage.getItem(`passed:${LEVELS[levelIndex].id}`) === 'true')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelIndex])

  const runTests = async () => {
    if (running) return
    setRunning(true)
    setResults(null)

    // Create worker per run to allow termination on timeout
    const w = new Worker(new URL('./worker/testRunner.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    const TIMEOUT_MS = 4000

    const outcome: Promise<any> = new Promise((resolve) => {
      const timer = setTimeout(() => {
        try { w.terminate() } catch {}
        resolve({ timeout: true })
      }, TIMEOUT_MS)
      w.onmessage = (ev) => {
        clearTimeout(timer)
        resolve(ev.data)
      }
    })

    w.postMessage({ code, tests: level.tests, exportName: level.exportName })
    const data = await outcome
    setRunning(false)

    if (data?.timeout) {
      setResults([{ pass: false, actual: undefined, expected: 'result within time', error: 'Timed out (possible infinite loop)' }])
      return
    }
    if (data?.fatal) {
      setResults([{ pass: false, actual: undefined, expected: 'no fatal error', error: String(data.fatal) }])
      return
    }
    const results = (data?.results ?? []) as { pass: boolean; actual: any; expected: any; error?: string }[]
    setResults(results)
    const allPass = results.length > 0 && results.every(r => r.pass)
    setPassed(allPass)
    if (allPass) localStorage.setItem(`passed:${level.id}`, 'true')
  }

  const progress = useMemo(() => {
    const total = LEVELS.length
    const done = LEVELS.filter(l => localStorage.getItem(`passed:${l.id}`) === 'true').length
    return { done, total }
  }, [level.id, passed])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 260, borderRight: '1px solid #eee', padding: 16 }}>
        <h2>Easy Learn</h2>
        <div style={{ fontSize: 12, color: '#666' }}>Progress: {progress.done}/{progress.total}</div>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {LEVELS.map((lvl, i) => {
            const ok = localStorage.getItem(`passed:${lvl.id}`) === 'true'
            return (
              <li key={lvl.id} style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setLevelIndex(i)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '8px 10px',
                    background: i === levelIndex ? '#eef6ff' : '#fafafa',
                    border: '1px solid #ddd',
                    borderRadius: 6,
                    cursor: 'pointer'
                  }}
                >
                  {ok ? '✅' : '⬜'} {lvl.order}. {lvl.title}
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <main style={{ flex: 1, padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3>{level.title}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{level.description}</p>
          <details>
            <summary>Hints</summary>
            <ol>
              {level.hints.map((h, idx) => (
                <li key={idx}>{h}</li>
              ))}
            </ol>
          </details>
          <div style={{ marginTop: 12 }}>
            <label htmlFor="editor" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Editor</label>
            <textarea
              id="editor"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ width: '100%', height: 320, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 14, padding: 12, borderRadius: 6, border: '1px solid #ccc' }}
            />
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <button onClick={runTests} disabled={running}>
                {running ? 'Running…' : 'Run Tests'}
              </button>
              {passed && <span style={{ alignSelf: 'center', color: 'green' }}>All tests passed!</span>}
            </div>
          </div>
        </section>

        <section style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3>Results</h3>
          {!results && <p>Run tests to see results.</p>}
          {results && (
            <ul>
              {results.map((r, i) => (
                <li key={i}>
                  {r.pass ? '✅' : '❌'} Test {i + 1} — expected {formatVal(r.expected)}, got {formatVal(r.actual)}{r.error ? ` (error: ${r.error})` : ''}
                </li>
              ))}
            </ul>
          )}
          <h4 style={{ marginTop: 16 }}>Test Cases</h4>
          <ul>
            {level.tests.map((t, i) => (
              <li key={i}><code>{t.code}</code> → <code>{formatVal(t.expected)}</code></li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

function formatVal(v: any) {
  try { return typeof v === 'string' ? JSON.stringify(v) : JSON.stringify(v) } catch { return String(v) }
}

export default App
