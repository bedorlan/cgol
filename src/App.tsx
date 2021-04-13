import { useEffect, useRef, useState } from 'react'

export default function App() {
  return <Game />
}

const hashSize = 5
let hash5: Uint32Array | null = null

interface ILexicon {
  name: string
  desc: string
  grid: string[]
}

function Game() {
  const cells = new Grid(200, 200)
  const [grid, setGrid] = useState(cells)
  const [loaded, setLoaded] = useState<boolean>(false)
  const [fps, setFps] = useState(0)
  const [, setFramesCount] = useState(0)
  const [lexiconFilter, setLexiconFilter] = useState('')
  const [lexicon, setLexicon] = useState<Array<ILexicon>>([])
  const [currentPattern, setCurrentPattern] = useState<ILexicon | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('hash5.buff')
        .then(res => res.arrayBuffer())
        .then(buff => (hash5 = new Uint32Array(buff))),

      fetch('lexicon.json')
        .then(res => res.json())
        .then((lex: ILexicon[]) => setLexicon(lex.filter(lex => lex.grid.length))),
    ]).then(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    setInterval(() => {
      setGrid(g => g.tick2())
      setFramesCount(c => c + 1)
    }, 1000 / 30)
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
    <div style={{ display: 'flex', flexDirection: 'column' }} onMouseUp={e => setCurrentPattern(null)}>
      <div>FPS={fps}</div>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', height: '600px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: '25em' }}>
          <input
            className="form-control"
            style={{ margin: '5px', width: '24em' }}
            placeholder="Filter here"
            value={lexiconFilter}
            onChange={e => setLexiconFilter(e.target.value)}
          />
          <div className="list-group" style={{ height: '30em', overflow: 'scroll' }}>
            {lexicon
              .filter(lex => lex.name.toLowerCase().startsWith(lexiconFilter.toLowerCase()))
              .map(lex => (
                <button
                  type="button"
                  className="list-group-item list-group-item-action"
                  style={{ cursor: 'move' }}
                  key={lex.name}
                  onMouseDown={e => setCurrentPattern(lex)}
                >
                  {lex.name}
                </button>
              ))}
          </div>
        </div>
        <GridViewer
          grid={grid}
          onMouseUp={c => {
            if (!currentPattern) return
            const newGrid = Grid.fromLexicon(currentPattern.grid)
            setGrid(g => g.copyFrom(newGrid, c.x, c.y))
            setCurrentPattern(null)
          }}
        />
      </div>
    </div>
  )
}

interface IGridViewerProps {
  grid: Grid
  onMouseUp?: (coor: { x: number; y: number }) => void
}
function GridViewer(props: IGridViewerProps) {
  const cellSize = 3
  const grid = props.grid
  const refCanvas = useRef<HTMLCanvasElement>(null)

  useEffect(
    function draw() {
      const context = refCanvas.current!.getContext('2d')!
      context.fillStyle = '#0a1243'
      context.fillRect(0, 0, context.canvas.width, context.canvas.height)

      context.fillStyle = '#ffffff'
      for (let j = 0; j < grid.length; ++j) {
        for (let i = 0; i < grid.width; ++i) {
          if (grid.get(i, j) > 0) context.fillRect(i * cellSize, j * cellSize, cellSize, cellSize)
        }
      }
    },
    [grid],
  )

  return (
    <canvas
      width={`${grid.width * cellSize}px`}
      height={`${grid.length * cellSize}px`}
      onMouseUp={e => {
        e.stopPropagation()
        props.onMouseUp?.({
          x: Math.floor(e.nativeEvent.offsetX / cellSize),
          y: Math.floor(e.nativeEvent.offsetY / cellSize),
        })
      }}
      ref={refCanvas}
    ></canvas>
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
        const y = hash5![x]
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

  static fromLexicon(gridText: ILexicon['grid']) {
    const width = gridText[0].length
    const length = gridText.length
    const grid = new Grid(width, length)
    for (let j = 0; j < length; ++j) {
      for (let i = 0; i < width; ++i) {
        grid.cells[pos(width, i, j)] = gridText[j].charAt(i) === '1' ? 1 : 0
      }
    }
    return grid
  }
}

function pos(width: number, i: number, j: number) {
  return width * j + i
}
