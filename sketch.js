let spriteSheet;
const TOTAL_FRAMES = 54;
// left-side sprite (folder 1)
let spriteSheetLeft;
const LEFT_TOTAL_FRAMES = 29;
let frameW, frameH;
let frames = [];
let frameWLeft, frameHLeft;
let framesLeft = [];
let currentFrame = 0;
let lastChange = 0;
const FPS = 10; // slower FPS to avoid ghosting / "分身"
let offsets = []; // per-frame center offsets to avoid jitter
const SCALE_MULT = 1.5; // overall scale multiplier (150%)
let offsetsLeft = [];
let currentFrameLeft = 0;
let lastChangeLeft = 0;
// load flags removed; relying on p5 preload blocking behavior

function preload() {
  // load sprite sheet from folder 3 (expected size 5440x76, 54 frames)
  // load sprite sheets (preload blocks until these are loaded)
  spriteSheet = loadImage('3/all.png');
  spriteSheetLeft = loadImage('1/all.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // images are loaded by preload
  // calculate frame dimensions after image is loaded (preload guarantees this)
  frameW = spriteSheet.width / TOTAL_FRAMES;
  frameH = spriteSheet.height;

  // slice the sprite sheet into individual frames once to avoid sampling adjacent frames
  // slice using integer widths and accumulated position to avoid float rounding errors
  const baseW = Math.floor(spriteSheet.width / TOTAL_FRAMES);
  let pos = 0;
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    let w = baseW;
    if (i === TOTAL_FRAMES - 1) w = spriteSheet.width - pos; // remainder to last
    frames[i] = spriteSheet.get(pos, 0, w, frameH);
    pos += w;
  }

  // slice left sprite sheet into individual frames using integer accumulation
  const baseWLeft = Math.floor(spriteSheetLeft.width / LEFT_TOTAL_FRAMES);
  frameHLeft = spriteSheetLeft.height;
  let posL = 0;
  for (let i = 0; i < LEFT_TOTAL_FRAMES; i++) {
    let w = baseWLeft;
    if (i === LEFT_TOTAL_FRAMES - 1) w = spriteSheetLeft.width - posL;
    framesLeft[i] = spriteSheetLeft.get(posL, 0, w, frameHLeft);
    posL += w;
  }

  // compute per-frame bounding box center (based on non-transparent pixels)
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const img = frames[i];
    img.loadPixels();
    const w = img.width;
    const h = img.height;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = 4 * (y * w + x);
        const a = img.pixels[idx + 3];
        if (a > 0) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      offsets[i] = { ox: 0, oy: 0 };
    } else {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      // offset relative to image center
      const ox = centerX - w / 2;
      const oy = centerY - h / 2;
      offsets[i] = { ox, oy };
    }
  }

  // compute offsets for left frames
  for (let i = 0; i < LEFT_TOTAL_FRAMES; i++) {
    const img = framesLeft[i];
    img.loadPixels();
    const w = img.width;
    const h = img.height;
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = 4 * (y * w + x);
        const a = img.pixels[idx + 3];
        if (a > 0) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!found) {
      offsetsLeft[i] = { ox: 0, oy: 0 };
    } else {
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const ox = centerX - w / 2;
      const oy = centerY - h / 2;
      offsetsLeft[i] = { ox, oy };
    }
  }

  imageMode(CENTER);
  noSmooth();
  lastChange = millis();
  lastChangeLeft = millis();
}

function draw() {
  background('#caf0f8');
  // no load-error guard needed (preload ensures images are available)

  const interval = 1000 / FPS;
  if (millis() - lastChange >= interval) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
    lastChange = millis();
  }

  if (millis() - lastChangeLeft >= interval) {
    currentFrameLeft = (currentFrameLeft + 1) % LEFT_TOTAL_FRAMES;
    lastChangeLeft = millis();
  }

  // get current frame images (will check existence later)

  // get current frame images
  const fimgLeft = framesLeft[currentFrameLeft];
  const fimg = frames[currentFrame];

  // compute draw sizes based on each frame's actual width/height
  const maxW = width * 0.8;

  let drawW = fimg.width;
  let drawH = fimg.height;
  if (drawW > maxW) {
    const s = maxW / drawW;
    drawW *= s;
    drawH *= s;
  }
  drawW *= SCALE_MULT;
  drawH *= SCALE_MULT;

  let leftDrawW = fimgLeft.width;
  let leftDrawH = fimgLeft.height;
  if (leftDrawW > maxW) {
    const s = maxW / leftDrawW;
    leftDrawW *= s;
    leftDrawH *= s;
  }
  leftDrawW *= SCALE_MULT;
  leftDrawH *= SCALE_MULT;

  // clamp combined width (left + spacing + main) to viewport
  const spacing = 40;
  const limitW = width * 0.95;
  if (leftDrawW + drawW + spacing > limitW) {
    const s2 = (limitW - spacing) / (leftDrawW + drawW);
    leftDrawW *= s2;
    leftDrawH *= s2;
    drawW *= s2;
    drawH *= s2;
  }

  // draw left frame (mirrored)
  if (!fimgLeft) return;
  const foffsetLeft = offsetsLeft[currentFrameLeft] || { ox: 0, oy: 0 };
  const imgScaleLeft = leftDrawW / fimgLeft.width;
  const mainDrawX = width / 2;
  const mainDrawY = height / 2;
  const leftCenterX = mainDrawX - (drawW / 2) - spacing - (leftDrawW / 2);
  const leftCenterY = mainDrawY;
  // mirrored: invert horizontal offset sign
  const foffsetLeftX = -foffsetLeft.ox;
  const drawXLeft = leftCenterX - foffsetLeftX * imgScaleLeft;
  const drawYLeft = leftCenterY - foffsetLeft.oy * imgScaleLeft;
  push();
  translate(drawXLeft, drawYLeft);
  scale(-1, 1);
  imageMode(CENTER);
  image(fimgLeft, 0, 0, leftDrawW, leftDrawH);
  pop();

  // draw main frame (on the right/center)
  if (!fimg) return;
  const foffset = offsets[currentFrame] || { ox: 0, oy: 0 };
  const imgScale = drawW / fimg.width;
  const drawX = mainDrawX - foffset.ox * imgScale;
  const drawY = mainDrawY - foffset.oy * imgScale;
  imageMode(CENTER);
  image(fimg, drawX, drawY, drawW, drawH);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
