/**
 * The original listing photos are 1920x1080 with the real photo centred
 * and a BLURRED copy filling the sides. This script detects the sharp
 * content region automatically (blurred fill has much weaker horizontal
 * gradients than real content) and crops each photo to it.
 *
 *   node scripts/crop-photos.mjs
 *
 * Prints a JSON map of the resulting dimensions for lib/site.ts.
 */
import sharp from "sharp";
import path from "path";

const SRC = "Property Photos";
const OUT = "public/photos";

const rename = {
  "92bde017-3fb5-4f7e-9f6b-258b3c649fd2.jpg": "studio-overview.jpg",
  "4c6ef113-527d-4efa-a270-e6aa570f2e34.jpg": "beds-entrance.jpg",
  "206ba5cd-3bed-4a60-9955-c879d53ad91e.jpg": "beds-sofa.jpg",
  "fd2dc0dc-5c0b-4e48-bfae-fd01b32818fd.jpg": "twin-beds.jpg",
  "e5bce749-6064-498c-8478-2b2df1de7603.jpg": "beds-artwork.jpg",
  "39266289-4a91-429a-9b47-d2f6765699fe.jpg": "bedside-lamp.jpg",
  "1fa69845-5c88-4236-a67c-9285f87fbbf5.jpg": "tv-lounge.jpg",
  "838f5188-f5b2-4951-a926-611035bb7ef4.jpg": "sofa.jpg",
  "0b6236fd-b06a-4a4c-8cb8-1eeebd47cc7e.jpg": "dining-area.jpg",
  "00d87e0a-f445-4300-b8d8-58fa957d9542.jpg": "dining-table.jpg",
  "29c9e02d-f0cd-4b23-b89b-c5b319fbb16a.jpg": "kitchen.jpg",
  "13d6bcd4-e811-43e7-aa76-685fa487f51a.jpg": "kitchen-dining.jpg",
  "0e29a8a4-2901-4544-8385-202194975a6b.jpg": "tea-coffee-station.jpg",
  "117b69d5-5569-4159-a905-ee70a24ef5c0.jpg": "tumble-dryer.jpg",
  "35a7bf4d-df49-4f8e-8462-a17059d10af4.jpg": "bathroom.jpg",
  "06f1f085-b19a-47bc-9101-80700acabbe0.jpg": "bathtub-shower.jpg",
  "80e495fd-0123-49a4-b1c7-39bd0b255b61.jpg": "towel-rail.jpg",
  "523d9f3e-4e16-4104-b79c-7180c5df27af.jpg": "shelf-decor.jpg",
  "2e77c17b-43a6-448e-aa58-7f17cd0494f4.jpg": "private-entrance.jpg",
};

/** Column-wise mean absolute horizontal gradient of a greyscale buffer. */
function columnSharpness(data, width, height) {
  const profile = new Float64Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 1; x < width; x++) {
      profile[x] += Math.abs(data[row + x] - data[row + x - 1]);
    }
  }
  // light smoothing (moving average, window 9)
  const smooth = new Float64Array(width);
  const W = 4;
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let n = 0;
    for (let k = -W; k <= W; k++) {
      const i = x + k;
      if (i >= 0 && i < width) {
        sum += profile[i];
        n++;
      }
    }
    smooth[x] = sum / n;
  }
  return smooth;
}

async function detectContentBounds(file) {
  const SCALE_W = 480;
  const { data, info } = await sharp(file)
    .resize(SCALE_W, null, { fit: "inside" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const profile = columnSharpness(data, info.width, info.height);

  // reference level = median-ish sharpness of the central third
  const center = Math.floor(info.width / 2);
  const third = Math.floor(info.width / 6);
  const central = Array.from(
    profile.slice(center - third, center + third),
  ).sort((a, b) => a - b);
  const ref = central[Math.floor(central.length / 2)];
  const threshold = ref * 0.42;

  // expand outward from the centre while columns stay sharp,
  // tolerating small soft gaps (e.g. plain walls) up to 14 columns
  const GAP = 14;
  let left = center;
  let gap = 0;
  for (let x = center; x >= 0; x--) {
    if (profile[x] >= threshold) {
      left = x;
      gap = 0;
    } else if (++gap > GAP) break;
  }
  let right = center;
  gap = 0;
  for (let x = center; x < info.width; x++) {
    if (profile[x] >= threshold) {
      right = x;
      gap = 0;
    } else if (++gap > GAP) break;
  }

  return { left: left / info.width, right: (right + 1) / info.width };
}

/**
 * Manual bounds (full-res x0..x1) for photos where auto-detection fails —
 * mostly frames dominated by plain walls or genuinely soft focus.
 * Verified by eye against each original.
 */
const overrides = {
  "beds-artwork.jpg": [235, 1685],
  "tea-coffee-station.jpg": [250, 1675],
  "towel-rail.jpg": [235, 1350],
  "tumble-dryer.jpg": [570, 1350],
  "bedside-lamp.jpg": [260, 1660],
  "shelf-decor.jpg": [480, 1650],
  "private-entrance.jpg": [575, 1240],
  "kitchen-dining.jpg": [560, 1250],
};

const dims = {};
for (const [src, out] of Object.entries(rename)) {
  const file = path.join(SRC, src);
  const meta = await sharp(file).metadata();

  let x0;
  let x1;
  if (overrides[out]) {
    [x0, x1] = overrides[out];
  } else {
    const { left, right } = await detectContentBounds(file);
    // map to full resolution with a small inset to hide any blur seam
    const INSET = 6;
    x0 = Math.round(left * meta.width) + INSET;
    x1 = Math.round(right * meta.width) - INSET;
  }
  // sanity: never crop narrower than a third of the frame
  if (x1 - x0 < meta.width / 3) {
    x0 = Math.round(meta.width / 3);
    x1 = Math.round((meta.width * 2) / 3);
  }
  const width = x1 - x0;

  await sharp(file)
    .extract({ left: x0, top: 0, width, height: meta.height })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(OUT, out));

  dims[out] = { w: width, h: meta.height };
  console.log(`${out}: x ${x0}..${x1} -> ${width}x${meta.height}`);
}

console.log("\nDimensions for lib/site.ts:");
console.log(JSON.stringify(dims, null, 2));
