#!/usr/bin/env node

const states = {
  CO: `M380.2,235.5 l-36,-3.5 -79.1,-8.6 -2.2,22.1 -7,50.4 -1.9,13.7 34,3.9 37.5,4.4 34.7,3 14.3,0.6z`,
  WY: `M353,161.9 l-1.5,25.4 -4.4,44 -2.7,-0.3 -83.3,-9.1 -27.9,-3 2,-12 6.9,-41 3.8,-24.2 1.3,-11.2 48.2,7 59.1,6.5z`,
  MT: `M361.1,70.77 l-5.3,57.13 -1.3,15.2 -59.1,-6.6 -49,-7.1 -1.4,11.2 -1.9,-1.7 -0.4,-2.5 -1.3,-1.9 -3.3,1.5 -0.7,2.5 -2.3,0.3 -3.8,-1.6 -4.1,0.1 -2.4,0.7 -3.2,-1.5 -3,0.2 -2.1,1.9 -0.9,-0.6 -0.7,-3.4 0.7,-3.2 -2.7,-3.2 -3.3,-2.5 -2.5,-12.6 -0.1,-5.3 -1.6,-0.8 -0.6,1 -4.5,3.2 -1.2,-0.1 -2.3,-2.8 -0.2,-2.8 7,-17.15 -0.6,-2.67 -3.5,-1.12 -0.4,-0.91 -2.7,-3.5 -4.6,-10.41 -3.2,-1.58 -1.8,-4.26 1.3,-4.63 -3.2,-7.57 4.4,-21.29 32.7,6.89 18.4,3.4 32.3,5.3 29.3,4 29.2,3.5 30.8,3.07z`,
  NV: `M123.1,173.6 l38.7,8.5 26,5.2 -10.6,53.1 -5.4,29.8 -3.3,15.5 -2.1,11.1 -2.6,16.4 -1.7,3.1 -1.6,-0.1 -1.2,-2.6 -2.8,-0.5 -1.3,-1.1 -1.8,0.1 -0.9,0.8 -1.8,1.3 -0.3,7.3 -0.3,1.5 -0.5,12.4 -1.1,1.8 -16.7,-25.5 -42.1,-62.1 -12.43,-19 8.55,-32.6 8.01,-31.3z`,
  AZ: `M135.1,389.7 l-0.3,1.5 0.5,1 18.9,10.7 12.1,7.6 14.7,8.6 16.8,10 12.3,2.4 25.4,2.7 6,-39.6 7,-53.1 4.4,-31 -24.6,-3.6 -60.7,-11 -0.2,1.1 -2.6,16.5 -2.1,3.8 -2.8,-0.2 -1.2,-2.6 -2.6,-0.4 -1.2,-1.1 -1.1,0.1 -2.1,1.7 -0.3,6.8 -0.3,1.5 -0.5,12.5 -1.5,2.4 -0.4,3.3 2.8,5 1.1,5.5 0.7,1.1 1.1,0.9 -0.4,2.4 -1.7,1.2 -3.4,1.6 -1.6,1.8 -1.6,3.6 -0.5,4.9 -3,2.9 -1.9,0.9 -0.1,5.8 -0.6,1.6 0.5,0.8 3.9,0.4 -0.9,3 -1.7,2.4 -3.7,0.4z`,
  UT: `M228.4,305.9 l24.6,3.6 1.9,-13.7 7,-50.5 2.3,-22 -32.2,-3.5 2.2,-13.1 1.8,-10.6 -34.7,-6.1 -12.5,-2.5 -10.6,52.9 -5.4,30 -3.3,15.4 -1.7,9.2z`,
  NM: `M270.2,429.4 l-16.7,-2.6 -1.2,9.6 -15.8,-2 6,-39.7 7,-53.2 4.4,-30.9 34,3.9 37.4,4.4 32,2.8 -0.3,10.8 -1.4,-0.1 -7.4,97.7 -28.4,-1.8 -38.1,-3.7 0.7,6.3z`,
  OR: `M67.44,158.9 l28.24,7.2 27.52,6.5 17,3.7 8.8,-35.1 1.2,-4.4 2.4,-5.5 -0.7,-1.3 -2.5,0.1 -1.3,-1.8 0.6,-1.5 0.4,-3.3 4.7,-5.7 1.9,-0.9 0.9,-0.8 0.7,-2.7 0.8,-1.1 3.9,-5.7 3.7,-4 0.2,-3.26 -3.4,-2.49 -1.2,-4.55 -13.1,-3.83 -15.3,-3.47 -14.8,0.37 -1.1,-1.31 -5.1,1.84 -4.5,-0.48 -2.4,-1.58 -1.3,0.54 -4.68,-0.29 -1.96,-1.43 -4.84,-1.77 -1.1,-0.07 -4.45,-1.27 -1.76,1.52 -6.26,-0.24 -5.31,-3.85 0.21,-9.28 -2.05,-3.5 -4.1,-0.6 -0.7,-2.5 -2.4,-0.5 -5.8,2.1 -2.3,6.5 -3.2,10 -3.2,6.5 -5,14.1 -6.5,13.6 -8.1,12.6 -1.9,2.9 -0.8,8.6 -1.3,6 2.71,3.5z`,
  ID: `M175.3,27.63 l-4.8,17.41 -4.5,20.86 -3.4,16.22 -0.4,9.67 1.2,4.44 3.5,2.66 -0.2,3.91 -3.9,4.4 -4.5,6.6 -0.9,2.9 -1.2,1.1 -1.8,0.8 -4.3,5.3 -0.4,3.1 -0.4,1.1 0.6,1 2.6,-0.1 1.1,2.3 -2.4,5.8 -1.2,4.2 -8.8,35.3 20.7,4.5 39.5,7.9 34.8,6.1 4.9,-29.2 3.8,-24.1 -2.7,-2.4 -0.4,-2.6 -0.8,-1.1 -2.1,1 -0.7,2.6 -3.2,0.5 -3.9,-1.6 -3.8,0.1 -2.5,0.7 -3.4,-1.5 -2.4,0.2 -2.4,2 -2,-1.1 -0.7,-4 0.7,-2.9 -2.5,-2.9 -3.3,-2.6 -2.7,-13.1 -0.1,-4.7 -0.3,-0.1 -0.2,0.4 -5.1,3.5 -1.7,-0.2 -2.9,-3.4 -0.2,-3.1 7,-17.13 -0.4,-1.94 -3.4,-1.15 -0.6,-1.18 -2.6,-3.46 -4.6,-10.23 -3.2,-1.53 -2,-4.95 1.3,-4.63 -3.2,-7.58 4.4,-21.52z`,
  KS: `M485.9,259.5 l-43.8,-0.6 -40.6,-1.2 -21.7,-0.9 -4.3,64.8 24.3,1 44.7,2.1 46.3,0.6 12.6,-0.3 0.7,-35 -1.2,-11.1 -2.5,-2 -2.4,-3 -2.3,-3.6 0.6,-3 1.7,-1.4 v-2.1 l-0.8,-0.7 -2.6,-0.2 -3.5,-3.4z`,
  AK: null // placeholder — no path provided
};

