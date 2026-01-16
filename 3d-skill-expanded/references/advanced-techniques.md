# Advanced Three.js Techniques

## Custom Shader Materials (onBeforeCompile)

### Extending Built-in Materials

```javascript
// Extend MeshStandardMaterial with custom effects
const material = new THREE.MeshStandardMaterial({
  color: 0x00ff00,
  roughness: 0.5
});

material.onBeforeCompile = (shader) => {
  // Add custom uniforms
  shader.uniforms.uTime = { value: 0 };
  shader.uniforms.uNoiseScale = { value: 0.5 };
  
  // Inject code into vertex shader
  shader.vertexShader = shader.vertexShader.replace(
    '#include <common>',
    `
    #include <common>
    uniform float uTime;
    uniform float uNoiseScale;
    
    // Simplex noise (include your noise function)
    float snoise(vec3 v) { /* ... */ return 0.0; }
    `
  );
  
  shader.vertexShader = shader.vertexShader.replace(
    '#include <begin_vertex>',
    `
    #include <begin_vertex>
    
    // Displace vertices with noise
    float noise = snoise(position * uNoiseScale + uTime);
    transformed += normal * noise * 0.2;
    `
  );
  
  // Store reference for animation
  material.userData.shader = shader;
};

// Update in render loop
function animate() {
  if (material.userData.shader) {
    material.userData.shader.uniforms.uTime.value = performance.now() * 0.001;
  }
}
```

### Injection Points Reference

| Chunk | Purpose | Use For |
|-------|---------|---------|
| `<common>` | Add uniforms/functions | Custom noise, utilities |
| `<begin_vertex>` | Modify position | Vertex displacement |
| `<beginnormal_vertex>` | Modify normal | Normal distortion |
| `<color_fragment>` | Modify color | Custom coloring |
| `<emissivemap_fragment>` | Modify emission | Glow effects |
| `<fog_fragment>` | Modify fog | Custom fog |

---

## three-custom-shader-material (CSM) Library

```javascript
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

const material = new CustomShaderMaterial({
  baseMaterial: THREE.MeshPhysicalMaterial,
  
  vertexShader: `
    uniform float uTime;
    
    void main() {
      // CSM provides csm_Position, csm_Normal, etc.
      vec3 pos = position;
      pos.y += sin(pos.x * 5.0 + uTime) * 0.2;
      csm_Position = pos;
    }
  `,
  
  fragmentShader: `
    uniform float uTime;
    
    void main() {
      vec3 color = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), sin(uTime));
      csm_DiffuseColor = vec4(color, 1.0);
    }
  `,
  
  uniforms: {
    uTime: { value: 0 }
  },
  
  // Material properties
  metalness: 0.0,
  roughness: 0.3,
  transmission: 0.5
});
```

### CSM Output Variables

| Variable | Purpose |
|----------|---------|
| `csm_Position` | World position |
| `csm_Normal` | Surface normal |
| `csm_DiffuseColor` | Base color (vec4) |
| `csm_Roughness` | Roughness (float) |
| `csm_Metalness` | Metalness (float) |
| `csm_Emissive` | Emission (vec3) |
| `csm_AO` | Ambient occlusion |

---

## Advanced Lighting

### RectAreaLight Setup

```javascript
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';

// REQUIRED: Initialize uniforms before use
RectAreaLightUniformsLib.init();

const rectLight = new THREE.RectAreaLight(0xffffff, 5, 10, 10);
rectLight.position.set(5, 5, 0);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);

// Helper for visualization
const helper = new RectAreaLightHelper(rectLight);
rectLight.add(helper);

// NOTE: Only works with MeshStandardMaterial and MeshPhysicalMaterial
```

### Light Probes

