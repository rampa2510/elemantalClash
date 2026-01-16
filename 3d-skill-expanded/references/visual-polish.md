# Visual Polish Reference

## Professional Lighting

### Image-Based Lighting (IBL) Setup

The single most impactful upgrade for visual quality:

```javascript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

// Initialize PMREM generator
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load HDR environment
async function setupEnvironment(hdrPath) {
  return new Promise((resolve, reject) => {
    new RGBELoader()
      .setDataType(THREE.HalfFloatType)
      .load(hdrPath, (texture) => {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        
        // Apply to scene
        scene.environment = envMap;  // Affects all PBR materials
        scene.background = envMap;   // Optional: use as background
        
        // Optional: blur background
        scene.backgroundBlurriness = 0.5;
        scene.backgroundIntensity = 0.8;
        
        // Cleanup
        texture.dispose();
        pmremGenerator.dispose();
        
        resolve(envMap);
      }, undefined, reject);
  });
}

// Free HDR resources:
// - Poly Haven: polyhaven.com/hdris
// - HDRIHaven: hdrihaven.com
// - ambientCG: ambientcg.com
```

### Three-Point Lighting Setup

For product shots and hero objects:

```javascript
function createThreePointLighting() {
  const lights = new THREE.Group();
  
  // Key light - main illumination
  const keyLight = new THREE.DirectionalLight(0xffffff, 2);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.setScalar(2048);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.bias = -0.0001;
  lights.add(keyLight);
  
  // Fill light - soften shadows
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-5, 3, 0);
  lights.add(fillLight);
  
  // Rim light - edge definition
  const rimLight = new THREE.DirectionalLight(0xffffff, 1);
  rimLight.position.set(0, 3, -5);
  lights.add(rimLight);
  
  // Ambient - fill in dark areas
  const ambient = new THREE.AmbientLight(0xffffff, 0.2);
  lights.add(ambient);
  
  return lights;
}
```

### Area Lights for Soft Illumination

```javascript
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Initialize (required once)
RectAreaLightUniformsLib.init();

// Create soft area light
const rectLight = new THREE.RectAreaLight(0xffffff, 5, 4, 4);
rectLight.position.set(0, 5, 5);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);

// Helper for visualization (remove in production)
const helper = new RectAreaLightHelper(rectLight);
rectLight.add(helper);
```

## Premium Materials

### MeshPhysicalMaterial Showcase

```javascript
// Glossy metal (chrome, steel)
const chromeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 1.0,
  roughness: 0.05,
  envMapIntensity: 1.5
});

// Brushed metal
const brushedMetal = new THREE.MeshPhysicalMaterial({
  color: 0xcccccc,
  metalness: 1.0,
  roughness: 0.3,
  envMapIntensity: 1.0
});

// Glass
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0,
  transmission: 1.0,
  thickness: 0.5,
  ior: 1.5,           // Index of refraction
  envMapIntensity: 1.0
});

// Frosted glass
const frostedGlass = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0,
  roughness: 0.3,
  transmission: 0.9,
  thickness: 0.5,
  ior: 1.45
});

// Car paint (clearcoat)
const carPaint = new THREE.MeshPhysicalMaterial({
  color: 0x0055ff,
  metalness: 0.9,
  roughness: 0.5,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  envMapIntensity: 1.2
});

// Fabric/velvet (sheen)
const velvet = new THREE.MeshPhysicalMaterial({
  color: 0x880044,
  metalness: 0,
  roughness: 0.8,
  sheen: 1.0,
  sheenRoughness: 0.5,
  sheenColor: new THREE.Color(0xff6699)
});

// Iridescent (soap bubble)
const iridescent = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.9,
  roughness: 0.1,
  iridescence: 1.0,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400]
});

// Subsurface scattering approximation (skin, wax)
const wax = new THREE.MeshPhysicalMaterial({
  color: 0xffddcc,
  metalness: 0,
  roughness: 0.6,
  transmission: 0.1,
  thickness: 2.0
});
```

### Texture Maps Best Practices

