import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import Papa from 'papaparse'
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts'
import { formatBytes, todayStr, inferType, computeColumnStats } from './utils'

const SAMPLE_CSV = `商品名,カテゴリ,価格,在庫数,発売日,評価
ワイヤレスイヤホン,オーディオ,8900,42,2025-03-12,4.3
モバイルバッテリー,アクセサリ,3200,0,2024-11-05,4.1
スマートウォッチ,ウェアラブル,15800,17,2026-01-20,4.6
Bluetoothスピーカー,オーディオ,6400,,2025-07-01,3.9
USB-Cケーブル,アクセサリ,980,120,2024-06-18,4.0
折りたたみキーボード,PC周辺機器,5200,8,2025-09-30,4.2
ノートPCスタンド,PC周辺機器,2800,,2025-02-14,4.4
ポータブル加湿器,生活家電,4100,25,2025-12-01,3.7
LEDデスクライト,生活家電,3600,3,2024-08-22,4.5
ゲーミングマウス,PC周辺機器,7200,60,2026-02-10,4.7`

export default function App() {
  const [fileName, setFileName] = useState(null)
  const [fileSize, setFileSize] = useState(0)
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [query, setQuery] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [hiddenColumns, setHiddenColumns] = useState(() => new Set())
  const [showColumnPanel, setShowColumnPanel] = useState(false)
  const [theme, setTheme] = useState('light')
  const [chartColumn, setChartColumn] = useState(null)
  const [showStats, setShowStats] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const loadParsedData = useCallback((parsed, name, size) => {
    const cols = parsed.meta.fields || []
    setColumns(cols)
    setRows(parsed.data)
    setFileName(name)
    setFileSize(size)
    setSortKey(null)
    setQuery('')
    setHiddenColumns(new Set())
    setChartColumn(null)
    setError(null)
  }, [])

  const parseFile = useCallback(
    (file) => {
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('CSVファイル(.csv)を指定してください')
        return
      }
      setError(null)
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => loadParsedData(result, file.name, file.size),
        error: (err) => setError(err.message),
      })
    },
    [loadParsedData],
  )

  const loadSample = useCallback(() => {
    const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true })
    loadParsedData(result, 'sample-products.csv', new Blob([SAMPLE_CSV]).size)
  }, [loadParsedData])

  const loadFromUrl = useCallback(async () => {
    if (!urlInput.trim()) return
    setUrlLoading(true)
    setError(null)
    try {
      const res = await fetch(urlInput.trim())
      if (!res.ok) throw new Error(`取得に失敗しました (HTTP ${res.status})`)
      const text = await res.text()
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      const name = urlInput.trim().split('/').pop() || 'remote.csv'
      loadParsedData(result, name, new Blob([text]).size)
    } catch (err) {
      setError(
        `URLからの読み込みに失敗しました: ${err.message}(相手サーバーがCORSを許可していない場合、ブラウザからは読み込めません)`,
      )
    } finally {
      setUrlLoading(false)
    }
  }, [urlInput, loadParsedData])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      parseFile(file)
    },
    [parseFile],
  )

  const columnTypes = useMemo(() => {
    const types = {}
    for (const col of columns) {
      types[col] = inferType(rows.map((r) => r[col]))
    }
    return types
  }, [columns, rows])

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenColumns.has(c)),
    [columns, hiddenColumns],
  )

  const numericColumns = useMemo(
    () => columns.filter((c) => columnTypes[c] === 'number'),
    [columns, columnTypes],
  )

  const filteredRows = useMemo(() => {
    if (!query.trim()) return rows
    const q = query.trim().toLowerCase()
    return rows.filter((row) =>
      columns.some((col) => String(row[col] ?? '').toLowerCase().includes(q)),
    )
  }, [rows, columns, query])

  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows
    const type = columnTypes[sortKey]
    const copy = [...filteredRows]
    copy.sort((a, b) => {
      let av = a[sortKey]
      let bv = b[sortKey]
      if (type === 'number') {
        av = Number(av)
        bv = Number(bv)
      } else if (type === 'date') {
        av = Date.parse(av)
        bv = Date.parse(bv)
      } else {
        av = String(av ?? '')
        bv = String(bv ?? '')
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return copy
  }, [filteredRows, sortKey, sortDir, columnTypes])

  const columnStats = useMemo(
    () => computeColumnStats(filteredRows, columns, columnTypes),
    [filteredRows, columns, columnTypes],
  )

  const chartData = useMemo(() => {
    if (!chartColumn) return []
    const labelCol = columns[0]
    return sortedRows.slice(0, 50).map((row, i) => ({
      name: String(row[labelCol] ?? `#${i + 1}`).slice(0, 12),
      value: Number(row[chartColumn]) || 0,
    }))
  }, [sortedRows, chartColumn, columns])

  const toggleSort = (col) => {
    if (sortKey !== col) {
      setSortKey(col)
      setSortDir('asc')
    } else if (sortDir === 'asc') {
      setSortDir('desc')
    } else {
      setSortKey(null)
      setSortDir('asc')
    }
  }

  const toggleColumn = (col) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      if (next.has(col)) next.delete(col)
      else next.add(col)
      return next
    })
  }

  const reset = () => {
    setFileName(null)
    setFileSize(0)
    setColumns([])
    setRows([])
    setSortKey(null)
    setQuery('')
    setError(null)
    setHiddenColumns(new Set())
    setChartColumn(null)
    setUrlInput('')
  }

  const emptyCount = useMemo(() => {
    let count = 0
    for (const row of rows) {
      for (const col of columns) {
        if (row[col] === '' || row[col] == null) count++
      }
    }
    return count
  }, [rows, columns])

  const exportCsv = () => {
    const data = sortedRows.map((row) => {
      const out = {}
      for (const col of visibleColumns) out[col] = row[col]
      return out
    })
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `filtered-${fileName || 'export.csv'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="sheet">
      <header className="titleblock">
        <div className="titleblock__left">
          <span className="titleblock__mark">⌗</span>
          <div>
            <h1 className="titleblock__title">CSV Quick Viewer</h1>
            <p className="titleblock__subtitle">ドラッグ＆ドロップで即座に表示・並べ替え</p>
          </div>
        </div>
        <div className="titleblock__meta">
          <div className="titleblock__field">
            <span className="titleblock__label">FILE</span>
            <span className="titleblock__value">{fileName ?? '—'}</span>
          </div>
          <div className="titleblock__field">
            <span className="titleblock__label">SIZE</span>
            <span className="titleblock__value">{fileName ? formatBytes(fileSize) : '—'}</span>
          </div>
          <div className="titleblock__field">
            <span className="titleblock__label">ROWS × COLS</span>
            <span className="titleblock__value">
              {fileName ? `${rows.length} × ${columns.length}` : '—'}
            </span>
          </div>
          <div className="titleblock__field">
            <span className="titleblock__label">DATE</span>
            <span className="titleblock__value">{todayStr()}</span>
          </div>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          aria-label="ダークモード切替"
          title="ダークモード切替"
        >
          {theme === 'light' ? '☾' : '☀'}
        </button>
      </header>

      <section className="about">
        <button className="about__toggle" onClick={() => setShowAbout((v) => !v)}>
          <span>このツールについて</span>
          <span>{showAbout ? '▲' : '▼'}</span>
        </button>
        {showAbout && (
          <div className="about__body">
            <p>
              手元のCSVファイルの中身を、環境構築なしでその場で確認するための軽量ツールです。
              「とりあえず開いて中身を見たいだけなのに、Excelを立ち上げるのは大げさ」という場面を想定して作りました。
            </p>
            <p>
              フリーランスでWebエンジニアを目指す中でのポートフォリオの一つで、
              次に予定しているCSVデータチェックツール(Pythonバックエンド版)の前段階として、
              まずはフロントエンドのみで完結する形で作っています。
            </p>
            <p>
              ファイルはすべてブラウザ内で処理され、サーバーには一切送信されません。
              業務で受け取ったCSVの中身を人に見せる前にざっと確認する、といった用途を想定しています。
            </p>
          </div>
        )}
      </section>

      {!fileName && (
        <div
          className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="dropzone__grid" aria-hidden="true" />
          <div className="dropzone__content">
            <span className="dropzone__icon">▦</span>
            <p className="dropzone__text">CSVファイルをここにドロップ</p>
            <p className="dropzone__subtext">またはクリックして選択</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => parseFile(e.target.files?.[0])}
          />
        </div>
      )}

      {!fileName && (
        <div className="sample-cta">
          <span>手元にCSVがない場合は</span>
          <button
            className="btn btn--accent"
            onClick={(e) => {
              e.stopPropagation()
              loadSample()
            }}
          >
            サンプルデータを試す
          </button>
        </div>
      )}

      {!fileName && (
        <div className="url-loader">
          <input
            type="text"
            placeholder="公開URLのCSVを読み込む(例: https://example.com/data.csv)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
          />
          <button className="btn btn--ghost" onClick={loadFromUrl} disabled={urlLoading}>
            {urlLoading ? '読み込み中…' : 'URLから読み込む'}
          </button>
        </div>
      )}

      {error && <div className="error">⚠ {error}</div>}

      {fileName && (
        <>
          <div className="toolbar">
            <div className="search">
              <span className="search__icon">⌕</span>
              <input
                type="text"
                placeholder="全列を検索…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="toolbar__stats">
              <span>該当 {sortedRows.length} 行</span>
              <span className="toolbar__divider">/</span>
              <span>空セル {emptyCount}</span>
            </div>
            <div className="toolbar__actions">
              <div className="dropdown">
                <button className="btn btn--ghost" onClick={() => setShowColumnPanel((v) => !v)}>
                  列の表示 ▾
                </button>
                {showColumnPanel && (
                  <div className="dropdown__panel">
                    {columns.map((col) => (
                      <label key={col} className="dropdown__item">
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.has(col)}
                          onChange={() => toggleColumn(col)}
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn--ghost" onClick={() => setShowStats((v) => !v)}>
                {showStats ? '統計を隠す' : '統計を表示'}
              </button>
              <button className="btn btn--accent" onClick={exportCsv}>
                CSVをダウンロード
              </button>
              <button className="btn btn--ghost" onClick={reset}>
                別のファイルを開く
              </button>
            </div>
          </div>

          {showStats && (
            <div className="stats-panel">
              {visibleColumns.map((col) => {
                const s = columnStats[col]
                if (!s) return null
                return (
                  <div key={col} className="stats-card">
                    <div className="stats-card__title">{col}</div>
                    <div className="stats-card__type">{s.type}</div>
                    {s.type === 'number' && (
                      <div className="stats-card__body">
                        <span>min {s.min ?? '—'}</span>
                        <span>max {s.max ?? '—'}</span>
                        <span>avg {s.avg ?? '—'}</span>
                      </div>
                    )}
                    {s.type === 'date' && (
                      <div className="stats-card__body">
                        <span>from {s.min ?? '—'}</span>
                        <span>to {s.max ?? '—'}</span>
                      </div>
                    )}
                    {s.type === 'text' && (
                      <div className="stats-card__body">
                        <span>ユニーク値 {s.uniqueCount}</span>
                      </div>
                    )}
                    <div className="stats-card__missing">欠損 {s.missing}</div>
                  </div>
                )
              })}
            </div>
          )}

          {numericColumns.length > 0 && (
            <div className="chart-panel">
              <div className="chart-panel__header">
                <span>グラフ表示(先頭50行)</span>
                <select
                  value={chartColumn ?? ''}
                  onChange={(e) => setChartColumn(e.target.value || null)}
                >
                  <option value="">列を選択…</option>
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
              {chartColumn && (
                <div className="chart-panel__chart">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-line)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="var(--accent)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {visibleColumns.map((col) => (
                    <th key={col} onClick={() => toggleSort(col)}>
                      <span className="th__label">{col}</span>
                      <span className="th__type">{columnTypes[col]}</span>
                      <span className="th__sort">
                        {sortKey === col ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr key={i}>
                    {visibleColumns.map((col) => {
                      const val = row[col]
                      const isEmpty = val === '' || val == null
                      return (
                        <td key={col} className={isEmpty ? 'cell--empty' : ''}>
                          {isEmpty ? '·' : val}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <footer className="footer">
        <span>すべての処理はブラウザ内で完結します。ファイルはサーバーに送信されません。</span>
      </footer>
    </div>
  )
}
