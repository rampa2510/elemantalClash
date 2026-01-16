# Cutting-Edge Techniques

## 3D Gaussian Splatting

### Overview
3D Gaussian Splatting (3DGS) is a revolutionary technique for real-time radiance field rendering, achieving ≥100 fps at 1080p resolution.

```
Traditional NeRF:
├─ Neural network per scene
├─ Slow training (hours/days)
├─ Slow rendering (seconds per frame)
└─ High quality but impractical

3D Gaussian Splatting:
├─ Explicit primitive representation
├─ Fast training (minutes)
├─ Real-time rendering (100+ fps)
└─ State-of-the-art quality
```

### How It Works
1. **Input**: Sparse point cloud from Structure from Motion (SfM)
2. **Representation**: 3D Gaussians with position, covariance, opacity, spherical harmonics
3. **Optimization**: Gradient descent on differentiable rasterization
4. **Rendering**: Fast alpha-blending with depth sorting

### GaussianSplats3D (Three.js)

```javascript
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

const viewer = new GaussianSplats3D.Viewer({
  cameraUp: [0, -1, -0.6],
  initialCameraPosition: [-1, -4, 6],
  initialCameraLookAt: [0, 4, 0]
});

viewer.init();

viewer.loadFile('scene.splat', {
  splatAlphaRemovalThreshold: 5,
  halfPrecisionCovariancesOnGPU: true,
  sphericalHarmonicsDegree: 2
}).then(() => {
  viewer.start();
});
```

### Spark.js (Three.js Integration)

```javascript
import * as THREE from 'three';
import { SplatMesh } from '@sparkjsdev/spark';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

const splat = new SplatMesh({ url: 'scene.spz' });
scene.add(splat);

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
```

### gsplat.js (Hugging Face)

```javascript
import * as SPLAT from 'gsplat';

const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const renderer = new SPLAT.WebGLRenderer();
const controls = new SPLAT.OrbitControls(camera, renderer.canvas);

async function main() {
  await SPLAT.Loader.LoadAsync(url, scene, () => {});
  
  const frame = () => {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
```

### File Formats

| Format | Size | Quality | Features |
|--------|------|---------|----------|
| `.ply` | Large | Full | Original format, all SH coefficients |
| `.splat` | Medium | Good | Compressed, common web format |
| `.ksplat` | Small | Good | 16-bit compression |
| `.spz` | Smallest | Good | Highly compressed |
| `.sog` | Smallest | Good | PlayCanvas SOG format (WebP-like) |

### Capture Services
- **Luma AI**: https://lumalabs.ai
- **Polycam**: https://poly.cam
- **SuperSplat**: https://superspl.at/editor (browser-based editor)

---

## GPU-Driven Rendering

### Traditional vs GPU-Driven

```
Traditional Pipeline:
CPU: Cull → Sort → Bind → Draw → Bind → Draw → ...
     ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
GPU: Wait... Execute... Wait... Execute...

GPU-Driven Pipeline:
CPU: Upload scene data → Single indirect draw
     ↓
GPU: Cull → Sort → Draw (all in parallel)
```

### Benefits
1. **Reduced CPU overhead**: Scene with 100,000 objects = 1 draw call
2. **GPU culling**: Frustum/occlusion culling in compute shader
3. **Dynamic LOD**: GPU selects appropriate detail level
4. **Massive parallelism**: All culling happens simultaneously

### Indirect Drawing Concept

```javascript
// Traditional: CPU specifies each draw
renderer.render(mesh1); // Draw call 1
renderer.render(mesh2); // Draw call 2
renderer.render(mesh3); // Draw call 3

// GPU-Driven: GPU buffer contains draw commands
// Single drawIndirect reads params from buffer
// GPU compute shader populates buffer with visible objects
```

---

## Mesh Shaders (Next-Gen Pipeline)

### Pipeline Comparison

```
Traditional Pipeline:
Input Assembly → Vertex Shader → [Tessellation] → [Geometry] → Rasterizer

Mesh Shader Pipeline:
Task Shader (optional) → Mesh Shader → Rasterizer
     ↓                        ↓
Coarse culling           Fine culling + vertex processing
```

### WebGPU Support Status (2024-2025)
- Chrome: Experimental flag
- WGSL: Mesh shader proposal in progress
- Three.js: Not yet supported (planned for WebGPU renderer)

---

## Game Engine Techniques for Web

### Nanite (Virtualized Geometry) Concepts
UE5's Nanite streams geometry at pixel level:
- No manual LOD creation needed
- Web equivalent: Progressive meshes + dynamic tessellation

