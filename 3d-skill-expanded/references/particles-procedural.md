# Particles & Procedural Generation Reference

## GPU Particles (GPGPU)

### GPUComputationRenderer Setup
```javascript
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

const WIDTH = 256;  // 256 * 256 = 65,536 particles
const gpuCompute = new GPUComputationRenderer(WIDTH, WIDTH, renderer);

// Create data textures
const positionTexture = gpuCompute.createTexture();
const velocityTexture = gpuCompute.createTexture();

// Initialize positions
const posData = positionTexture.image.data;
for (let i = 0; i < posData.length; i += 4) {
  posData[i] = (Math.random() - 0.5) * 10;      // x
  posData[i + 1] = (Math.random() - 0.5) * 10;  // y
  posData[i + 2] = (Math.random() - 0.5) * 10;  // z
  posData[i + 3] = 1;                            // w (life)
}

// Initialize velocities
const velData = velocityTexture.image.data;
for (let i = 0; i < velData.length; i += 4) {
  velData[i] = (Math.random() - 0.5) * 0.1;
  velData[i + 1] = Math.random() * 0.1;
  velData[i + 2] = (Math.random() - 0.5) * 0.1;
  velData[i + 3] = 0;
}
```

### Position Update Shader
```glsl
uniform float uTime;
uniform float uDelta;
uniform vec3 uMouse;
uniform float uMouseStrength;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  
  // Update position
  pos.xyz += vel.xyz * uDelta * 60.0;
  
  // Mouse attraction
  vec3 toMouse = uMouse - pos.xyz;
  float dist = length(toMouse);
  if (dist < 5.0) {
    pos.xyz += normalize(toMouse) * (5.0 - dist) * uMouseStrength * uDelta;
  }
  
  // Bounds
  if (pos.y < -5.0) {
    pos.y = 5.0;
    vel.y = 0.0;
  }
  
  gl_FragColor = pos;
}
```

### Velocity Update Shader
```glsl
uniform float uTime;
uniform float uDelta;
uniform vec3 uMouse;

// Curl noise function
vec3 curlNoise(vec3 p) {
  // ... (see shaders-sdf.md for full implementation)
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 pos = texture2D(texturePosition, uv);
  vec4 vel = texture2D(textureVelocity, uv);
  
  // Apply curl noise for organic motion
  vec3 curl = curlNoise(pos.xyz * 0.1 + uTime * 0.1);
  vel.xyz += curl * 0.01;
  
  // Gravity
  vel.y -= 0.001;
  
  // Damping
  vel.xyz *= 0.99;
  
  gl_FragColor = vel;
}
```

