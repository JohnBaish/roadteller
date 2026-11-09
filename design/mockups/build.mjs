// Embeds the fonts and the figures into options.src.html.
// node build.mjs <fonts node_modules> <mock-data.json> <out folder>
import { readFileSync, writeFileSync } from 'node:fs'
const [nm, dataFile, out] = process.argv.slice(2)
const face = (fam, file, w) => `@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${readFileSync(`${nm}/@fontsource/${file}`).toString('base64')}) format("woff2");}`
const fonts = face('Caprasimo', 'caprasimo/files/caprasimo-latin-400-normal.woff2', 400) +
  [400, 600, 700].map(w => face('Figtree', `figtree/files/figtree-latin-${w}-normal.woff2`, w)).join('')
const data = readFileSync(dataFile, 'utf8').replace(/</g, '\\u003c')
const page = readFileSync(new URL('./options.src.html', import.meta.url), 'utf8').replace('/*FONTS*/', fonts).replace('/*DATA*/null', data)
writeFileSync(`${out}/riskreckoner-options.html`, page)
writeFileSync(`${out}/options.html`, `<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n${page}\n</body>\n</html>\n`)
console.log('built', page.length)
