# Procedural Generation & Generative Art

## Marching Cubes

Generate meshes from scalar fields (isosurfaces).

### Three.js MarchingCubes

```javascript
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';

const resolution = 64;
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const marchingCubes = new MarchingCubes(resolution, material, true, true, 100000);
marchingCubes.isolation = 80;
scene.add(marchingCubes);

// Metaball animation
function updateMetaballs(time) {
  marchingCubes.reset();
  
  const numBlobs = 10;
  for (let i = 0; i < numBlobs; i++) {
    const x = 0.5 + 0.3 * Math.sin(time * 0.5 + i);
    const y = 0.5 + 0.3 * Math.cos(time * 0.7 + i);
    const z = 0.5 + 0.3 * Math.sin(time * 0.3 + i);
    const strength = 1.0 / numBlobs;
    const subtract = 12;
    
    marchingCubes.addBall(x, y, z, strength, subtract);
  }
}
```

### Custom Isosurface Function

```javascript
function sampleField(x, y, z) {
  // SDF sphere at origin with noise
  const sphereRadius = 0.3;
  const distance = Math.sqrt(x*x + y*y + z*z) - sphereRadius;
  
  const noiseScale = 10;
  const noiseAmount = 0.05;
  const noise = simplex.noise3D(x * noiseScale, y * noiseScale, z * noiseScale);
  
  return distance + noise * noiseAmount;
}
```

---

## Procedural Terrain

```javascript
class ProceduralTerrain {
  constructor(size = 256, segments = 128) {
    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);
    this.generateHeights();
  }
  
  generateHeights() {
    const positions = this.geometry.attributes.position.array;
    const noise = new SimplexNoise();
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      
      // Multi-octave noise (FBM)
      let height = 0;
      let amplitude = 1;
      let frequency = 0.01;
      
      for (let octave = 0; octave < 6; octave++) {
        height += noise.noise2D(x * frequency, z * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }
      
      positions[i + 1] = height * 20;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
```

### Terrain with Erosion

```javascript
class ErodedTerrain extends ProceduralTerrain {
  erode(iterations = 50000, erosionStrength = 0.1) {
    const positions = this.geometry.attributes.position.array;
    const width = Math.sqrt(positions.length / 3);
    
    for (let iter = 0; iter < iterations; iter++) {
      // Random drop position
      let x = Math.floor(Math.random() * width);
      let z = Math.floor(Math.random() * width);
      
      // Carry water with sediment
      let sediment = 0;
      let water = 1;
      
      for (let step = 0; step < 64 && water > 0.01; step++) {
        const idx = (z * width + x) * 3 + 1;
        const height = positions[idx];
        
        // Find lowest neighbor
        const neighbors = this.getNeighbors(x, z, width);
        let lowestNeighbor = null;
        let lowestHeight = height;
        
        for (const n of neighbors) {
          const nIdx = (n.z * width + n.x) * 3 + 1;
          if (positions[nIdx] < lowestHeight) {
            lowestHeight = positions[nIdx];
            lowestNeighbor = n;
          }
        }
        
        if (!lowestNeighbor) break;
        
        // Erode and deposit
        const diff = height - lowestHeight;
        const capacity = diff * water * erosionStrength;
        
        if (sediment > capacity) {
          positions[idx] += (sediment - capacity) * 0.1;
          sediment = capacity;
        } else {
          const erosion = Math.min(diff * 0.5, (capacity - sediment) * 0.3);
          positions[idx] -= erosion;
          sediment += erosion;
        }
        
        x = lowestNeighbor.x;
        z = lowestNeighbor.z;
        water *= 0.95;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }
}
```

---

## L-Systems (Plants/Trees)

```javascript
class LSystem {
  constructor(axiom, rules, angle = 25) {
    this.axiom = axiom;
    this.rules = rules;
    this.angle = angle * Math.PI / 180;
  }
  
  generate(iterations) {
    let current = this.axiom;
    
    for (let i = 0; i < iterations; i++) {
      let next = '';
      for (const char of current) {
        next += this.rules[char] || char;
      }
      current = next;
    }
    
    return current;
  }
  
  toGeometry(instructions) {
    const points = [];
    const stack = [];
    let position = new THREE.Vector3(0, 0, 0);
    let direction = new THREE.Vector3(0, 1, 0);
    let up = new THREE.Vector3(0, 0, 1);
    
    for (const char of instructions) {
      switch (char) {
        case 'F': // Draw forward
          const newPos = position.clone().add(direction);
          points.push(position.clone(), newPos.clone());
          position = newPos;
          break;
        case '+': // Rotate right
          direction.applyAxisAngle(up, -this.angle);
          break;
        case '-': // Rotate left
          direction.applyAxisAngle(up, this.angle);
          break;
        case '[': // Push state
          stack.push({
            position: position.clone(),
            direction: direction.clone()
          });
          break;
        case ']': // Pop state
          const state = stack.pop();
          position = state.position;
          direction = state.direction;
          break;
      }
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }
}

// Example trees
const trees = {
  bush: new LSystem('F', { 'F': 'FF+[+F-F-F]-[-F+F+F]' }, 22.5),
  fern: new LSystem('X', { 'X': 'F+[[X]-X]-F[-FX]+X', 'F': 'FF' }, 25),
  seaweed: new LSystem('F', { 'F': 'FF-[-F+F+F]+[+F-F-F]' }, 22)
};

const instructions = trees.bush.generate(4);
const treeGeometry = trees.bush.toGeometry(instructions);
const treeMesh = new THREE.LineSegments(
  treeGeometry,
  new THREE.LineBasicMaterial({ color: 0x8B4513 })
);
```