```javascript
import { LightProbeGenerator } from 'three/examples/jsm/lights/LightProbeGenerator.js';

// Generate from cube texture (environment map)
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
const cubeCamera = new THREE.CubeCamera(0.1, 1000, cubeRenderTarget);

// Render environment
cubeCamera.update(renderer, scene);

// Create light probe
const lightProbe = new THREE.LightProbe();
lightProbe.copy(LightProbeGenerator.fromCubeRenderTarget(renderer, cubeRenderTarget));
scene.add(lightProbe);

// Adjust intensity
lightProbe.intensity = 1.0;
```

### Cascaded Shadow Maps (CSM)

```javascript
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { CSMHelper } from 'three/examples/jsm/csm/CSMHelper.js';

const csm = new CSM({
  maxFar: camera.far,
  cascades: 4,
  shadowMapSize: 2048,
  lightDirection: new THREE.Vector3(-1, -1, -1).normalize(),
  camera: camera,
  parent: scene,
  mode: 'practical'  // 'uniform', 'logarithmic', 'practical', 'custom'
});

// Apply to materials
scene.traverse((object) => {
  if (object.isMesh && object.material) {
    csm.setupMaterial(object.material);
  }
});

// Update in render loop
function animate() {
  csm.update();
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  csm.updateFrustums();
});
```

---

## Multiple Render Targets (MRT) / Deferred Rendering

```javascript
// Create MRT with multiple textures
const renderTarget = new THREE.WebGLMultipleRenderTargets(
  window.innerWidth,
  window.innerHeight,
  3  // Number of render targets
);

// Configure each texture
renderTarget.texture[0].name = 'diffuse';
renderTarget.texture[0].format = THREE.RGBAFormat;
renderTarget.texture[0].type = THREE.UnsignedByteType;

renderTarget.texture[1].name = 'normal';
renderTarget.texture[1].format = THREE.RGBAFormat;
renderTarget.texture[1].type = THREE.FloatType;

renderTarget.texture[2].name = 'position';
renderTarget.texture[2].format = THREE.RGBAFormat;
renderTarget.texture[2].type = THREE.FloatType;

// G-Buffer shader (WebGL2 GLSL 3.0)
const gBufferShader = {
  vertexShader: `#version 300 es
    in vec3 position;
    in vec3 normal;
    in vec2 uv;
    
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform mat3 normalMatrix;
    
    out vec3 vNormal;
    out vec3 vPosition;
    out vec2 vUv;
    
    void main() {
      vNormal = normalMatrix * normal;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vPosition = mvPosition.xyz;
      vUv = uv;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  
  fragmentShader: `#version 300 es
    precision highp float;
    
    in vec3 vNormal;
    in vec3 vPosition;
    in vec2 vUv;
    
    layout(location = 0) out vec4 gDiffuse;
    layout(location = 1) out vec4 gNormal;
    layout(location = 2) out vec4 gPosition;
    
    uniform sampler2D uDiffuseMap;
    
    void main() {
      gDiffuse = texture(uDiffuseMap, vUv);
      gNormal = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);
      gPosition = vec4(vPosition, 1.0);
    }
  `
};

// Render to MRT
renderer.setRenderTarget(renderTarget);
renderer.render(gBufferScene, camera);

// Use textures in lighting pass
lightingMaterial.uniforms.tDiffuse.value = renderTarget.texture[0];
lightingMaterial.uniforms.tNormal.value = renderTarget.texture[1];
lightingMaterial.uniforms.tPosition.value = renderTarget.texture[2];

renderer.setRenderTarget(null);
renderer.render(lightingScene, camera);
```

---

## Water & Caustics

### MeshTransmissionMaterial (Drei)

```jsx
import { MeshTransmissionMaterial } from '@react-three/drei';

