// Generates public/icon-192.png and public/icon-512.png
// Orange (#f97316) square with white "T" letter
import { writeFileSync } from 'fs'
import { deflateSync } from 'zlib'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length, 0)
  const crcInput = Buffer.concat([t, data])
  const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([len, t, data, crcBuf])
}

function makePNG(size) {
  // Orange background: #f97316 = 249, 115, 22
  const br = 249, bg = 115, bb = 22
  // White "T": w=white
  const wr = 255, wg = 255, wb = 255

  // Draw a white "T" in the center
  const pixels = new Uint8Array(size * size * 3)
  const cx = Math.floor(size / 2)
  const fontH = Math.floor(size * 0.55)
  const fontW = Math.floor(size * 0.45)
  const topBarH = Math.floor(size * 0.1)
  const stemW = Math.floor(size * 0.12)
  const startY = Math.floor(size * 0.2)
  const startX = Math.floor(cx - fontW / 2)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = br, g = bg, b = bb
      // Top bar of T
      if (y >= startY && y < startY + topBarH && x >= startX && x < startX + fontW) {
        r = wr; g = wg; b = wb
      }
      // Stem of T
      const stemX = Math.floor(cx - stemW / 2)
      if (y >= startY && y < startY + fontH && x >= stemX && x < stemX + stemW) {
        r = wr; g = wg; b = wb
      }
      const i = (y * size + x) * 3
      pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b
    }
  }

  // Build raw scanlines (filter byte 0 per row + RGB)
  const raw = Buffer.allocUnsafe(size * (1 + size * 3))
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0 // filter None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 3
      const dst = y * (1 + size * 3) + 1 + x * 3
      raw[dst] = pixels[src]; raw[dst + 1] = pixels[src + 1]; raw[dst + 2] = pixels[src + 2]
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.allocUnsafe(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8   // bit depth
  ihdrData[9] = 2   // color type RGB
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0
  const ihdr = chunk('IHDR', ihdrData)
  const idat = chunk('IDAT', deflateSync(raw, { level: 6 }))
  const iend = chunk('IEND', Buffer.alloc(0))
  return Buffer.concat([sig, ihdr, idat, iend])
}

writeFileSync('public/icon-192.png', makePNG(192))
console.log('Created public/icon-192.png')
writeFileSync('public/icon-512.png', makePNG(512))
console.log('Created public/icon-512.png')