```javascript
const textureLoader = new THREE.TextureLoader();

// Color/Albedo map - use sRGB
const colorMap = textureLoader.load('color.jpg');
colorMap.colorSpace = THREE.SRGBColorSpace;

// Normal map - use Linear
const normalMap = textureLoader.load('normal.jpg');
normalMap.colorSpace = THREE.LinearSRGBColorSpace;

// Roughness/Metalness/AO - use Linear
const roughnessMap = textureLoader.load('roughness.jpg');
roughnessMap.colorSpace = THREE.LinearSRGBColorSpace;

// Enable anisotropic filtering for quality
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
colorMap.anisotropy = maxAnisotropy;

// Proper wrapping
colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;

// Apply to material
const material = new THREE.MeshPhysicalMaterial({
  map: colorMap,
  normalMap: normalMap,
  roughnessMap: roughnessMap,
  normalScale: new THREE.Vector2(1, 1)
});
```

## Tone Mapping

### Comparison

```javascript
// No tone mapping - values > 1 clip to white (bad for HDR)
renderer.toneMapping = THREE.NoToneMapping;

// Linear - simple clamping
renderer.toneMapping = THREE.LinearToneMapping;

// Reinhard - based on photography, preserves detail
renderer.toneMapping = THREE.ReinhardToneMapping;

// Cinematic (ACES) - film industry standard, desaturates highlights
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Recommended

// AgX (Blender 4.0 default) - preserves colors, modern choice
renderer.toneMapping = THREE.AgXToneMapping;

// Neutral - balanced option
renderer.toneMapping = THREE.NeutralToneMapping;

// Adjust exposure
renderer.toneMappingExposure = 1.0; // 0.5 = darker, 2.0 = brighter
```

## Post-Processing

### Complete Cinematic Stack

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

function createCinematicComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  const size = new THREE.Vector2();
  renderer.getSize(size);
  
  // 1. Base render pass
  composer.addPass(new RenderPass(scene, camera));
  
  // 2. Selective bloom
  const bloomPass = new UnrealBloomPass(size, 0.5, 0.4, 0.85);
  composer.addPass(bloomPass);
  
  // 3. Chromatic aberration
  const chromaticAberration = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.003 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      varying vec2 vUv;
      
      void main() {
        vec2 dir = vUv - 0.5;
        float dist = length(dir);
        vec2 offset = dir * dist * amount;
        
        float r = texture2D(tDiffuse, vUv + offset).r;
        float g = texture2D(tDiffuse, vUv).g;
        float b = texture2D(tDiffuse, vUv - offset).b;
        
        gl_FragColor = vec4(r, g, b, 1.0);
      }
    `
  });
  composer.addPass(chromaticAberration);
  
  // 4. Vignette
  const vignette = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      darkness: { value: 0.5 },
      offset: { value: 1.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float darkness;
      uniform float offset;
      varying vec2 vUv;
      
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        float dist = length(vUv - 0.5);
        float vig = smoothstep(0.8, offset * 0.4, dist * (darkness + offset));
        color.rgb *= vig;
        gl_FragColor = color;
      }
    `
  });
  composer.addPass(vignette);
  
  // 5. Film grain
  const grain = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      amount: { value: 0.02 },
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float amount;
      uniform float time;
      varying vec2 vUv;
      
      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }
      
      void main() {
        vec4 color = texture2D(tDiffuse, vUv);
        float noise = (rand(vUv + time) - 0.5) * amount;
        color.rgb += noise;
        gl_FragColor = color;
      }
    `
  });
  composer.addPass(grain);
  
  // 6. SMAA anti-aliasing
  const smaaPass = new SMAAPass(size.x, size.y);
  composer.addPass(smaaPass);
  
  // Update function
  return {
    composer,
    render: () => composer.render(),
    update: (time) => {
      grain.uniforms.time.value = time;
    },
    resize: (width, height) => {
      composer.setSize(width, height);
      bloomPass.resolution.set(width, height);
      smaaPass.setSize(width, height);
    }
  };
}
```

### Selective Bloom

Only bloom specific objects:

```javascript
// Layer setup
const BLOOM_LAYER = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);

// Add objects to bloom layer
glowingMesh.layers.enable(BLOOM_LAYER);

// Dark material for non-blooming objects during bloom pass
const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const materials = {};

function darkenNonBlooming(obj) {
  if (obj.isMesh && !bloomLayer.test(obj.layers)) {
    materials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}

function restoreMaterials(obj) {
  if (materials[obj.uuid]) {
    obj.material = materials[obj.uuid];
    delete materials[obj.uuid];
  }
}

// Custom render for selective bloom
function renderSelectiveBloom() {
  // Render bloom objects only
  scene.traverse(darkenNonBlooming);
  bloomComposer.render();
  scene.traverse(restoreMaterials);
  
  // Render final scene with bloom
  finalComposer.render();
}
```

