# Shaders, SDFs & Raymarching Reference

## SDF Primitives (Inigo Quilez)

```glsl
// Sphere
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

// Box
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Rounded Box
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

// Torus
float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}

// Capsule
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Cylinder
float sdCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Plane
float sdPlane(vec3 p, vec3 n, float h) {
  return dot(p, n) + h;
}

// Cone
float sdCone(vec3 p, vec2 c, float h) {
  vec2 q = h * vec2(c.x / c.y, -1.0);
  vec2 w = vec2(length(p.xz), p.y);
  vec2 a = w - q * clamp(dot(w, q) / dot(q, q), 0.0, 1.0);
  vec2 b = w - q * vec2(clamp(w.x / q.x, 0.0, 1.0), 1.0);
  float k = sign(q.y);
  float d = min(dot(a, a), dot(b, b));
  float s = max(k * (w.x * q.y - w.y * q.x), k * (w.y - q.y));
  return sqrt(d) * sign(s);
}
```

## CSG Operations

```glsl
// Boolean Operations
float opUnion(float d1, float d2) { return min(d1, d2); }
float opSubtraction(float d1, float d2) { return max(-d1, d2); }
float opIntersection(float d1, float d2) { return max(d1, d2); }

// Smooth Minimum (Polynomial) - KEY TO METABALLS
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Smooth Maximum
float smax(float a, float b, float k) {
  float h = clamp(0.5 - 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) + k * h * (1.0 - h);
}

// Smooth Subtraction
float opSmoothSubtraction(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}
```

## Domain Operations

```glsl
// Infinite Repetition
vec3 opRep(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}

// Limited Repetition
vec3 opRepLim(vec3 p, float c, vec3 l) {
  return p - c * clamp(round(p / c), -l, l);
}

// Twist
vec3 opTwist(vec3 p, float k) {
  float c = cos(k * p.y);
  float s = sin(k * p.y);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xz, p.y);
}

// Bend
vec3 opBend(vec3 p, float k) {
  float c = cos(k * p.x);
  float s = sin(k * p.x);
  mat2 m = mat2(c, -s, s, c);
  return vec3(m * p.xy, p.z);
}

// Displacement
float opDisplacement(vec3 p, float d1) {
  float d2 = sin(20.0 * p.x) * sin(20.0 * p.y) * sin(20.0 * p.z);
  return d1 + d2 * 0.1;
}

// Onion (hollow shell)
float opOnion(float d, float thickness) {
  return abs(d) - thickness;
}
```

## Raymarching Implementation

```glsl
#define MAX_STEPS 100
#define MAX_DIST 100.0
#define SURF_DIST 0.001

float scene(vec3 p) {
  float sphere = sdSphere(p - vec3(0, 1, 0), 1.0);
  float plane = sdPlane(p, vec3(0, 1, 0), 0.0);
  return opUnion(sphere, plane);
}

vec3 getNormal(vec3 p) {
  float d = scene(p);
  vec2 e = vec2(0.001, 0);
  vec3 n = d - vec3(
    scene(p - e.xyy),
    scene(p - e.yxy),
    scene(p - e.yyx)
  );
  return normalize(n);
}

float raymarch(vec3 ro, vec3 rd) {
  float dO = 0.0;
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * dO;
    float dS = scene(p);
    dO += dS;
    if (dO > MAX_DIST || dS < SURF_DIST) break;
  }
  return dO;
}

// Soft shadows
float softShadow(vec3 ro, vec3 rd, float mint, float maxt, float k) {
  float res = 1.0;
  float t = mint;
  for (int i = 0; i < 64; i++) {
    float h = scene(ro + rd * t);
    res = min(res, k * h / t);
    t += clamp(h, 0.02, 0.10);
    if (h < 0.001 || t > maxt) break;
  }
  return clamp(res, 0.0, 1.0);
}

// Ambient Occlusion
float calcAO(vec3 pos, vec3 nor) {
  float occ = 0.0;
  float sca = 1.0;
  for (int i = 0; i < 5; i++) {
    float h = 0.01 + 0.12 * float(i) / 4.0;
    float d = scene(pos + h * nor);
    occ += (h - d) * sca;
    sca *= 0.95;
  }
  return clamp(1.0 - 3.0 * occ, 0.0, 1.0);
}
```

## Noise Functions

```glsl
// Hash function (base for all noise)
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 hash3(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
           dot(p, vec3(269.5, 183.3, 246.1)),
           dot(p, vec3(113.5, 271.9, 124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Value Noise 2D
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smoothstep
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Perlin Noise 3D
float perlin(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  return mix(
    mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x), f.y),
    mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x), f.y), f.z);
}

// Fractal Brownian Motion
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < octaves; i++) {
    value += amplitude * perlin(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Curl Noise (divergence-free for fluids)
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

// Worley/Cellular Noise
float worley(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float minDist = 1.0;
  
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 point = hash(i + neighbor) * 0.5 + 0.5;
      float d = length(neighbor + point - f);
      minDist = min(minDist, d);
    }
  }
  return minDist;
}
```

## Lighting Models

```glsl
// Phong Lighting
vec3 phongLighting(vec3 p, vec3 n, vec3 lightPos, vec3 viewPos) {
  vec3 lightDir = normalize(lightPos - p);
  vec3 viewDir = normalize(viewPos - p);
  vec3 reflectDir = reflect(-lightDir, n);
  
  float ambient = 0.1;
  float diffuse = max(dot(n, lightDir), 0.0);
  float specular = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  
  return vec3(ambient + diffuse + specular * 0.5);
}

// PBR Cook-Torrance
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  
  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = 3.14159265 * denom * denom;
  
  return num / denom;
}

float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
```

## Color Utilities

```glsl
// HSL to RGB
vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

// Palette (Inigo Quilez)
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// ACES Tone Mapping
vec3 ACESFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Gamma Correction
vec3 gammaCorrect(vec3 color) {
  return pow(color, vec3(1.0 / 2.2));
}
```

## Resources
- **Inigo Quilez**: https://iquilezles.org/articles/distfunctions/
- **hg_sdf**: https://mercury.sexy/hg_sdf/
- **Book of Shaders**: https://thebookofshaders.com/11/
- **LYGIA**: https://lygia.xyz
- **gl-noise**: https://github.com/FarazzShaikh/glNoise
- **webgl-noise**: https://github.com/stegu/webgl-noise
