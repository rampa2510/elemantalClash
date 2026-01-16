# GLSL Noise Functions

## Noise Types Comparison

| Type | Dimensions | Performance | Use Case |
|------|------------|-------------|----------|
| **Value Noise** | 1D-4D | Fast | Basic randomness |
| **Perlin Noise** | 2D-4D | Medium | Organic textures |
| **Simplex Noise** | 2D-4D | Fast | Better quality, fewer artifacts |
| **Worley/Cellular** | 2D-3D | Slow | Voronoi, cell patterns |
| **Curl Noise** | 2D-3D | Medium | Fluid flow, particles |

---

## Hash Functions (Foundation)

```glsl
// 1D Hash
float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

// 2D Hash
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// 2D to 2D Hash
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)),
           dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// 3D Hash
vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Integer hash (better distribution)
uint hash(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352dU;
  x ^= x >> 15;
  x *= 0x846ca68bU;
  x ^= x >> 16;
  return x;
}
```

---

## Value Noise

```glsl
// 2D Value Noise
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  // Smoothstep interpolation
  f = f * f * (3.0 - 2.0 * f);
  
  // Corner values
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  // Bilinear interpolation
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 3D Value Noise
float valueNoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
```

---

## Perlin Noise (Gradient Noise)

```glsl
// 2D Perlin Noise
float perlin(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  // Quintic interpolation (smoother than cubic)
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  // Gradients at corners
  float a = dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0));
  float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 3D Perlin Noise
float perlin(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  
  return mix(
    mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
}
```

---

## Simplex Noise

```glsl
// 2D Simplex Noise (Stefan Gustavson)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float simplex(vec2 v) {
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  
  // First corner
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  
  // Other corners
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  
  // Permutations
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                         + i.x + vec3(0.0, i1.x, 1.0));
  
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  
  // Gradients
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  
  // Compute final noise value
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  
  return 130.0 * dot(m, g);
}
```

---

## Fractal Brownian Motion (FBM)

```glsl
// Standard FBM
float fbm(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  float lacunarity = 2.0;   // Frequency multiplier
  float persistence = 0.5;  // Amplitude multiplier
  
  for (int i = 0; i < octaves; i++) {
    value += amplitude * simplex(p * frequency);
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return value;
}

// Ridged FBM (mountains, veins)
float ridgedFBM(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  float prev = 1.0;
  
  for (int i = 0; i < octaves; i++) {
    float n = 1.0 - abs(simplex(p * frequency));
    n = n * n;
    value += n * amplitude * prev;
    prev = n;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value;
}

// Turbulence (absolute value noise)
float turbulence(vec2 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < octaves; i++) {
    value += amplitude * abs(simplex(p * frequency));
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value;
}

// Domain Warping
float warpedFBM(vec2 p, int octaves) {
  vec2 q = vec2(fbm(p, octaves), fbm(p + vec2(5.2, 1.3), octaves));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2), octaves),
                fbm(p + 4.0 * q + vec2(8.3, 2.8), octaves));
  return fbm(p + 4.0 * r, octaves);
}
```

---

## Worley/Cellular Noise

```glsl
// 2D Worley Noise
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float minDist = 1.0;
  
  // Check 3x3 neighborhood
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      
      // Animate points
      // point = 0.5 + 0.5 * sin(time + 6.2831 * point);
      
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      minDist = min(minDist, dist);
    }
  }
  
  return minDist;
}

// Worley with F1 and F2 (for patterns)
vec2 worley2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float F1 = 1.0;
  float F2 = 1.0;
  
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      vec2 diff = neighbor + point - f;
      float dist = dot(diff, diff); // Squared distance
      
      if (dist < F1) {
        F2 = F1;
        F1 = dist;
      } else if (dist < F2) {
        F2 = dist;
      }
    }
  }
  
  return vec2(sqrt(F1), sqrt(F2));
}

// Edge pattern from Worley
float worleyEdges(vec2 p) {
  vec2 F = worley2(p);
  return F.y - F.x; // Difference creates edges
}
```

---

## Curl Noise (Divergence-Free)

```glsl
// Curl Noise for fluid-like motion
vec3 curlNoise(vec3 p) {
  const float e = 0.0001;
  
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);
  
  float n1 = perlin(p + dy) - perlin(p - dy);
  float n2 = perlin(p + dz) - perlin(p - dz);
  float n3 = perlin(p + dx) - perlin(p - dx);
  float n4 = perlin(p + dz) - perlin(p - dz);
  float n5 = perlin(p + dx) - perlin(p - dx);
  float n6 = perlin(p + dy) - perlin(p - dy);
  
  return normalize(vec3(n1 - n2, n3 - n4, n5 - n6));
}

// 2D Curl (returns vec2)
vec2 curlNoise2D(vec2 p) {
  const float e = 0.01;
  
  float n1 = perlin(vec2(p.x, p.y + e));
  float n2 = perlin(vec2(p.x, p.y - e));
  float n3 = perlin(vec2(p.x + e, p.y));
  float n4 = perlin(vec2(p.x - e, p.y));
  
  float dx = (n1 - n2) / (2.0 * e);
  float dy = (n3 - n4) / (2.0 * e);
  
  return vec2(dx, -dy);
}
```