---

## Flow Fields

```javascript
class FlowField {
  constructor(width, height, resolution = 20) {
    this.cols = Math.floor(width / resolution);
    this.rows = Math.floor(height / resolution);
    this.resolution = resolution;
    this.field = new Array(this.cols * this.rows);
    this.update(0);
  }
  
  update(time) {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const angle = noise.simplex3(
          x * 0.1,
          y * 0.1,
          time * 0.5
        ) * Math.PI * 2;
        
        this.field[y * this.cols + x] = {
          x: Math.cos(angle),
          y: Math.sin(angle)
        };
      }
    }
  }
  
  lookup(x, y) {
    const col = Math.floor(x / this.resolution);
    const row = Math.floor(y / this.resolution);
    
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return { x: 0, y: 0 };
    }
    
    return this.field[row * this.cols + col];
  }
}

// Particle following flow field
class FlowParticle {
  constructor(x, y) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.acc = { x: 0, y: 0 };
    this.maxSpeed = 4;
    this.history = [];
  }
  
  follow(flowField) {
    const force = flowField.lookup(this.pos.x, this.pos.y);
    this.acc.x += force.x * 0.5;
    this.acc.y += force.y * 0.5;
  }
  
  update() {
    this.vel.x += this.acc.x;
    this.vel.y += this.acc.y;
    
    // Limit speed
    const speed = Math.sqrt(this.vel.x ** 2 + this.vel.y ** 2);
    if (speed > this.maxSpeed) {
      this.vel.x = (this.vel.x / speed) * this.maxSpeed;
      this.vel.y = (this.vel.y / speed) * this.maxSpeed;
    }
    
    this.history.push({ ...this.pos });
    if (this.history.length > 100) this.history.shift();
    
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    
    this.acc.x = 0;
    this.acc.y = 0;
  }
}
```

---

## Circle Packing

```javascript
class CirclePacker {
  constructor(width, height) {
    this.circles = [];
    this.width = width;
    this.height = height;
  }
  
  addCircle(maxAttempts = 1000) {
    for (let i = 0; i < maxAttempts; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      
      // Find maximum radius
      let maxR = Infinity;
      for (const c of this.circles) {
        const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
        maxR = Math.min(maxR, d - c.r);
      }
      
      // Clamp to bounds
      maxR = Math.min(maxR, x, y, this.width - x, this.height - y);
      
      if (maxR > 5) { // Minimum radius
        this.circles.push({ x, y, r: maxR });
        return true;
      }
    }
    return false;
  }
  
  pack(count = 500) {
    for (let i = 0; i < count; i++) {
      if (!this.addCircle()) break;
    }
    return this.circles;
  }
}

// Create 3D circle packing visualization
function createCirclePackingMesh(circles) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  
  circles.forEach(c => {
    // Create circle points
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const nextAngle = ((i + 1) / 32) * Math.PI * 2;
      
      positions.push(
        c.x + Math.cos(angle) * c.r, c.y + Math.sin(angle) * c.r, 0,
        c.x + Math.cos(nextAngle) * c.r, c.y + Math.sin(nextAngle) * c.r, 0
      );
      
      const hue = c.r / 50;
      const color = new THREE.Color().setHSL(hue, 0.7, 0.6);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    }
  });
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ vertexColors: true })
  );
}
```

---

## Reaction-Diffusion