### Particle Rendering
```javascript
// Create points geometry
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(WIDTH * WIDTH * 3);
const uvs = new Float32Array(WIDTH * WIDTH * 2);

for (let i = 0; i < WIDTH * WIDTH; i++) {
  const x = (i % WIDTH) / WIDTH;
  const y = Math.floor(i / WIDTH) / WIDTH;
  
  uvs[i * 2] = x;
  uvs[i * 2 + 1] = y;
  
  positions[i * 3] = 0;
  positions[i * 3 + 1] = 0;
  positions[i * 3 + 2] = 0;
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

// Particle material
const material = new THREE.ShaderMaterial({
  uniforms: {
    uPositions: { value: null },
    uSize: { value: 5.0 }
  },
  vertexShader: `
    uniform sampler2D uPositions;
    uniform float uSize;
    
    void main() {
      vec4 pos = texture2D(uPositions, uv);
      vec4 mvPosition = modelViewMatrix * vec4(pos.xyz, 1.0);
      gl_PointSize = uSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = 1.0 - smoothstep(0.3, 0.5, d);
      gl_FragColor = vec4(1.0, 0.8, 0.5, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// Update loop
function animate() {
  gpuCompute.compute();
  
  material.uniforms.uPositions.value = 
    gpuCompute.getCurrentRenderTarget(positionVariable).texture;
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## WebGPU Compute Particles (TSL)

```javascript
import { 
  computeFn, 
  storage, 
  instanceIndex,
  uniform,
  vec3,
  vec4,
  float,
  sin,
  cos,
  mod
} from 'three/tsl';

const particleCount = 100000;

// Storage buffers
const positionBuffer = new THREE.StorageBufferAttribute(
  new Float32Array(particleCount * 4), 4
);

const velocityBuffer = new THREE.StorageBufferAttribute(
  new Float32Array(particleCount * 4), 4
);

// Initialize
for (let i = 0; i < particleCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const r = Math.random() * 5;
  
  positionBuffer.setXYZW(
    i,
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    1
  );
  
  velocityBuffer.setXYZW(i, 0, 0, 0, 0);
}

// Compute shader
const computeParticles = computeFn(() => {
  const i = instanceIndex;
  const position = storage(positionBuffer, 'vec4', particleCount);
  const velocity = storage(velocityBuffer, 'vec4', particleCount);
  
  const pos = position.element(i);
  const vel = velocity.element(i);
  
  // Curl noise-like motion
  const noise = vec3(
    sin(pos.y.mul(0.5).add(time)),
    cos(pos.z.mul(0.5).add(time)),
    sin(pos.x.mul(0.5).add(time))
  );
  
  vel.xyz.addAssign(noise.mul(0.001));
  vel.xyz.mulAssign(0.99);  // Damping
  
  pos.xyz.addAssign(vel.xyz);
  
  // Wrap around
  pos.x.assign(mod(pos.x.add(10), 20).sub(10));
  pos.y.assign(mod(pos.y.add(10), 20).sub(10));
  pos.z.assign(mod(pos.z.add(10), 20).sub(10));
});

const computeNode = computeParticles.compute(particleCount);

// Sprite material for rendering
const spriteMaterial = new THREE.SpriteNodeMaterial();
spriteMaterial.positionNode = storage(positionBuffer, 'vec4', particleCount)
  .element(instanceIndex).xyz;
spriteMaterial.colorNode = vec3(1, 0.8, 0.5);
spriteMaterial.scaleNode = vec2(0.05);

const sprite = new THREE.Sprite(spriteMaterial);
sprite.count = particleCount;
scene.add(sprite);

// Render loop
function animate() {
  renderer.compute(computeNode);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

## Instanced Particles

```javascript
const geometry = new THREE.SphereGeometry(0.05, 8, 8);
const material = new THREE.MeshBasicMaterial();
const count = 100000;

const mesh = new THREE.InstancedMesh(geometry, material, count);

// Instance attributes
const offsets = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);
const scales = new Float32Array(count);

for (let i = 0; i < count; i++) {
  offsets[i * 3] = (Math.random() - 0.5) * 50;
  offsets[i * 3 + 1] = (Math.random() - 0.5) * 50;
  offsets[i * 3 + 2] = (Math.random() - 0.5) * 50;
  
  colors[i * 3] = Math.random();
  colors[i * 3 + 1] = Math.random();
  colors[i * 3 + 2] = Math.random();
  
  scales[i] = 0.5 + Math.random() * 1.5;
}

geometry.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 3));
geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));

// Custom shader for instanced animation
const material = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: `
    attribute vec3 aOffset;
    attribute vec3 aColor;
    attribute float aScale;
    
    varying vec3 vColor;
    uniform float uTime;
    
    void main() {
      vColor = aColor;
      
      vec3 pos = position * aScale + aOffset;
      pos.y += sin(uTime + aOffset.x * 0.1) * 0.5;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
    }
  `
});
```

## Procedural Generation

### Marching Cubes
```javascript
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

const resolution = 64;
const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
const marchingCubes = new MarchingCubes(resolution, material, true, true);

marchingCubes.isolation = 80;