function GlassObject() {
  return (
    <mesh>
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <MeshTransmissionMaterial
        backside
        samples={16}
        resolution={512}
        transmission={1}
        roughness={0}
        thickness={0.5}
        ior={1.5}
        chromaticAberration={0.06}
        anisotropy={0.1}
        distortion={0.0}
        distortionScale={0.3}
        temporalDistortion={0.5}
        clearcoat={1}
        attenuationDistance={0.5}
        attenuationColor="#ffffff"
        color="#c9ffa1"
      />
    </mesh>
  );
}
```

### Caustics Shader

```glsl
// Fragment shader for caustic plane
uniform sampler2D uNormalMap;   // Water surface normals
uniform vec3 uLightPosition;
uniform float uCausticStrength;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  // Sample normal from water surface
  vec3 normal = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  
  // Calculate refraction
  vec3 lightDir = normalize(uLightPosition - vWorldPosition);
  vec3 refracted = refract(-lightDir, normal, 1.0 / 1.33); // Water IOR
  
  // Calculate caustic intensity using partial derivatives
  vec2 refractedUV = vUv + refracted.xy * 0.1;
  
  float oldArea = length(dFdx(vUv)) * length(dFdy(vUv));
  float newArea = length(dFdx(refractedUV)) * length(dFdy(refractedUV));
  
  float causticIntensity = oldArea / max(newArea, 0.0001);
  causticIntensity = pow(causticIntensity, 2.0) * uCausticStrength;
  
  // Chromatic aberration
  float r = texture2D(uNormalMap, vUv + refracted.xy * 0.10).r;
  float g = texture2D(uNormalMap, vUv + refracted.xy * 0.11).g;
  float b = texture2D(uNormalMap, vUv + refracted.xy * 0.12).b;
  
  vec3 causticColor = vec3(r, g, b) * causticIntensity;
  
  gl_FragColor = vec4(causticColor, 1.0);
}
```

---

## Volumetric Rendering

### Beer's Law (Light Absorption)

```glsl
// Beer-Lambert Law for light absorption through medium
// I = I0 * exp(-α * d)
// α = absorption coefficient (higher = denser medium)
// d = distance traveled

float beerLambert(float absorption, float distance) {
  return exp(-absorption * distance);
}

// With scattering
vec3 volumetricScatter(vec3 color, float density, float distance) {
  float transmittance = exp(-density * distance);
  vec3 inScattering = (1.0 - transmittance) * color;
  return inScattering;
}
```

### Henyey-Greenstein Phase Function

```glsl
// Anisotropic scattering for realistic clouds/fog
// g: asymmetry factor (-1 to 1)
// g > 0: forward scattering (bright edges)
// g < 0: back scattering
// g = 0: isotropic

float henyeyGreenstein(float cosTheta, float g) {
  float g2 = g * g;
  return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
}

// Schlick approximation (faster)
float schlickPhase(float cosTheta, float g) {
  float k = 1.55 * g - 0.55 * g * g * g;
  float temp = 1.0 + k * cosTheta;
  return (1.0 - k * k) / (4.0 * PI * temp * temp);
}
```

### Volumetric Cloud Raymarching

```glsl
uniform sampler2D uNoiseTexture;

// 3D noise sampling for clouds
float cloudNoise(vec3 p) {
  vec2 uv = p.xz * 0.01 + vec2(37.0, 239.0) * p.y * 0.01;
  return texture2D(uNoiseTexture, uv).r;
}