### Lumen (Global Illumination) Key Techniques

```javascript
// Surface Cache concept for web
class SurfaceCache {
  constructor(resolution = 256) {
    this.albedoAtlas = new THREE.DataTexture(...);
    this.normalAtlas = new THREE.DataTexture(...);
    this.positionAtlas = new THREE.DataTexture(...);
  }
  
  captureMesh(mesh, directions = 6) {
    // Render mesh to atlas from each direction
    // Store material properties for ray tracing
  }
  
  sampleIndirectLighting(position, normal) {
    // Fast lookup instead of ray tracing
  }
}
```

### Screen Space Global Illumination (SSGI)

```glsl
vec3 SSGI(vec2 uv, vec3 normal, sampler2D colorBuffer, sampler2D depthBuffer) {
  vec3 indirectLight = vec3(0.0);
  const int samples = 8;
  
  for (int i = 0; i < samples; i++) {
    vec3 sampleDir = cosineWeightedDirection(normal, i);
    vec2 sampleUV = screenSpaceMarch(uv, sampleDir, depthBuffer);
    
    if (sampleUV.x >= 0.0) {
      indirectLight += texture(colorBuffer, sampleUV).rgb;
    }
  }
  
  return indirectLight / float(samples);
}
```

---

## Google Filament PBR Reference

### Cook-Torrance BRDF (Filament Implementation)

```glsl
vec3 BRDF(vec3 v, vec3 l, vec3 n, vec3 baseColor, float roughness, float metallic) {
  vec3 h = normalize(v + l);
  float NoV = abs(dot(n, v)) + 1e-5;
  float NoL = clamp(dot(n, l), 0.0, 1.0);
  float NoH = clamp(dot(n, h), 0.0, 1.0);
  float LoH = clamp(dot(l, h), 0.0, 1.0);
  
  // Diffuse
  vec3 diffuseColor = (1.0 - metallic) * baseColor;
  vec3 diffuse = diffuseColor / PI;
  
  // Specular
  float D = D_GGX(NoH, roughness);
  float V = V_SmithGGXCorrelated(NoV, NoL, roughness);
  vec3 F0 = mix(vec3(0.04), baseColor, metallic);
  vec3 F = F_Schlick(LoH, F0);
  
  vec3 specular = (D * V) * F;
  
  return (diffuse + specular) * NoL;
}

// GGX Normal Distribution
float D_GGX(float NoH, float roughness) {
  float a = NoH * roughness;
  float k = roughness / (1.0 - NoH * NoH + a * a);
  return k * k * (1.0 / PI);
}

// Height-Correlated Smith G
float V_SmithGGXCorrelated(float NoV, float NoL, float roughness) {
  float a2 = roughness * roughness;
  float GGXV = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float GGXL = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / (GGXV + GGXL);
}
```

---

## SIGGRAPH Advances in Real-Time Rendering

### GTAO (Ground Truth Ambient Occlusion)

```glsl
uniform sampler2D depthTexture;
uniform sampler2D normalTexture;
uniform vec2 resolution;

float GTAO(vec2 uv) {
  vec3 viewPos = getViewPosition(uv);
  vec3 viewNormal = texture(normalTexture, uv).xyz;
  
  float ao = 0.0;
  const int directions = 4;
  const int steps = 4;
  
  for (int d = 0; d < directions; d++) {
    float angle = (float(d) / float(directions)) * PI * 2.0;
    vec2 dir = vec2(cos(angle), sin(angle));
    
    float horizonCos = -1.0;
    
    for (int s = 1; s <= steps; s++) {
      vec2 sampleUV = uv + dir * float(s) * (1.0 / resolution);
      vec3 samplePos = getViewPosition(sampleUV);
      vec3 sampleDir = samplePos - viewPos;
      
      float sampleCos = dot(normalize(sampleDir), viewNormal);
      horizonCos = max(horizonCos, sampleCos);
    }
    
    ao += 1.0 - horizonCos;
  }
  
  return ao / float(directions);
}
```

### Temporal Anti-Aliasing (TAA)

```glsl
uniform sampler2D currentFrame;
uniform sampler2D historyFrame;
uniform sampler2D velocityBuffer;

vec4 TAA(vec2 uv) {
  vec2 velocity = texture(velocityBuffer, uv).xy;
  vec2 historyUV = uv - velocity;
  
  vec4 current = texture(currentFrame, uv);
  vec4 history = texture(historyFrame, historyUV);
  
  // Neighborhood clamping
  vec4 minColor = vec4(1.0);
  vec4 maxColor = vec4(0.0);
  
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec4 neighbor = texture(currentFrame, uv + vec2(x, y) / resolution);
      minColor = min(minColor, neighbor);
      maxColor = max(maxColor, neighbor);
    }
  }
  
  history = clamp(history, minColor, maxColor);
  
  return mix(history, current, 0.1);
}
```

