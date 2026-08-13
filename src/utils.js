export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function todayStr() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function inferType(values) {
  const sample = values.filter((v) => v !== '' && v != null).slice(0, 30)
  if (sample.length === 0) return 'empty'
  const allNum = sample.every((v) => v !== '' && !isNaN(Number(v)))
  if (allNum) return 'number'
  const allDate = sample.every((v) => !isNaN(Date.parse(v)))
  if (allDate) return 'date'
  return 'text'
}

/**
 * 列ごとの要約統計を計算する。
 * number: min / max / avg / missing
 * date:   min / max / missing
 * text:   uniqueCount / missing
 * empty:  missing のみ
 */
export function computeColumnStats(rows, columns, columnTypes) {
  const stats = {}
  for (const col of columns) {
    const type = columnTypes[col]
    const values = rows.map((r) => r[col])
    const missing = values.filter((v) => v === '' || v == null).length
    if (type === 'number') {
      const nums = values.filter((v) => v !== '' && v != null).map(Number)
      const min = nums.length ? Math.min(...nums) : null
      const max = nums.length ? Math.max(...nums) : null
      const avg = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
      stats[col] = { type, missing, min, max, avg: avg != null ? Math.round(avg * 100) / 100 : null }
    } else if (type === 'date') {
      const times = values
        .filter((v) => v !== '' && v != null && !isNaN(Date.parse(v)))
        .map((v) => Date.parse(v))
      const min = times.length ? new Date(Math.min(...times)).toISOString().slice(0, 10) : null
      const max = times.length ? new Date(Math.max(...times)).toISOString().slice(0, 10) : null
      stats[col] = { type, missing, min, max }
    } else if (type === 'text') {
      const unique = new Set(values.filter((v) => v !== '' && v != null))
      stats[col] = { type, missing, uniqueCount: unique.size }
    } else {
      stats[col] = { type, missing }
    }
  }
  return stats
}
