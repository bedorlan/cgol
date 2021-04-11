import { useEffect, useState } from 'react'

export default function App() {
  return <Game />
}

const gliderRle = `
# You can save the pattern into this box with Settings/Pattern/Save or Ctrl-S.
x = 7, y = 3, rule = B3/S23
o3b3o$3o2bo$bo!
`

function Game() {
  const cells = new Grid(400, 400)
  const [grid, setGrid] = useState(cells)

  useEffect(() => {
    const glider = Grid.fromRle(gliderRle)
    if (glider) setGrid(g => g.copyFrom(glider, 200, 200))
  }, [])

  useEffect(() => {
    setInterval(() => {
      setGrid(g => {
        // let time = new Date().getTime()
        const newG = g.tick()
        // time = new Date().getTime() - time
        // console.log({ time })
        return newG
      })
    }, 20)
  }, [])

  return <GridViewer grid={grid} />
}

interface IGridViewerProps {
  grid: Grid
}
function GridViewer(props: IGridViewerProps) {
  const dead = ' '
  const alive = '0'
  const grid = props.grid

  let stringGrid = ''
  for (let j = 0; j < grid.length; ++j) {
    for (let i = 0; i < grid.width; ++i) {
      stringGrid += grid.get(i, j) ? alive : dead
    }
    stringGrid += '\n'
  }

  return <pre style={{ fontFamily: 'Cousine', fontSize: '5px', lineHeight: '0.75em' }}>{stringGrid}</pre>
}

class Grid {
  width: number
  length: number
  cells: Uint8Array

  constructor(x: number, y: number) {
    this.width = x
    this.length = y
    this.cells = new Uint8Array(x * y).fill(0)
  }

  get(i: number, j: number) {
    return this.cells[pos(this.width, i, j)]
  }

  getSafe(i: number, j: number) {
    return this.get(i, j) || 0
  }

  set(i: number, j: number, value: number) {
    this.cells[pos(this.width, i, j)] = value
  }

  tick() {
    const copy = new Grid(this.width, this.length)
    copy.cells = this.cells.slice()
    for (let j = 0; j < this.length; ++j) {
      for (let i = 0; i < this.width; ++i) {
        const neighbors =
          this.getSafe(i - 1, j - 1) +
          this.getSafe(i + 0, j - 1) +
          this.getSafe(i + 1, j - 1) +
          this.getSafe(i - 1, j + 0) +
          this.getSafe(i + 1, j + 0) +
          this.getSafe(i - 1, j + 1) +
          this.getSafe(i + 0, j + 1) +
          this.getSafe(i + 1, j + 1) +
          0

        if (neighbors < 2 || neighbors > 3) copy.set(i, j, 0)
        else if (neighbors === 3) copy.set(i, j, 1)
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

    const result = new Uint8Array(x * y).fill(0)
    body
      .join()
      .replace('!', '')
      .split('$')
      .forEach((row, j) => {
        const extractSection = /(\d*)([bo])/g
        let i = 0
        for (const section of row.matchAll(extractSection)) {
          let count = Number(section[1]) || 1
          const state = section[2] === 'o' ? 1 : 0
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