### ReSTIR (Reservoir-based Spatiotemporal Importance Resampling)
NVIDIA's breakthrough for many-light rendering:
- Enables thousands of dynamic lights
- Used in Cyberpunk 2077, Alan Wake 2
- Web implementation: Simplified version possible with WebGPU compute

### Epic Games MegaLights (2025)
Stochastic direct lighting system:
- Thousands of shadowed area lights
- Scalable from mobile to high-end
- Key insight: Importance sampling + temporal reuse

---

## Visual Shader Editors

### NodeToy
- **URL**: https://nodetoy.co
- **Features**: 150+ nodes, real-time preview, community sharing
- **Export**: GLSL, Three.js ShaderMaterial, React Three Fiber

```javascript
import { NodeToyMaterial } from '@nodetoy/three-nodetoy';

const material = new NodeToyMaterial({
  url: 'https://draft.nodetoy.co/your-shader-id'
});
```

### ShaderFrog
- **URL**: https://shaderfrog.com
- **Features**: Pre-built shaders, compositing, Three.js export

---

## LYGIA Shader Library

Cross-platform shader library (GLSL, HLSL, Metal, WGSL).

### Installation

```bash
npm install lygia
# Or CDN: https://lygia.xyz/resolve.js
```

### Usage in Three.js

```javascript
import { resolveLygia } from 'lygia';

const fragmentShader = resolveLygia(`
  #include "lygia/math/decimation.glsl"
  #include "lygia/color/space/rgb2hsl.glsl"
  #include "lygia/filter/gaussianBlur.glsl"
  
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  varying vec2 vUv;
  
  void main() {
    vec2 pixel = 1.0 / uResolution;
    vec4 color = gaussianBlur(uTexture, vUv, pixel, 9);
    vec3 hsl = rgb2hsl(color.rgb);
    hsl.z = decimation(hsl.z, 8.0);
    gl_FragColor = vec4(hsl2rgb(hsl), color.a);
  }
`);
```

### Key Categories

```glsl
// Math
#include "lygia/math/const.glsl"     // PI, TAU, PHI, E
#include "lygia/math/saturate.glsl"  // clamp(x, 0, 1)
#include "lygia/math/rotate2d.glsl"  // 2D rotation matrix

// Color
#include "lygia/color/luma.glsl"
#include "lygia/color/saturation.glsl"
#include "lygia/color/blend.glsl"

// Filter
#include "lygia/filter/gaussianBlur.glsl"
#include "lygia/filter/bilateral2D.glsl"
#include "lygia/filter/kuwahara.glsl"

// Generative
#include "lygia/generative/snoise.glsl"
#include "lygia/generative/voronoi.glsl"
#include "lygia/generative/fbm.glsl"

// Lighting
#include "lygia/lighting/pbr.glsl"
#include "lygia/lighting/envmap.glsl"

// SDF
#include "lygia/sdf/circleSDF.glsl"
#include "lygia/sdf/opSmoothUnion.glsl"
```

---

## MathBox (Math Visualization)

Library for presentation-quality math diagrams by Steven Wittens.

```javascript
import MathBox from 'mathbox';

const mathbox = MathBox.mathBox({
  plugins: ['core', 'controls', 'cursor'],
  controls: { klass: THREE.OrbitControls }
});

const view = mathbox
  .cartesian({
    range: [[-2, 2], [-2, 2], [-2, 2]],
    scale: [1, 1, 1]
  });

// Parametric surface (Möbius strip)
view
  .area({
    width: 64,
    height: 64,
    axes: [1, 3],
    expr: (emit, x, y, i, j, time) => {
      const u = x * Math.PI;
      const v = y * 0.5;
      const cosu = Math.cos(u);
      const sinu = Math.sin(u);
      
      emit(
        (1 + v * cosu / 2) * Math.cos(u),
        (1 + v * cosu / 2) * Math.sin(u),
        v * sinu / 2
      );
    }
  })
  .surface({
    color: 0x3090ff,
    shaded: true
  });
```

### Key Features
- Declarative graph definition
- Automatic transitions between views
- 4D data support
- CSS-like selection and styling
