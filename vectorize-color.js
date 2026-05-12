const sharp = require('sharp');
const path = require('path');

const input = path.join(__dirname, 'public/images/tirumeni (1).png');
const output = path.join(__dirname, 'public/images/tirumeni-color.png');

async function run() {
  const { data: origData, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // Edge detection on greyscale version
  const { data: edgeData } = await sharp(input)
    .greyscale()
    .normalise()
    .convolve({ width: 3, height: 3, kernel: [-1,-1,-1,-1,8,-1,-1,-1,-1] })
    .normalise()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Output: original RGB, alpha = edge strength (boosted)
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const r = origData[i * 4];
    const g = origData[i * 4 + 1];
    const b = origData[i * 4 + 2];
    const edgeVal = edgeData[i];
    // Boost edge alpha: edges pop, background fades
    const alpha = Math.min(255, edgeVal * 3);
    out[i * 4]     = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha < 15 ? 0 : alpha;
  }

  await sharp(out, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(output);

  console.log(`Done → ${output}`);
}

run().catch(console.error);
