import { describe, it, expect } from 'vitest'
import { formatBytes, inferType, computeColumnStats } from './utils'

describe('formatBytes', () => {
  it('formats bytes under 1KB', () => {
    expect(formatBytes(512)).toBe('512 B')
  })
  it('formats KB range', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })
  it('formats MB range', () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('inferType', () => {
  it('detects number columns', () => {
    expect(inferType(['1', '2', '3.5'])).toBe('number')
  })
  it('detects date columns', () => {
    expect(inferType(['2025-01-01', '2025-02-01'])).toBe('date')
  })
  it('detects text columns', () => {
    expect(inferType(['apple', 'banana'])).toBe('text')
  })
  it('detects empty columns', () => {
    expect(inferType(['', '', ''])).toBe('empty')
  })
})

describe('computeColumnStats', () => {
  const rows = [
    { price: '100', name: 'a' },
    { price: '300', name: 'b' },
    { price: '', name: 'a' },
  ]
  const columns = ['price', 'name']
  const columnTypes = { price: 'number', name: 'text' }

  it('computes min/max/avg/missing for number columns', () => {
    const stats = computeColumnStats(rows, columns, columnTypes)
    expect(stats.price.min).toBe(100)
    expect(stats.price.max).toBe(300)
    expect(stats.price.avg).toBe(200)
    expect(stats.price.missing).toBe(1)
  })

  it('computes uniqueCount/missing for text columns', () => {
    const stats = computeColumnStats(rows, columns, columnTypes)
    expect(stats.name.uniqueCount).toBe(2)
    expect(stats.name.missing).toBe(0)
  })
})
