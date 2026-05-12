const sharp = require('sharp');
const path = require('path');

const input  = path.join(__dirname, 'public/images/tirumeni (1).png');
const output = path.join(__dirname, 'public/images/tirumeni-v2.png');

async function run() {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // --- Step 1: BFS flood fill from all border pixels to find outer background ---
  const isNearWhite = (i) => data[i*4] > 220 && data[i*4+1] > 220 && data[i*4+2] > 220;
  const background  = new Uint8Array(width * height); // 1 = outer background
  const queue = [];

  const enqueue = (idx) => {
    if (background[idx] || !isNearWhite(idx)) return;
    background[idx] = 1;
    queue.push(idx);
  };

  // Seed from all four edges
  for (let x = 0; x < width;  x++) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { enqueue(y * width); enqueue(y * width + (width - 1)); }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0)         enqueue(idx - 1);
    if (x < width - 1) enqueue(idx + 1);
    if (y > 0)         enqueue(idx - width);
    if (y < height-1)  enqueue(idx + width);
  }

  // --- Step 2: Edge detection on greyscale to clean up boundary fringing ---
  const { data: edgeData } = await sharp(input)
    .greyscale()
    .normalise()
    .convolve({ width: 3, height: 3, kernel: [-1,-1,-1,-1,8,-1,-1,-1,-1] })
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // --- Step 3: Build output ---
  // - Outer background → transparent
  // - Pixels on a strong edge → fully opaque (keeps crisp boundary)
  // - Everything else inside → fully opaque with original colors
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = data[i*4], g = data[i*4+1], b = data[i*4+2];
    out[i*4]   = r;
    out[i*4+1] = g;
    out[i*4+2] = b;

    if (background[i]) {
      // Outer background: use edge strength to keep crisp fringe, else transparent
      const e = edgeData[i];
      out[i*4+3] = e > 30 ? Math.min(255, e * 2) : 0;
    } else {
      out[i*4+3] = 255; // Inside art: fully opaque
    }
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);

  console.log(`Done → ${output}`);
}

run().catch(console.error);