---

## Voronoi Patterns

```glsl
// Voronoi with cell ID
vec3 voronoi(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float minDist = 1.0;
  vec2 minPoint = vec2(0.0);
  vec2 minCell = vec2(0.0);
  
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      
      if (dist < minDist) {
        minDist = dist;
        minPoint = point;
        minCell = i + neighbor;
      }
    }
  }
  
  // Return: distance, cell x, cell y
  return vec3(minDist, minCell);
}

// Smooth Voronoi (blended cells)
float smoothVoronoi(vec2 p, float smoothness) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  
  float res = 0.0;
  
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash2(i + neighbor);
      vec2 diff = neighbor + point - f;
      float dist = length(diff);
      
      res += exp(-smoothness * dist);
    }
  }
  
  return -log(res) / smoothness;
}
```

---

## Shaping Functions

```glsl
// Smoothstep (built-in, but for reference)
float smoothstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

// Smoother step (Ken Perlin)
float smootherstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

// Remap value
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

// Pulse function
float pulse(float edge0, float edge1, float x) {
  return step(edge0, x) - step(edge1, x);
}

// Circular easing
float circularIn(float t) { return 1.0 - sqrt(1.0 - t * t); }
float circularOut(float t) { return sqrt(1.0 - (t - 1.0) * (t - 1.0)); }

// Exponential easing
float exponentialIn(float t) { return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0)); }
float exponentialOut(float t) { return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t); }

// Gain function (contrast control)
float gain(float x, float k) {
  float a = 0.5 * pow(2.0 * ((x < 0.5) ? x : 1.0 - x), k);
  return (x < 0.5) ? a : 1.0 - a;
}

// Bias function
float bias(float x, float b) {
  return pow(x, log(b) / log(0.5));
}
```

---

## JavaScript Noise Libraries

### gl-noise (npm)

```javascript
import { Perlin, Simplex, Voronoi, patchShaders } from 'gl-noise';

const fragmentShader = await patchShaders(`
  void main() {
    float n = gln_perlin(vUv * 10.0);
    gl_FragColor = vec4(vec3(n), 1.0);
  }
`, [Perlin]);
```

### simplex-noise (npm)

```javascript
import { createNoise2D, createNoise3D, createNoise4D } from 'simplex-noise';

const noise2D = createNoise2D();
const noise3D = createNoise3D();
const noise4D = createNoise4D();

// Returns values in range [-1, 1]
const value = noise2D(x * 0.01, y * 0.01);
const value3D = noise3D(x, y, time);
```

### webgl-noise (stegu/ashima)

```glsl
// Include in shader
// https://github.com/stegu/webgl-noise

// 2D Simplex
float snoise(vec2 v);

// 3D Simplex
float snoise(vec3 v);

// 4D Simplex
float snoise(vec4 v);
```

---

## Practical Examples

### Terrain Height Map

```glsl
float terrainHeight(vec2 p) {
  float height = 0.0;
  
  // Base terrain with ridges
  height += ridgedFBM(p * 0.5, 6) * 0.5;
  
  // Detail noise
  height += fbm(p * 2.0, 4) * 0.25;
  
  // Erosion-like detail
  height -= turbulence(p * 4.0, 3) * 0.1;
  
  return height;
}
```

### Water Caustics

```glsl
float caustics(vec2 p, float time) {
  vec2 c1 = p + vec2(sin(time * 0.5), cos(time * 0.3));
  vec2 c2 = p + vec2(sin(time * 0.7 + 1.0), cos(time * 0.4 + 2.0));
  
  float v1 = worley(c1 * 3.0);
  float v2 = worley(c2 * 3.0);
  
  return pow(v1 * v2, 2.0) * 4.0;
}
```

### Cloud Density

```glsl
float cloudDensity(vec3 p, float time) {
  float density = 0.0;
  
  // Base shape
  density += fbm(p + vec3(time * 0.1, 0.0, 0.0), 4);
  
  // Detail
  density += fbm(p * 2.0, 3) * 0.5;
  
  // Wispy edges
  density -= turbulence(p * 4.0, 2) * 0.3;
  
  return max(0.0, density);
}
```

### Organic Displacement

```glsl
vec3 organicDisplacement(vec3 position, float time) {
  float n1 = simplex(position * 2.0 + time * 0.5);
  float n2 = simplex(position * 4.0 - time * 0.3);
  float n3 = simplex(position * 8.0 + time * 0.7);
  
  return normal * (n1 * 0.5 + n2 * 0.25 + n3 * 0.125);
}
```
