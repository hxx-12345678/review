import sharp from 'sharp'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const svg = readFileSync(join(publicDir, 'icon.svg'), 'utf-8')

// Generate 192x192 PNG
await sharp(Buffer.from(svg))
  .resize(192, 192)
  .png()
  .toFile(join(publicDir, 'icon-192x192.png'))
console.log('Generated icon-192x192.png')

// Generate 512x512 PNG
await sharp(Buffer.from(svg))
  .resize(512, 512)
  .png()
  .toFile(join(publicDir, 'icon-512x512.png'))
console.log('Generated icon-512x512.png')
