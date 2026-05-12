const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public/images/tirumeni.jpg');
const output = path.join(__dirname, 'public/images/tirumeni-nobg.png');

async function run() {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Treat near-white pixels as transparent
    const isWhite = r > 230 && g > 230 && b > 230;

    out[i * 4]     = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = isWhite ? 0 : 255;
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);

  console.log(`Done → ${output}`);
}

run().catch(console.error);