## Shadow Quality

### Optimal Shadow Settings

```javascript
// Renderer shadow setup
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

// Directional light shadow
const light = new THREE.DirectionalLight(0xffffff, 1);
light.castShadow = true;

// Shadow map resolution (higher = sharper but more expensive)
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;

// Shadow camera bounds (tighter = better quality)
light.shadow.camera.left = -10;
light.shadow.camera.right = 10;
light.shadow.camera.top = 10;
light.shadow.camera.bottom = -10;
light.shadow.camera.near = 0.1;
light.shadow.camera.far = 50;

// Prevent shadow acne
light.shadow.bias = -0.0001;
light.shadow.normalBias = 0.02;

// Visualize shadow camera (debug)
const helper = new THREE.CameraHelper(light.shadow.camera);
scene.add(helper);
```

### Contact Shadows (Soft Ground Shadows)

```javascript
// Using drei's ContactShadows in R3F
<ContactShadows
  position={[0, -0.99, 0]}
  opacity={0.5}
  scale={10}
  blur={2}
  far={4}
  resolution={256}
  color="#000000"
/>

// Manual implementation
function createContactShadow(size = 10, resolution = 512) {
  const shadowGroup = new THREE.Group();
  
  // Shadow camera looking down
  const shadowCamera = new THREE.OrthographicCamera(
    -size/2, size/2, size/2, -size/2, 0, 10
  );
  shadowCamera.position.y = 5;
  shadowCamera.lookAt(0, 0, 0);
  
  // Render target for shadow
  const shadowTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
    format: THREE.RGBAFormat
  });
  
  // Shadow plane
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({
      map: shadowTarget.texture,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowGroup.add(shadowPlane);
  
  return {
    group: shadowGroup,
    update: (scene, renderer) => {
      // Render scene from above to shadow target
      renderer.setRenderTarget(shadowTarget);
      renderer.render(scene, shadowCamera);
      renderer.setRenderTarget(null);
    }
  };
}
```

## Color Grading

### LUT (Look-Up Table) Application

```javascript
import { LUTPass } from 'three/addons/postprocessing/LUTPass.js';
import { LUTCubeLoader } from 'three/addons/loaders/LUTCubeLoader.js';

// Load LUT
const lutLoader = new LUTCubeLoader();
lutLoader.load('cinematic.cube', (result) => {
  const lutPass = new LUTPass({
    lut: result.texture3D,
    intensity: 1.0
  });
  composer.addPass(lutPass);
});

// Free LUTs: https://www.freepresets.com/product/free-luts-cinematic/
```

### Custom Color Grading Shader

```javascript
const colorGrading = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },     // -1 to 1
    contrast: { value: 1.0 },       // 0 to 2
    saturation: { value: 1.0 },     // 0 to 2
    temperature: { value: 0.0 },    // -1 (cool) to 1 (warm)
    tint: { value: 0.0 }            // -1 (green) to 1 (magenta)
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float temperature;
    uniform float tint;
    varying vec2 vUv;
    
    vec3 adjustSaturation(vec3 color, float sat) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(gray), color, sat);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Brightness
      color.rgb += brightness;
      
      // Contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      
      // Saturation
      color.rgb = adjustSaturation(color.rgb, saturation);
      
      // Temperature (warm/cool)
      color.r += temperature * 0.1;
      color.b -= temperature * 0.1;
      
      // Tint (green/magenta)
      color.g -= tint * 0.1;
      
      gl_FragColor = color;
    }
  `
});
composer.addPass(colorGrading);
```

## Anti-Aliasing Comparison

```javascript
// Built-in MSAA (doesn't work with post-processing)
const renderer = new THREE.WebGLRenderer({ antialias: true });

// FXAA - Fast, slightly blurry
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms.resolution.value.set(1/width, 1/height);

// SMAA - Better quality, recommended
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
const smaaPass = new SMAAPass(width, height);

// TAA - Temporal, reduces flickering (needs velocity buffer)
// Best for static or slow-moving scenes
```
