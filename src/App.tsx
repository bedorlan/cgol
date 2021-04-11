import { Fragment, useEffect, useState } from 'react'

export default function App() {
  return <Game />
}

const gliderRle = `
x = 24, y = 47, rule = B3/S23
10bo$9b2o3bo$8b2ob3obo$10bo2b3o$10bob3o$13b2o$12b2o$12bo$10bo$10bo3bo$
8b4o3bo$7bo4b2o2bo$7b2obo5bo$10b2o2b3o$10b2o$7b2o2b5o$5b2ob4o3bob2o$6b
4obo3b4o$10b2o5b3o$10bo4bo$10bo$10b2obobo$10b2o$10b2o3bo$11bo$4bo14bo$
3b2ob2o8b2ob2o$4bo3bo6bo3bo$3bo2bob8obo2bo$3bob2o3bo2bo3b2obo$6bobo6bo
bo$3bo3b2o6b2o3bo$2bo18bo$b3o5bo4bo5b3o$bobobo3bo4bo3bobobo$b2o5bo6bo
5b2o$obo18bobo$3bo16bo$3bo16bo$3bo16bo$bo2bo14bo2bo$2b3o14b3o$4bo14bo
2$4b2o12b2o2$4b3o10b3o!
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
  const alive = '='
  const grid = props.grid

  let stringGrid = ''
  for (let j = 0; j < grid.length; ++j) {
    for (let i = 0; i < grid.width; ++i) {
      stringGrid += grid.get(i, j) ? alive : dead
    }
    stringGrid += '\n'
  }

  return (
    <pre style={{ fontFamily: 'Cousine', fontSize: '5px', lineHeight: '0.75em' }}>
      <Fragment key={new Date().getTime()}>{stringGrid}</Fragment>
    </pre>
  )
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
    if (i < 0 || i >= this.width || j < 0 || j >= this.length) return 0
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
    let i = 0
    let j = 0
    const strBody = body.join('').replace('!', '')
    const extractSection = /(\d*)([bo$])/g
    for (const section of strBody.matchAll(extractSection)) {
      const tag = section[2]
      let count = Number(section[1]) || 1
      if (tag === '$') {
        j += count
        i = 0
      } else {
        const state = tag === 'o' ? 1 : 0
        while (count-- > 0) result[pos(x, i++, j)] = state
      }
    }

    const grid = new Grid(x, y)
    grid.cells = result
    return grid
  }
}

function pos(width: number, i: number, j: number) {
  return width * j + i
}
