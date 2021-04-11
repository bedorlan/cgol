const fs = require('fs')

const hashSize = 5

buildHash()

function buildHash() {
  const hashLength = 2 ** (hashSize ** 2)
  const hash = new Uint32Array(hashLength)
  for (let x = 0; x < hashLength; ++x) {
    let y = x
    for (let j = 0; j < hashSize; ++j) {
      for (let i = 0; i < hashSize; ++i) {
        const a0 = get(x, i - 1, j - 1)
        const a1 = get(x, i + 0, j - 1)
        const a2 = get(x, i + 1, j - 1)
        const a3 = get(x, i - 1, j + 0)
        const a4 = get(x, i + 0, j + 0)
        const a5 = get(x, i + 1, j + 0)
        const a6 = get(x, i - 1, j + 1)
        const a7 = get(x, i + 0, j + 1)
        const a8 = get(x, i + 1, j + 1)
        const neighbors = a0 + a1 + a2 + a3 + a5 + a6 + a7 + a8
        if (a4 === 1 && (neighbors < 2 || neighbors > 3)) y = set(y, i, j, 0)
        else if (a4 === 0 && neighbors === 3) y = set(y, i, j, 1)
      }
    }
    hash[x] = y
  }

  fs.writeFileSync(`hash${hashSize}.buff`, Buffer.from(hash.buffer))
}

function get(g: number, i: number, j: number) {
  if (i < 0 || i >= hashSize || j < 0 || j >= hashSize) return 0
  const offset = j * hashSize + i
  return (g & (1 << offset)) >>> offset
}

function set(g: number, i: number, j: number, value: number) {
  const offset = j * hashSize + i
  return (g & ~(1 << offset)) | (value << offset)
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
