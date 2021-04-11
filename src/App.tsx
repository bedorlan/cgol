import { Fragment, useEffect, useState } from 'react'

export default function App() {
  return <Game />
}

const gliderRle = `
#N Gosper glider gun
#C This was the first gun discovered.
#C As its name suggests, it was discovered by Bill Gosper.
x = 36, y = 9, rule = B3/S23
24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4b
obo$10bo5bo7bo$11bo3bo$12b2o!
`

const hashSize = 5

function get(g: number, i: number, j: number) {
  if (i < 0 || i >= hashSize || j < 0 || j >= hashSize) return 0
  const offset = j * hashSize + i
  return (g & (1 << offset)) >>> offset
}

function pretty(g: number) {
  let result = ''
  for (let j = 0; j < hashSize; ++j) {
    result += get(g, 0, j)
    result += get(g, 1, j)
    result += get(g, 2, j)
    result += get(g, 3, j)
    result += get(g, 4, j)
    result += '\n'
  }
  return result
}

let hash5: Uint32Array | null = null

function Game() {
  const cells = new Grid(400, 400)
  const [grid, setGrid] = useState(cells)
  const [loaded, setLoaded] = useState<boolean>(false)
  const [fps, setFps] = useState(1)
  const [, setFramesCount] = useState(0)

  useEffect(() => {
    const glider = Grid.fromRle(gliderRle)
    if (glider) setGrid(g => g.copyFrom(glider, 200, 200))
  }, [])

  useEffect(() => {
    fetch('hash5.buff')
      .then(res => res.arrayBuffer())
      .then(buff => {
        hash5 = new Uint32Array(buff)
        setLoaded(true)
      })
  }, [])

  useEffect(() => {
    if (!loaded) return
    setInterval(() => {
      setGrid(g => {
        const newG = g.tick2()
        setFramesCount(c => c + 1)
        return newG
      })
    }, 0)
  }, [loaded])

  useEffect(() => {
    setInterval(() => {
      setFramesCount(c => {
        setFps(c)
        return 0
      })
    }, 1000)
  }, [])

  return (
    <>
      FPS={fps}
      <br />
      <GridViewer grid={grid} />
    </>
  )
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
    <pre style={{ fontFamily: 'Cousine', fontSize: '5px', lineHeight: '0.75em' }} key="key">
      <Fragment key={new Date().getTime()}>{stringGrid}</Fragment>
    </pre>
  )
}

class Grid {
  width: number
  length: number
  cells: Uint32Array

  constructor(x: number, y: number) {
    this.width = x
    this.length = y
    this.cells = new Uint32Array(Math.ceil((x * y) / 32)).fill(0)
  }

  get(i: number, j: number) {
    const bit = j * this.width + i
    const box = bit >> 5 // Math.floor(bit / 32)
    const pos = bit & 31 // bit % 32
    return (this.cells[box] & (1 << pos)) >>> pos
  }

  getSafe(i: number, j: number) {
    if (i < 0 || i >= this.width || j < 0 || j >= this.length) return 0
    return this.get(i, j) || 0
  }

  set(i: number, j: number, value: number) {
    const bit = j * this.width + i
    const box = bit >> 5 // Math.floor(bit / 32)
    const pos = bit & 31 // bit % 32
    this.cells[box] = (this.cells[box] & ~(1 << pos)) | (value << pos)
  }

  tick() {
    const copy = new Grid(this.width, this.length)
    copy.cells = this.cells.slice()
    for (let j = 0; j < this.length; ++j) {
      for (let i = 0; i < this.width; ++i) {
        const a0 = this.getSafe(i - 1, j - 1)
        const a1 = this.getSafe(i + 0, j - 1)
        const a2 = this.getSafe(i + 1, j - 1)
        const a3 = this.getSafe(i - 1, j + 0)
        const a4 = this.getSafe(i + 0, j + 0)
        const a5 = this.getSafe(i + 1, j + 0)
        const a6 = this.getSafe(i - 1, j + 1)
        const a7 = this.getSafe(i + 0, j + 1)
        const a8 = this.getSafe(i + 1, j + 1)
        const neighbors = a0 + a1 + a2 + a3 + a5 + a6 + a7 + a8
        if (a4 === 1 && (neighbors < 2 || neighbors > 3)) copy.set(i, j, 0)
        else if (a4 === 0 && neighbors === 3) copy.set(i, j, 1)
      }
    }
    return copy
  }

  tick2() {
    const copy = new Grid(this.width, this.length)
    copy.cells = this.cells.slice()
    for (let j = -1; j < this.length; j += hashSize - 2) {
      for (let i = -1; i < this.width; i += hashSize - 2) {
        let x = 0
        for (let di = 0; di < hashSize; ++di) {
          for (let dj = 0; dj < hashSize; ++dj) {
            x |= this.getSafe(i + di, j + dj) << (dj * hashSize + di)
          }
        }
        const y = hash5?.[x] || 0
        for (let di = 1; di < hashSize - 1; ++di) {
          for (let dj = 1; dj < hashSize - 1; ++dj) {
            const offset = dj * hashSize + di
            const value = (y & (1 << offset)) >>> offset
            copy.set(i + di, j + dj, value)
          }
        }
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

    const grid = new Grid(x, y)
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
        while (count-- > 0) grid.set(i++, j, state)
      }
    }

    return grid
  }
}
