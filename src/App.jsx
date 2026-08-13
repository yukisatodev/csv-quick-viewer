import { useState, useMemo, useCallback, useRef } from 'react'
import Papa from 'papaparse'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

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

function inferType(values) {
  const sample = values.filter((v) => v !== '' && v != null).slice(0, 30)
  if (sample.length === 0) return 'empty'
  const allNum = sample.every((v) => v !== '' && !isNaN(Number(v)))
  if (allNum) return 'number'
  const allDate = sample.every((v) => !isNaN(Date.parse(v)))
  if (allDate) return 'date'
  return 'text'
}

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
  const inputRef = useRef(null)

  const parseFile = useCallback((file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('CSVファイル(.csv)を指定してください')
      return
    }
    setError(null)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const cols = result.meta.fields || []
        setColumns(cols)
        setRows(result.data)
        setFileName(file.name)
        setFileSize(file.size)
        setSortKey(null)
        setQuery('')
      },
      error: (err) => setError(err.message),
    })
  }, [])

  const loadSample = useCallback(() => {
    setError(null)
    const result = Papa.parse(SAMPLE_CSV, { header: true, skipEmptyLines: true })
    const cols = result.meta.fields || []
    setColumns(cols)
    setRows(result.data)
    setFileName('sample-products.csv')
    setFileSize(new Blob([SAMPLE_CSV]).size)
    setSortKey(null)
    setQuery('')
  }, [])

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

  const reset = () => {
    setFileName(null)
    setFileSize(0)
    setColumns([])
    setRows([])
    setSortKey(null)
    setQuery('')
    setError(null)
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
      </header>

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
            <button className="btn btn--ghost" onClick={reset}>
              別のファイルを開く
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {columns.map((col) => (
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
                    {columns.map((col) => {
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
