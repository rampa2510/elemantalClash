# Expert Learning Resources

## Bruno Simon's Three.js Journey

### Course Overview
The most comprehensive Three.js course available (93+ hours, 71 lessons).

**URL**: https://threejs-journey.com

### Curriculum Highlights

**Chapter 1: Basics**
- Scene setup, cameras, geometries
- Materials, textures, transformations
- Debug panels (lil-gui)
- Responsive design
- Deploying to production

**Chapter 2: Classic Techniques**
- Lights (ambient, directional, point, spot, hemisphere, rectarea)
- Shadows (PCF, PCFSoft, VSM)
- Particles (BufferGeometry, Points)
- Raycasting and mouse interactions
- Physics with Cannon.js

**Chapter 3: Advanced Techniques**
- Environment maps and HDR
- Importing models (glTF, FBX)
- Blender modeling fundamentals
- Realistic rendering setup
- Code structuring for large projects

**Chapter 4: Shaders**
- Vertex shaders (geometry manipulation)
- Fragment shaders (pixel coloring)
- Uniforms, varyings, attributes
- Noise functions
- Animated shaders
- Raging sea, galaxy generator

**Chapter 5: Extra**
- Post-processing
- Performance optimization
- Mixing HTML and WebGL
- React Three Fiber integration

### Galaxy Generator Pattern

```javascript
const generateGalaxy = () => {
  const parameters = {
    count: 100000,
    size: 0.01,
    radius: 5,
    branches: 3,
    spin: 1,
    randomness: 0.2,
    randomnessPower: 3,
    insideColor: '#ff6030',
    outsideColor: '#1b3984'
  };
  
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  
  const colorInside = new THREE.Color(parameters.insideColor);
  const colorOutside = new THREE.Color(parameters.outsideColor);
  
  for (let i = 0; i < parameters.count; i++) {
    const i3 = i * 3;
    
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const branchAngle = (i % parameters.branches) / parameters.branches * Math.PI * 2;
    
    const randomX = Math.pow(Math.random(), parameters.randomnessPower) * 
                    (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), parameters.randomnessPower) * 
                    (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomZ = Math.pow(Math.random(), parameters.randomnessPower) * 
                    (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    
    positions[i3    ] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;
    
    const mixedColor = colorInside.clone();
    mixedColor.lerp(colorOutside, radius / parameters.radius);
    
    colors[i3    ] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true
  });
  
  return new THREE.Points(geometry, material);
};
```

---

## SimonDev GLSL Course

### Course Structure
12-section comprehensive shader programming course by ex-Google engineer.

**Platform**: YouTube / Paid course

### Key Topics
1. GLSL Fundamentals - Data types, functions, built-ins
2. Fragment Shader Basics - UV coordinates, color manipulation
3. Shaping Functions - smoothstep, clamp, mix, step
4. 2D SDF Shapes - Circles, rectangles, combinations
5. Noise Functions - Perlin, Simplex, Value noise
6. Procedural Textures - Patterns, grids, organic shapes
7. Post-Processing - Blur, vignette, color grading
8. Lighting Models - Phong, Blinn-Phong, PBR basics
9. Vertex Shaders - Geometry deformation
10. Advanced Effects - Fire, explosions, planets

---

## Maxime Heckel's Blog

**URL**: https://blog.maximeheckel.com

### Article Catalog

**Shader Fundamentals**
- "The Study of Shaders with React Three Fiber" - Complete GLSL intro
- "The magical world of Particles with React Three Fiber" - FBO particles

**Advanced Techniques**
- "Painting with Math: A Gentle Study of Raymarching" - SDF deep dive
- "Real-time dreamy Cloudscapes with Volumetric Raymarching" - Clouds
- "Shining a light on Caustics" - Water caustics implementation
- "Refraction, dispersion, and other shader light effects" - Glass materials

**Post-Processing**
- "Beautiful and mind-bending effects with WebGL Render Targets" - FBO tricks
- "Post-Processing Shaders as a Creative Medium" - Stylized effects

**Latest (2024-2025)**
- "On Shaping Light: Volumetric Lighting" - God rays, shadow mapping
- Config 2025 talk resources

### Maxime's Raymarching Template

```glsl
vec4 raymarch(vec3 ro, vec3 rd) {
  float t = 0.0;
  
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * t;
    float d = scene(p);
    
    if (d < EPSILON) {
      vec3 normal = calcNormal(p);
      vec3 color = shade(p, normal, rd);
      return vec4(color, 1.0);
    }
    
    if (t > MAX_DIST) break;
    t += d;
  }
  
  return vec4(0.0); // Background
}
```

---

## Varun Vachhar's Resources

**URL**: https://varun.ca

### Blog Articles

**Noise & Procedural**
- "Noise in Creative Coding" - Comprehensive noise guide
- "Three ways to create 3D particle effects" - Instancing, GPGPU, shaders

### Flow Field Pattern

```javascript
function createFlowField(width, height, resolution) {
  const field = [];
  
  for (let y = 0; y < height; y += resolution) {
    for (let x = 0; x < width; x += resolution) {
      const angle = noise.simplex2(
        x * frequency,
        y * frequency
      ) * Math.PI * 2;
      
      field.push({
        x, y,
        vx: Math.cos(angle),
        vy: Math.sin(angle)
      });
    }
  }
  
  return field;
}

function updateParticle(particle, field, resolution) {
  const col = Math.floor(particle.x / resolution);
  const row = Math.floor(particle.y / resolution);
  const index = row * cols + col;
  
  const vector = field[index];
  particle.vx += vector.vx * 0.1;
  particle.vy += vector.vy * 0.1;
  particle.x += particle.vx;
  particle.y += particle.vy;
}
```

---