// Tokenize an SVG path string into commands + number arrays
function tokenize(d) {
  const tokens = [];
  // Match a letter followed by everything until the next letter (or end)
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  let match;
  while ((match = re.exec(d)) !== null) {
    const cmd = match[1];
    const argStr = match[2].trim();
    let nums = [];
    if (argStr.length > 0) {
      // Split on commas and whitespace, handling negative numbers
      nums = argStr.match(/-?\d+\.?\d*/g);
      if (nums) nums = nums.map(Number);
      else nums = [];
    }
    tokens.push({ cmd, nums });
  }
  return tokens;
}

// Compute bounding box by tracing through all path commands
function computeBBox(d) {
  const tokens = tokenize(d);
  let cx = 0, cy = 0; // current point
  let sx = 0, sy = 0; // start of subpath (for Z)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  function track(x, y) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // For cubic bezier, sample points to approximate bbox
  function trackCubic(x0, y0, x1, y1, x2, y2, x3, y3) {
    for (let t = 0; t <= 1; t += 0.02) {
      const mt = 1 - t;
      const x = mt*mt*mt*x0 + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
      const y = mt*mt*mt*y0 + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
      track(x, y);
    }
  }

  // For quadratic bezier, sample points
  function trackQuadratic(x0, y0, x1, y1, x2, y2) {
    for (let t = 0; t <= 1; t += 0.02) {
      const mt = 1 - t;
      const x = mt*mt*x0 + 2*mt*t*x1 + t*t*x2;
      const y = mt*mt*y0 + 2*mt*t*y1 + t*t*y2;
      track(x, y);
    }
  }

  let lastControlX = cx, lastControlY = cy; // for S/s commands

  for (const { cmd, nums } of tokens) {
    switch (cmd) {
      case 'M': {
        // Absolute moveto — can have implicit lineto pairs after first pair
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i];
          cy = nums[i + 1];
          track(cx, cy);
          if (i === 0) { sx = cx; sy = cy; }
        }
        break;
      }
      case 'm': {
        for (let i = 0; i < nums.length; i += 2) {
          cx += nums[i];
          cy += nums[i + 1];
          track(cx, cy);
          if (i === 0) { sx = cx; sy = cy; }
        }
        break;
      }
      case 'L': {
        for (let i = 0; i < nums.length; i += 2) {
          cx = nums[i];
          cy = nums[i + 1];
          track(cx, cy);
        }
        break;
      }
      case 'l': {
        for (let i = 0; i < nums.length; i += 2) {
          cx += nums[i];
          cy += nums[i + 1];
          track(cx, cy);
        }
        break;
      }
      case 'H': {
        for (let i = 0; i < nums.length; i++) {
          cx = nums[i];
          track(cx, cy);
        }
        break;
      }
      case 'h': {
        for (let i = 0; i < nums.length; i++) {
          cx += nums[i];
          track(cx, cy);
        }
        break;
      }
      case 'V': {
        for (let i = 0; i < nums.length; i++) {
          cy = nums[i];
          track(cx, cy);
        }
        break;
      }
      case 'v': {
        for (let i = 0; i < nums.length; i++) {
          cy += nums[i];
          track(cx, cy);
        }
        break;
      }
      case 'C': {
        for (let i = 0; i < nums.length; i += 6) {
          const x1 = nums[i], y1 = nums[i+1];
          const x2 = nums[i+2], y2 = nums[i+3];
          const x3 = nums[i+4], y3 = nums[i+5];
          trackCubic(cx, cy, x1, y1, x2, y2, x3, y3);
          lastControlX = x2; lastControlY = y2;
          cx = x3; cy = y3;
        }
        break;
      }
      case 'c': {
        for (let i = 0; i < nums.length; i += 6) {
          const x1 = cx + nums[i], y1 = cy + nums[i+1];
          const x2 = cx + nums[i+2], y2 = cy + nums[i+3];
          const x3 = cx + nums[i+4], y3 = cy + nums[i+5];
          trackCubic(cx, cy, x1, y1, x2, y2, x3, y3);
          lastControlX = x2; lastControlY = y2;
          cx = x3; cy = y3;
        }
        break;
      }
      case 'S': {
        for (let i = 0; i < nums.length; i += 4) {
          const rx = 2 * cx - lastControlX;
          const ry = 2 * cy - lastControlY;
          const x2 = nums[i], y2 = nums[i+1];
          const x3 = nums[i+2], y3 = nums[i+3];
          trackCubic(cx, cy, rx, ry, x2, y2, x3, y3);
          lastControlX = x2; lastControlY = y2;
          cx = x3; cy = y3;
        }
        break;
      }
      case 's': {
        for (let i = 0; i < nums.length; i += 4) {
          const rx = 2 * cx - lastControlX;
          const ry = 2 * cy - lastControlY;
          const x2 = cx + nums[i], y2 = cy + nums[i+1];
          const x3 = cx + nums[i+2], y3 = cy + nums[i+3];
          trackCubic(cx, cy, rx, ry, x2, y2, x3, y3);
          lastControlX = x2; lastControlY = y2;
          cx = x3; cy = y3;
        }
        break;
      }
      case 'Q': {
        for (let i = 0; i < nums.length; i += 4) {
          const x1 = nums[i], y1 = nums[i+1];
          const x2 = nums[i+2], y2 = nums[i+3];
          trackQuadratic(cx, cy, x1, y1, x2, y2);
          lastControlX = x1; lastControlY = y1;
          cx = x2; cy = y2;
        }
        break;
      }
      case 'q': {
        for (let i = 0; i < nums.length; i += 4) {
          const x1 = cx + nums[i], y1 = cy + nums[i+1];
          const x2 = cx + nums[i+2], y2 = cy + nums[i+3];
          trackQuadratic(cx, cy, x1, y1, x2, y2);
          lastControlX = x1; lastControlY = y1;
          cx = x2; cy = y2;
        }
        break;
      }
      case 'Z':
      case 'z': {
        cx = sx;
        cy = sy;
        track(cx, cy);
        break;
      }
      default:
        console.warn(`Unhandled command: ${cmd}`);
    }
  }

  return { minX, minY, maxX, maxY };
}

const PADDING = 5;
const result = {};

for (const [stateId, pathD] of Object.entries(states)) {
  if (!pathD) continue; // skip AK placeholder

  const bbox = computeBBox(pathD);
  const vbX = Math.floor(bbox.minX - PADDING);
  const vbY = Math.floor(bbox.minY - PADDING);
  const vbW = Math.ceil(bbox.maxX - bbox.minX + PADDING * 2);
  const vbH = Math.ceil(bbox.maxY - bbox.minY + PADDING * 2);

  result[stateId] = {
    viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
    path: pathD,
    _debug: {
      minX: Math.round(bbox.minX * 100) / 100,
      minY: Math.round(bbox.minY * 100) / 100,
      maxX: Math.round(bbox.maxX * 100) / 100,
      maxY: Math.round(bbox.maxY * 100) / 100,
    }
  };
}

console.log(JSON.stringify(result, null, 2));