```javascript
class ReactionDiffusion {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    
    this.gridA = new Float32Array(width * height);
    this.gridB = new Float32Array(width * height);
    this.nextA = new Float32Array(width * height);
    this.nextB = new Float32Array(width * height);
    
    // Parameters
    this.dA = 1.0;
    this.dB = 0.5;
    this.feed = 0.055;
    this.kill = 0.062;
    
    this.init();
  }
  
  init() {
    // Fill with A, seed with B
    this.gridA.fill(1);
    this.gridB.fill(0);
    
    // Seed some B in the center
    const cx = Math.floor(this.width / 2);
    const cy = Math.floor(this.height / 2);
    
    for (let x = cx - 10; x < cx + 10; x++) {
      for (let y = cy - 10; y < cy + 10; y++) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          this.gridB[y * this.width + x] = 1;
        }
      }
    }
  }
  
  laplacian(grid, x, y) {
    const w = this.width;
    const h = this.height;
    
    let sum = 0;
    sum += grid[y * w + x] * -1;
    sum += grid[y * w + ((x + 1) % w)] * 0.2;
    sum += grid[y * w + ((x - 1 + w) % w)] * 0.2;
    sum += grid[((y + 1) % h) * w + x] * 0.2;
    sum += grid[((y - 1 + h) % h) * w + x] * 0.2;
    sum += grid[((y + 1) % h) * w + ((x + 1) % w)] * 0.05;
    sum += grid[((y + 1) % h) * w + ((x - 1 + w) % w)] * 0.05;
    sum += grid[((y - 1 + h) % h) * w + ((x + 1) % w)] * 0.05;
    sum += grid[((y - 1 + h) % h) * w + ((x - 1 + w) % w)] * 0.05;
    
    return sum;
  }
  
  step() {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const i = y * this.width + x;
        
        const a = this.gridA[i];
        const b = this.gridB[i];
        
        const lapA = this.laplacian(this.gridA, x, y);
        const lapB = this.laplacian(this.gridB, x, y);
        
        const reaction = a * b * b;
        
        this.nextA[i] = a + (this.dA * lapA - reaction + this.feed * (1 - a));
        this.nextB[i] = b + (this.dB * lapB + reaction - (this.kill + this.feed) * b);
        
        this.nextA[i] = Math.max(0, Math.min(1, this.nextA[i]));
        this.nextB[i] = Math.max(0, Math.min(1, this.nextB[i]));
      }
    }
    
    [this.gridA, this.nextA] = [this.nextA, this.gridA];
    [this.gridB, this.nextB] = [this.nextB, this.gridB];
  }
  
  toTexture() {
    const data = new Uint8Array(this.width * this.height * 4);
    
    for (let i = 0; i < this.gridA.length; i++) {
      const v = Math.floor((1 - this.gridB[i]) * 255);
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
    
    const texture = new THREE.DataTexture(
      data,
      this.width,
      this.height,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    return texture;
  }
}
```

---

## Organic Motion with Multi-Layer Noise

```javascript
function organicMotion(time, seed) {
  const baseFreq = 0.5;
  const baseAmp = 1.0;
  
  let x = 0, y = 0, z = 0;
  
  // Layer 1: Slow, large movements
  x += noise.simplex2(seed, time * baseFreq * 0.3) * baseAmp * 2;
  y += noise.simplex2(seed + 100, time * baseFreq * 0.3) * baseAmp * 2;
  z += noise.simplex2(seed + 200, time * baseFreq * 0.3) * baseAmp * 2;
  
  // Layer 2: Medium frequency
  x += noise.simplex2(seed + 1000, time * baseFreq) * baseAmp * 0.5;
  y += noise.simplex2(seed + 1100, time * baseFreq) * baseAmp * 0.5;
  z += noise.simplex2(seed + 1200, time * baseFreq) * baseAmp * 0.5;
  
  // Layer 3: Fast, small jitter
  x += noise.simplex2(seed + 2000, time * baseFreq * 3) * baseAmp * 0.1;
  y += noise.simplex2(seed + 2100, time * baseFreq * 3) * baseAmp * 0.1;
  z += noise.simplex2(seed + 2200, time * baseFreq * 3) * baseAmp * 0.1;
  
  return { x, y, z };
}
```

---

## Color Systems for Generative Art

### OKLCH Color Space

```javascript
// OKLCH to RGB (perceptually uniform colors)
function oklchToRGB(l, c, h) {
  // Convert OKLCH to OKLab
  const a = c * Math.cos(h * Math.PI / 180);
  const b = c * Math.sin(h * Math.PI / 180);
  
  // OKLab to linear RGB (simplified)
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  return {
    r: +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3
  };
}

// Generate harmonious palette
function generatePalette(baseHue, scheme = 'complementary') {
  const schemes = {
    complementary: [0, 180],
    triadic: [0, 120, 240],
    analogous: [-30, 0, 30],
    splitComplementary: [0, 150, 210],
    tetradic: [0, 90, 180, 270]
  };
  
  const offsets = schemes[scheme];
  return offsets.map(offset => ({
    h: (baseHue + offset) % 360,
    s: 0.7,
    l: 0.6
  }));
}
```

---

## Key Algorithms Reference

| Algorithm | Use Case | Complexity |
|-----------|----------|------------|
| Perlin/Simplex Noise | Organic textures, terrain | O(1) per sample |
| Flow Fields | Fluid motion, particle trails | O(n) particles |
| Circle Packing | Organic layouts, visualization | O(n²) iterations |
| Voronoi/Delaunay | Cell patterns, spatial division | O(n log n) |
| L-Systems | Plants, fractals | O(iterations * length) |
| Reaction-Diffusion | Organic patterns, coral | O(width * height) |
| Marching Cubes | Isosurface extraction | O(resolution³) |
| Erosion | Terrain realism | O(iterations) |

---

## Creative Coding Resources

### Libraries
- **p5.js**: https://p5js.org - Beginner-friendly
- **c2.js**: Computational geometry, physics
- **pts.js**: https://ptsjs.org - Points and forms
- **Paper.js**: https://paperjs.org - Vector graphics

### Platforms
- **fxhash**: https://www.fxhash.xyz - Generative art NFTs
- **ArtBlocks**: https://www.artblocks.io - Curated generative art

### Learning
- **The Coding Train**: https://thecodingtrain.com
- **Nature of Code**: https://natureofcode.com