## Steven Wittens (Acko.net)

**URL**: https://acko.net

### Key Articles
- "How to Fold a Julia Fractal" - Complex number visualization
- "Making WebGL Dance" - Conference talk on WebGL animation
- "MathBox²" - Library architecture deep dive

### MathBox Library

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

// Add parametric surface
view
  .area({
    width: 64,
    height: 64,
    axes: [1, 3],
    expr: (emit, x, y, i, j, time) => {
      const z = Math.sin(x * 2 + time) * Math.cos(y * 2 + time);
      emit(x, z, y);
    }
  })
  .surface({
    color: 0x3090ff,
    shaded: true
  });
```

---

## Inigo Quilez (iquilezles.org)

**URL**: https://iquilezles.org

The definitive authority on Signed Distance Functions and raymarching. Co-creator of Shadertoy.

### Essential Articles
- Distance Functions - Complete SDF primitives library
- Smooth Minimum - smin() for organic blending
- Soft Shadows - Penumbra calculation
- Ambient Occlusion - Fast AO approximation
- Normal Estimation - Tetrahedron vs gradient method
- Domain Operations - Repetition, twist, bend

### Reference Pattern

```glsl
// Scene SDF with multiple objects
float scene(vec3 p) {
  float ground = p.y;
  float sphere = sdSphere(p - vec3(0, 1, 0), 1.0);
  float box = sdBox(p - vec3(2, 0.5, 0), vec3(0.5));
  
  // Smooth union
  float d = smin(sphere, box, 0.3);
  d = min(d, ground);
  
  return d;
}
```

---

## YouTube Channels

| Channel | Focus | Best For |
|---------|-------|----------|
| **Yuri Artiukh** | Reverse engineering production sites | Learning to think |
| **Acerola** | Graphics programming deep dives | Game dev techniques |
| **The Coding Train** | Creative coding fundamentals | Beginners |
| **SimonDev** | GLSL, game dev | Methodical learning |
| **Suboptimal Engineer** | Three.js tutorials | Practical projects |

---

## Newsletters

- **Offscreen Canvas** (Daniel Velasquez) - Shader tips and tricks
- **Three.js Journey Updates** - Bruno Simon's course additions
- **Codrops Collective** - Weekly creative web roundup
- **Rendr Weekly** - WebGL/WebGPU news

---

## Reference Sites

| Site | Focus |
|------|-------|
| **iquilezles.org** | SDF bible, 100+ articles |
| **lygia.xyz** | Shader function library |
| **shadertoy.com** | Shader community |
| **thebookofshaders.com** | Free GLSL course |
| **webglfundamentals.org** | WebGL deep dive |
| **webgpufundamentals.org** | WebGPU learning |
| **learnopengl.com** | OpenGL/graphics theory |

---

## Documentation

| Resource | URL |
|----------|-----|
| Three.js Docs | https://threejs.org/docs |
| React Three Fiber | https://docs.pmnd.rs/react-three-fiber |
| Drei | https://github.com/pmndrs/drei |
| TSL Wiki | https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language |
| GLSL Reference | https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf |

---

## Communities

| Community | Platform |
|-----------|----------|
| Three.js Discourse | https://discourse.threejs.org |
| pmndrs Discord | https://discord.gg/poimandres |
| Shader.zone Discord | https://shader.zone |
| WebGPU Matrix | https://matrix.to/#/#WebGPU:matrix.org |
| r/threejs | Reddit |

---

## Books

| Title | Author | Focus |
|-------|--------|-------|
| *Real-Time Rendering* | Akenine-Möller et al. | Graphics theory bible |
| *Physically Based Rendering* | Pharr, Jakob, Humphreys | PBR deep dive |
| *The Book of Shaders* | Patricio Gonzalez Vivo | Free online GLSL |
| *GPU Gems 1-3* | NVIDIA | Classic techniques |
| *Ray Tracing in One Weekend* | Peter Shirley | Free, foundational |

---

## Academic Resources

### SIGGRAPH
- **Advances in Real-Time Rendering**: https://advances.realtimerendering.com
- **YouTube Channel**: https://youtube.com/@AdvancesInRealTimeRendering
- Course notes archive since 2006

### Essential Papers
1. "3D Gaussian Splatting for Real-Time Radiance Field Rendering" (2023)
2. "A Deep Dive into Nanite Virtualized Geometry" (SIGGRAPH 2021)
3. "Global Illumination Based on Surfels" (EA SEED, 2021)
4. "Physically Based Rendering in Filament" (Google, 2018)

---

## Industry Blogs

| Blog | Focus | Notable Content |
|------|-------|-----------------|
| **AMD GPUOpen** | GPU optimization | Work Graphs, Mesh Shaders |
| **NVIDIA Developer** | Ray tracing, AI | ReSTIR, DLSS, neural rendering |
| **Unity Blog** | Cross-platform | HDRP, URP techniques |
| **Unreal Engine Tech Blog** | AAA techniques | Nanite, Lumen deep dives |

---

## Tools & Software

### Debugging
| Tool | Purpose |
|------|---------|
| Spector.js | WebGL call inspection |
| Chrome DevTools | JS profiling, memory |
| r3f-perf | R3F specific metrics |
| RenderDoc | GPU capture |

### Asset Creation
| Tool | Purpose |
|------|---------|
| Blender | 3D modeling, animation |
| Houdini | Procedural, simulations |
| Substance Painter | PBR texturing |
| gltf-transform | glTF optimization |
| KTX-Software | Texture compression |

### Shader Development
| Tool | Purpose |
|------|---------|
| Shadertoy | Live shader coding |
| NodeToy | Visual shader editor |
| ShaderFrog | Shader compositing |
| twigl.app | Minimal playground |
