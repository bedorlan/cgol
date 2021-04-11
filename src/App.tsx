import _ from 'lodash'
import { useEffect, useState } from 'react'

export default function App() {
  return <Game />
}

const gliderRle = `
#C This is a glider.
#C another comment
x = 3, y = 3
bo$2bo$3o!
`

function Game() {
  const cells = new Grid(100, 100)
  const [grid, setGrid] = useState(cells)

  useEffect(() => {
    const glider = Grid.fromRle(gliderRle)
    if (glider) setGrid(g => g.copyFrom(glider, 0, 0))
  }, [])

  useEffect(() => {
    setInterval(() => {
      setGrid(g => g.tick())
    }, 1)
  }, [])

  return <GridViewer grid={grid} />
}

interface IGridViewerProps {
  grid: Grid
}
function GridViewer(props: IGridViewerProps) {
  const grid = props.grid
  return (
    <table>
      <tbody>
        {_.times(grid.length, j => (
          <tr key={j}>
            {_.times(grid.width, i => {
              const key = pos(grid.width, i, j)
              return <td key={key}>{grid.get(i, j) ? 'o' : '-'}</td>
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

class Grid {
  width: number
  length: number
  cells: boolean[]

  constructor(x: number, y: number) {
    this.width = x
    this.length = y
    this.cells = Array(x * y).fill(false)
  }

  get(i: number, j: number) {
    return this.cells[pos(this.width, i, j)]
  }

  getSafe(i: number, j: number) {
    return this.get(i, j) || false
  }

  set(i: number, j: number, value: boolean) {
    this.cells[pos(this.width, i, j)] = value
  }

  tick() {
    const copy = new Grid(this.width, this.length)
    copy.cells = this.cells.slice()
    for (let j = 0; j < this.length; ++j) {
      for (let i = 0; i < this.width; ++i) {
        const neighbors =
          Number(this.getSafe(i - 1, j - 1)) +
          Number(this.getSafe(i + 0, j - 1)) +
          Number(this.getSafe(i + 1, j - 1)) +
          Number(this.getSafe(i - 1, j + 0)) +
          Number(this.getSafe(i + 1, j + 0)) +
          Number(this.getSafe(i - 1, j + 1)) +
          Number(this.getSafe(i + 0, j + 1)) +
          Number(this.getSafe(i + 1, j + 1)) +
          0

        if (neighbors < 2 || neighbors > 3) copy.set(i, j, false)
        else if (neighbors === 3) copy.set(i, j, true)
      }
    }
    return copy
  }

  copyFrom(other: Grid, x: number, y: number) {
    const copy = new Grid(this.width, this.length)
    copy.cells = this.cells.slice()
    for (let j = 0; j < other.length; ++j) {
      if (j + y >= this.length) break
      for (let i = 0; i < other.width; ++i) {
        if (i + x >= this.width) break
        copy.set(i + x, j + y, other.get(i, j))
      }
    }
    return copy
  }

  static fromRle(rle: string): Grid | null {
    const [header, ...body] = rle.replace(/#.*/g, '').trim().split('\n')

    const extractXY = /x\s*=\s*(\d+)\s*,\s*y\s*=\s*(\d+)/
    const headerMatch = header.match(extractXY)
    if (!headerMatch) return null
    const [, x, y] = headerMatch.map(Number)

    const result = Array(x * y).fill(false)
    body
      .join()
      .replace('!', '')
      .split('$')
      .forEach((row, j) => {
        const extractSection = /(\d*)([bo])/g
        let i = 0
        for (const section of row.matchAll(extractSection)) {
          let count = Number(section[1]) || 1
          const state = section[2] === 'o'
          while (count-- > 0) {
            result[pos(x, i, j)] = state
            ++i
          }
        }
      })

    const grid = new Grid(x, y)
    grid.cells = result
    return grid
  }
}

function pos(width: number, i: number, j: number) {
  return width * j + i
}
