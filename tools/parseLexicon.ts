import fs = require('fs')

const lexicon = fs.readFileSync(0, 'utf-8')
const [head, patterns, end] = lexicon.split('-'.repeat(71))
const extractPattern = /:([^\n]*?):(.*?(?=(?:\n:|\t|\s*$)))((\t[^\s]*\n)*)/gs
const result = []
for (const pattern of patterns.matchAll(extractPattern)) {
  const [, name, desc, grid] = pattern
  const parsedGrid = grid
    .split('\n')
    .map(g => g.trim().replace(/[^.]/g, '1').replace(/[.]/g, '0'))
    .filter(Boolean)
  result.push({ name, desc, grid: parsedGrid })
}
console.log(JSON.stringify(result, null, 2))