// FBM for cloud detail
float fbm(vec3 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < 6; i++) {
    value += amplitude * cloudNoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

// Cloud density function
float cloudDensity(vec3 p) {
  float shape = 1.0 - length(p) / 5.0;
  float noise = fbm(p * 0.5);
  return max(0.0, shape + noise * 0.5 - 0.3);
}

// Main volumetric raymarching
vec4 raymarchClouds(vec3 ro, vec3 rd, float maxDist) {
  float stepSize = 0.1;
  int steps = 64;
  
  vec3 accumColor = vec3(0.0);
  float transmittance = 1.0;
  
  for (int i = 0; i < steps; i++) {
    float t = float(i) * stepSize;
    if (t > maxDist || transmittance < 0.01) break;
    
    vec3 p = ro + rd * t;
    float density = cloudDensity(p);
    
    if (density > 0.001) {
      // Light marching for shadows
      float lightAccum = 0.0;
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      
      for (int j = 0; j < 6; j++) {
        vec3 lightPos = p + lightDir * float(j) * 0.5;
        lightAccum += cloudDensity(lightPos);
      }
      
      float shadow = exp(-lightAccum * 0.5);
      float phase = henyeyGreenstein(dot(rd, lightDir), 0.3);
      vec3 scatter = vec3(1.0, 0.95, 0.9) * phase * shadow;
      
      float alpha = 1.0 - exp(-density * stepSize * 0.9);
      accumColor += transmittance * alpha * scatter;
      transmittance *= (1.0 - alpha);
    }
  }
  
  return vec4(accumColor, 1.0 - transmittance);
}
```

### Volumetric Lighting (God Rays) Post-Processing

```javascript
class VolumetricLightEffect extends Effect {
  constructor({ lightPosition, samples = 50, density = 0.96 }) {
    super('VolumetricLight', `
      uniform vec3 uLightPosition;
      uniform float uSamples;
      uniform float uDensity;
      uniform sampler2D uShadowMap;
      uniform mat4 uLightViewProjection;
      
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 lightClip = uLightViewProjection * vec4(uLightPosition, 1.0);
        vec2 lightScreen = (lightClip.xy / lightClip.w) * 0.5 + 0.5;
        
        vec2 deltaUV = (lightScreen - uv) / uSamples;
        vec2 currentUV = uv;
        
        float illuminationDecay = 1.0;
        vec3 accum = vec3(0.0);
        
        for (float i = 0.0; i < uSamples; i++) {
          currentUV += deltaUV;
          float shadow = texture2D(uShadowMap, currentUV).r;
          float inLight = step(0.5, shadow);
          accum += inLight * illuminationDecay;
          illuminationDecay *= uDensity;
        }
        
        accum /= uSamples;
        outputColor = inputColor + vec4(accum * 0.3, 0.0);
      }
    `, {
      uniforms: new Map([
        ['uLightPosition', { value: lightPosition }],
        ['uSamples', { value: samples }],
        ['uDensity', { value: density }]
      ])
    });
  }
}
```

---

## Texture Compression (KTX2 / Basis Universal)

### Compression Methods

| Method | Use Case | Quality | Size |
|--------|----------|---------|------|
| **ETC1S** | Solid colors, non-PBR | Lower | Smallest |
| **UASTC** | Normal maps, ORM, PBR | Higher | Larger |
| **UASTC + Zstd** | Best of both worlds | Highest | Medium |

### CLI Compression Commands

```bash
# Install KTX-Software
npm install -g ktx-software

# ETC1S compression (smaller files)
toktx --t2 --encode etc1s --clevel 4 --qlevel 255 \
  --genmipmap output.ktx2 input.png

# UASTC compression (higher quality)
toktx --t2 --encode uastc --uastc_quality 4 \
  --uastc_rdo_l 0.5 --zcmp 22 \
  --genmipmap output.ktx2 input.png

# UASTC for normal maps (highest quality)
toktx --t2 --encode uastc --uastc_quality 4 \
  --uastc_rdo_l 0.25 --zcmp 22 \
  --genmipmap --assign_oetf linear \
  output_normal.ktx2 input_normal.png
```

### Three.js KTX2 Loading

```javascript
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('path/to/basis/')
  .detectSupport(renderer);

const texture = await ktx2Loader.loadAsync('texture.ktx2');
texture.colorSpace = THREE.SRGBColorSpace;
material.map = texture;
```

### GPU Memory Comparison

```
1024x1024 texture:
├─ PNG (uncompressed in VRAM): 4 MB
├─ JPEG (uncompressed in VRAM): 4 MB
├─ KTX2 ETC1S (compressed): 0.5 MB
├─ KTX2 UASTC (compressed): 1 MB
└─ Savings: 75-87.5%
```