function updateMetaballs(time) {
  marchingCubes.reset();
  
  // Add metaballs
  const numBalls = 10;
  for (let i = 0; i < numBalls; i++) {
    const x = 0.5 + 0.3 * Math.sin(time * 0.5 + i * 0.7);
    const y = 0.5 + 0.3 * Math.cos(time * 0.3 + i * 1.1);
    const z = 0.5 + 0.3 * Math.sin(time * 0.4 + i * 0.9);
    
    marchingCubes.addBall(x, y, z, 0.1, 12);
  }
}
```

### Procedural Terrain
```javascript
function generateTerrain(width, depth, resolution) {
  const geometry = new THREE.PlaneGeometry(width, depth, resolution, resolution);
  const positions = geometry.attributes.position.array;
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    
    // Multi-octave noise
    let height = 0;
    let amplitude = 1;
    let frequency = 0.02;
    
    for (let octave = 0; octave < 6; octave++) {
      height += amplitude * noise2D(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    positions[i + 2] = height * 10;
  }
  
  geometry.computeVertexNormals();
  return geometry;
}

// Simple 2D noise
function noise2D(x, y) {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  
  x -= Math.floor(x);
  y -= Math.floor(y);
  
  const u = fade(x);
  const v = fade(y);
  
  const A = p[X] + Y;
  const B = p[X + 1] + Y;
  
  return lerp(v,
    lerp(u, grad(p[A], x, y), grad(p[B], x - 1, y)),
    lerp(u, grad(p[A + 1], x, y - 1), grad(p[B + 1], x - 1, y - 1))
  );
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(t, a, b) { return a + t * (b - a); }
```

### L-Systems (Plants)
```javascript
class LSystem {
  constructor(axiom, rules, angle = 25) {
    this.axiom = axiom;
    this.rules = rules;
    this.angle = angle * Math.PI / 180;
  }
  
  generate(iterations) {
    let result = this.axiom;
    for (let i = 0; i < iterations; i++) {
      result = result.split('').map(char => 
        this.rules[char] || char
      ).join('');
    }
    return result;
  }
  
  draw(instructions) {
    const points = [];
    const stack = [];
    
    let position = new THREE.Vector3(0, 0, 0);
    let direction = new THREE.Vector3(0, 1, 0);
    let right = new THREE.Vector3(1, 0, 0);
    
    for (const char of instructions) {
      switch (char) {
        case 'F':
          const newPos = position.clone().add(direction.clone().multiplyScalar(0.1));
          points.push(position.clone(), newPos.clone());
          position = newPos;
          break;
        case '+':
          direction.applyAxisAngle(right, this.angle);
          break;
        case '-':
          direction.applyAxisAngle(right, -this.angle);
          break;
        case '[':
          stack.push({
            position: position.clone(),
            direction: direction.clone()
          });
          break;
        case ']':
          const state = stack.pop();
          position = state.position;
          direction = state.direction;
          break;
      }
    }
    
    return points;
  }
}

// Tree example
const tree = new LSystem('X', {
  'X': 'F+[[X]-X]-F[-FX]+X',
  'F': 'FF'
}, 25);

const instructions = tree.generate(5);
const points = tree.draw(instructions);

const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0x8b4513 });
const lines = new THREE.LineSegments(geometry, material);
```

### Circle Packing
```javascript
class CirclePacker {
  constructor(width, height) {
    this.circles = [];
    this.width = width;
    this.height = height;
  }
  
  addCircle(minRadius = 5, maxRadius = 50) {
    for (let attempts = 0; attempts < 1000; attempts++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      
      let maxR = maxRadius;
      
      // Distance to other circles
      for (const c of this.circles) {
        const d = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2);
        maxR = Math.min(maxR, d - c.r);
      }
      
      // Distance to bounds
      maxR = Math.min(maxR, x, y, this.width - x, this.height - y);
      
      if (maxR > minRadius) {
        this.circles.push({ x, y, r: maxR });
        return true;
      }
    }
    return false;
  }
  
  pack(count) {
    for (let i = 0; i < count; i++) {
      if (!this.addCircle()) break;
    }
    return this.circles;
  }
}
```

## Resources
- **GPGPU**: https://threejs.org/examples/?q=gpgpu
- **Bruno Simon Particles**: https://threejs-journey.com/lessons/particles
- **Daniel Shiffman**: https://thecodingtrain.com
- **L-Systems**: https://paulbourke.net/fractals/lsys/
