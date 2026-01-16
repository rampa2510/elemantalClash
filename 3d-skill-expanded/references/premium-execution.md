# Premium Execution Patterns

> This is the most important reference file. It contains the patterns that separate award-winning sites from amateur implementations.

## The Professional Difference

Award-winning studios don't use better technology—they use the same Three.js everyone has. Their advantage is **systematic excellence**:

1. **Proprietary frameworks** encoding years of lessons (Hydra, Jelly)
2. **Pre-calculated simulations** blended in real-time
3. **Centralized asset management** with proper disposal
4. **Comprehensive edge case handling**
5. **Device-adaptive quality tiers**

## Animation Architecture

### The Proxy Object Pattern (Critical)

Never animate Three.js objects directly with GSAP. Use proxy objects:

```javascript
// ✅ CORRECT: Proxy object pattern
const animationState = {
  rotation: 0,
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
  cameraZ: 5
};

gsap.timeline({
  scrollTrigger: {
    trigger: '.scroll-container',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate: () => {
      // Apply proxy values to Three.js objects
      mesh.rotation.y = animationState.rotation;
      mesh.position.set(
        animationState.position.x,
        animationState.position.y,
        animationState.position.z
      );
      mesh.scale.setScalar(animationState.scale);
      camera.position.z = animationState.cameraZ;
      
      // Render only when values change
      renderer.render(scene, camera);
    }
  }
})
.to(animationState, { rotation: Math.PI * 2 }, 0)
.to(animationState.position, { y: 2 }, 0.3)
.to(animationState, { scale: 1.5, cameraZ: 3 }, 0.5);
```

### State Machine for Complex Sequences

Use XState or a simple state machine for predictable animation flow:

```javascript
class AnimationStateMachine {
  constructor() {
    this.states = {
      idle: {
        enter: () => this.playIdleAnimation(),
        transitions: { scroll: 'revealing', click: 'interactive' }
      },
      revealing: {
        enter: () => this.playRevealAnimation(),
        transitions: { complete: 'active', scrollBack: 'idle' }
      },
      active: {
        enter: () => this.playActiveAnimation(),
        transitions: { scroll: 'transforming' }
      },
      transforming: {
        enter: () => this.playTransformAnimation(),
        transitions: { complete: 'finale' }
      }
    };
    this.currentState = 'idle';
  }
  
  transition(event) {
    const current = this.states[this.currentState];
    const nextState = current.transitions[event];
    
    if (nextState && this.states[nextState]) {
      this.currentState = nextState;
      this.states[nextState].enter();
    }
  }
}
```

### Multi-Element Coordination

Orchestrate particles, geometry, UI, and camera together:

```javascript
class SceneOrchestrator {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    // Coordinated animation state
    this.state = {
      progress: 0,        // Master timeline progress 0-1
      cameraPath: null,   // CatmullRomCurve3 for camera
      elements: []        // All animated elements
    };
  }
  
  // Register elements with their animation ranges
  registerElement(element, { startProgress, endProgress, animation }) {
    this.state.elements.push({
      element,
      startProgress,
      endProgress,
      animation,  // Function that takes local progress 0-1
      active: false
    });
  }
  
  // Update all elements based on master progress
  update(masterProgress) {
    this.state.progress = masterProgress;
    
    // Update camera along path
    if (this.state.cameraPath) {
      const point = this.state.cameraPath.getPoint(masterProgress);
      const tangent = this.state.cameraPath.getTangent(masterProgress);
      this.camera.position.copy(point);
      this.camera.lookAt(point.clone().add(tangent));
    }
    
    // Update each element within its range
    this.state.elements.forEach(item => {
      if (masterProgress >= item.startProgress && masterProgress <= item.endProgress) {
        const localProgress = (masterProgress - item.startProgress) / 
                             (item.endProgress - item.startProgress);
        item.animation(localProgress);
        item.active = true;
      } else {
        item.active = false;
      }
    });
    
    this.renderer.render(this.scene, this.camera);
  }
}

// Usage with GSAP ScrollTrigger
const orchestrator = new SceneOrchestrator(scene, camera, renderer);

// Register elements with staggered timing
orchestrator.registerElement(heroMesh, {
  startProgress: 0,
  endProgress: 0.3,
  animation: (p) => {
    heroMesh.position.y = THREE.MathUtils.lerp(-5, 0, easeOutCubic(p));
    heroMesh.material.opacity = p;
  }
});

orchestrator.registerElement(particles, {
  startProgress: 0.2,
  endProgress: 0.6,
  animation: (p) => {
    particleMaterial.uniforms.uProgress.value = p;
  }
});

orchestrator.registerElement(uiElements, {
  startProgress: 0.5,
  endProgress: 0.8,
  animation: (p) => {
    uiGroup.children.forEach((el, i) => {
      const stagger = i * 0.1;
      const localP = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)));
      el.material.opacity = localP;
      el.position.y = THREE.MathUtils.lerp(-0.5, 0, easeOutCubic(localP));
    });
  }
});

// Connect to scroll
gsap.to({ progress: 0 }, {
  progress: 1,
  ease: 'none',
  scrollTrigger: {
    trigger: 'body',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1
  },
  onUpdate: function() {
    orchestrator.update(this.targets()[0].progress);
  }
});
```

## Premium Visual Quality

### Environment-Based Lighting (IBL)

The single most impactful upgrade for visual quality:

```javascript
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load HDR environment
new RGBELoader()
  .setPath('/textures/hdr/')
  .load('studio_small_08_1k.hdr', (texture) => {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    
    // Apply to scene (affects all PBR materials automatically)
    scene.environment = envMap;
    
    // Optional: use as background too
    scene.background = envMap;
    scene.backgroundBlurriness = 0.5; // Blur background
    scene.backgroundIntensity = 0.8;
    
    // Clean up
    texture.dispose();
    pmremGenerator.dispose();
  });
```

### Premium Material Setup

```javascript
// Hero object material - maximum quality
const premiumMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  
  // Metalness/Roughness
  metalness: 0.9,
  roughness: 0.1,
  
  // Environment map intensity
  envMapIntensity: 1.2,
  
  // Clearcoat (car paint effect)
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
  
  // For glass/liquid
  // transmission: 1.0,
  // thickness: 0.5,
  // ior: 1.5,
  
  // For fabric
  // sheen: 1.0,
  // sheenRoughness: 0.5,
  // sheenColor: new THREE.Color(0x8888ff),
});

// Ensure proper color space for textures
const textureLoader = new THREE.TextureLoader();
const colorMap = textureLoader.load('albedo.jpg');
colorMap.colorSpace = THREE.SRGBColorSpace; // For color textures

const normalMap = textureLoader.load('normal.jpg');
normalMap.colorSpace = THREE.LinearSRGBColorSpace; // For data textures
```

### Tone Mapping Configuration

```javascript
// Renderer setup
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic
// renderer.toneMapping = THREE.AgXToneMapping;     // Preserves colors better
// renderer.toneMapping = THREE.NeutralToneMapping; // Balanced

renderer.toneMappingExposure = 1.0; // Adjust 0.5-2.0

// For different moods:
// Bright, airy: exposure 1.2-1.5
// Moody, dramatic: exposure 0.7-0.9
// Neutral: exposure 1.0
```

### Cinematic Post-Processing Stack

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const composer = new EffectComposer(renderer);

// 1. Base render
composer.addPass(new RenderPass(scene, camera));

// 2. Bloom (subtle - high threshold)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.5,   // strength (0.3-0.8 for subtle)
  0.4,   // radius
  0.85   // threshold (0.8-0.95 for selective bloom)
);
composer.addPass(bloomPass);

// 3. Vignette (custom shader)
const vignetteShader = {
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
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(0.8, offset * 0.5, dist * (darkness + offset));
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `
};
composer.addPass(new ShaderPass(vignetteShader));

// 4. Film grain (subtle)
const grainShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.03 },
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
    
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = random(vUv + time) * amount;
      color.rgb += grain - amount * 0.5;
      gl_FragColor = color;
    }
  `
};
const grainPass = new ShaderPass(grainShader);
composer.addPass(grainPass);

// 5. Anti-aliasing (SMAA - better than FXAA)
const smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
composer.addPass(smaaPass);

// Update grain time in animation loop
function animate() {
  grainPass.uniforms.time.value = performance.now() * 0.001;
  composer.render();
}
```

## Glitch-Free Animation

### Delta Time for Consistent Speed

```javascript
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  // ✅ Consistent across all frame rates
  mesh.rotation.y += rotationSpeed * delta;
  
  // ✅ For shader uniforms
  material.uniforms.uTime.value = elapsed;
  
  // ✅ For physics
  world.step(delta);
  
  // ✅ For animation mixer
  mixer.update(delta);
  
  composer.render();
}
```

### Prevent Animation Jump After Tab Switch

```javascript
const clock = new THREE.Clock();
let isVisible = true;

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    isVisible = false;
    clock.stop();
  } else {
    isVisible = true;
    clock.start();
    // Reset delta to prevent jump
    clock.getDelta(); // Consume accumulated time
  }
});

function animate() {
  requestAnimationFrame(animate);
  
  if (!isVisible) return;
  
  const delta = Math.min(clock.getDelta(), 0.1); // Cap delta to prevent huge jumps
  // ... rest of animation
}
```

### Smooth Interpolation (Lerping)

```javascript
// Target values (can be set by input/scroll)
const target = { x: 0, y: 0, rotation: 0 };

// Current values (smoothly interpolate toward target)
const current = { x: 0, y: 0, rotation: 0 };

// Smoothing factor (0.05-0.15 typical)
const smoothing = 0.08;

function animate() {
  requestAnimationFrame(animate);
  
  // Smooth lerp toward target
  current.x += (target.x - current.x) * smoothing;
  current.y += (target.y - current.y) * smoothing;
  current.rotation += (target.rotation - current.rotation) * smoothing;
  
  // Apply to mesh
  mesh.position.x = current.x;
  mesh.position.y = current.y;
  mesh.rotation.y = current.rotation;
  
  renderer.render(scene, camera);
}

// Mouse/scroll sets target, animation smoothly follows
window.addEventListener('mousemove', (e) => {
  target.x = (e.clientX / window.innerWidth - 0.5) * 2;
  target.y = -(e.clientY / window.innerHeight - 0.5) * 2;
});
```

### Easing Functions

```javascript
// Common easing functions
const ease = {
  // Smooth start
  inQuad: t => t * t,
  inCubic: t => t * t * t,
  inQuart: t => t * t * t * t,
  
  // Smooth end
  outQuad: t => t * (2 - t),
  outCubic: t => (--t) * t * t + 1,
  outQuart: t => 1 - (--t) * t * t * t,
  
  // Smooth start and end
  inOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Elastic
  outElastic: t => {
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  
  // Back (overshoot)
  outBack: t => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },
  
  // Exponential
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
};

// Usage
const progress = 0.5;
const easedProgress = ease.outCubic(progress);
mesh.position.y = THREE.MathUtils.lerp(startY, endY, easedProgress);
```

## Bold Creative Patterns

### Full-Page 3D Takeover

```javascript
// Canvas fills entire viewport, behind content
const canvas = document.getElementById('webgl');
canvas.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
`;

// Content floats above
document.querySelector('.content').style.cssText = `
  position: relative;
  z-index: 1;
`;

// Map DOM elements to 3D space
function syncDOMto3D(domElement, mesh) {
  const rect = domElement.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth * 2 - 1;
  const y = -(rect.top + rect.height / 2) / window.innerHeight * 2 + 1;
  
  // Convert screen coords to world coords
  const vector = new THREE.Vector3(x, y, 0.5);
  vector.unproject(camera);
  
  const dir = vector.sub(camera.position).normalize();
  const distance = -camera.position.z / dir.z;
  const pos = camera.position.clone().add(dir.multiplyScalar(distance));
  
  mesh.position.copy(pos);
}
```

### Scroll-Driven Scene Transformation

```javascript
// Complete scene transformation based on scroll
const sections = [
  { 
    name: 'hero',
    range: [0, 0.25],
    camera: { position: [0, 0, 10], target: [0, 0, 0] },
    lighting: { intensity: 1.0, color: 0xffffff },
    fog: { near: 10, far: 50, color: 0x000000 }
  },
  {
    name: 'features',
    range: [0.25, 0.5],
    camera: { position: [5, 2, 8], target: [0, 1, 0] },
    lighting: { intensity: 0.8, color: 0xffeedd },
    fog: { near: 5, far: 30, color: 0x111122 }
  },
  {
    name: 'showcase',
    range: [0.5, 0.75],
    camera: { position: [-3, 4, 6], target: [0, 2, 0] },
    lighting: { intensity: 1.2, color: 0xddffff },
    fog: { near: 8, far: 40, color: 0x001122 }
  },
  {
    name: 'finale',
    range: [0.75, 1.0],
    camera: { position: [0, 1, 5], target: [0, 0, 0] },
    lighting: { intensity: 0.6, color: 0xff8866 },
    fog: { near: 3, far: 20, color: 0x220000 }
  }
];

function updateScene(scrollProgress) {
  // Find current and next section
  let current, next, localProgress;
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (scrollProgress >= section.range[0] && scrollProgress <= section.range[1]) {
      current = section;
      next = sections[i + 1] || section;
      localProgress = (scrollProgress - section.range[0]) / 
                     (section.range[1] - section.range[0]);
      break;
    }
  }
  
  if (!current) return;
  
  // Interpolate camera
  camera.position.lerpVectors(
    new THREE.Vector3(...current.camera.position),
    new THREE.Vector3(...next.camera.position),
    ease.inOutCubic(localProgress)
  );
  
  // Interpolate lighting
  const currentColor = new THREE.Color(current.lighting.color);
  const nextColor = new THREE.Color(next.lighting.color);
  mainLight.color.lerpColors(currentColor, nextColor, localProgress);
  mainLight.intensity = THREE.MathUtils.lerp(
    current.lighting.intensity,
    next.lighting.intensity,
    localProgress
  );
  
  // Interpolate fog
  scene.fog.near = THREE.MathUtils.lerp(current.fog.near, next.fog.near, localProgress);
  scene.fog.far = THREE.MathUtils.lerp(current.fog.far, next.fog.far, localProgress);
  scene.fog.color.lerpColors(
    new THREE.Color(current.fog.color),
    new THREE.Color(next.fog.color),
    localProgress
  );
}
```

### Immersive Loading Experience

```javascript
class ImmersiveLoader {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.progress = 0;
    this.loadingScene = new THREE.Scene();
    this.isLoading = true;
    
    this.createLoadingExperience();
  }
  
  createLoadingExperience() {
    // Create loading visuals that are themselves impressive
    const geometry = new THREE.IcosahedronGeometry(1, 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4488ff,
      metalness: 0.9,
      roughness: 0.1,
      wireframe: true
    });
    
    this.loadingMesh = new THREE.Mesh(geometry, material);
    this.loadingScene.add(this.loadingMesh);
    
    // Particles that form as loading progresses
    this.createLoadingParticles();
  }
  
  createLoadingParticles() {
    const count = 1000;
    const positions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      // Start at center, will expand outward
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      randoms[i] = Math.random();
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float aRandom;
        uniform float uProgress;
        uniform float uTime;
        varying float vAlpha;
        
        void main() {
          // Particles expand outward as loading progresses
          float angle = aRandom * 3.14159 * 2.0;
          float radius = uProgress * 3.0 * aRandom;
          
          vec3 pos = position;
          pos.x = cos(angle + uTime * 0.5) * radius;
          pos.y = sin(angle * 2.0 + uTime * 0.3) * radius * 0.5;
          pos.z = sin(angle + uTime * 0.5) * radius;
          
          vAlpha = uProgress * (1.0 - aRandom * 0.5);
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = 3.0 * (1.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        
        void main() {
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(0.3, 0.6, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false
    });
    
    this.particles = new THREE.Points(geometry, this.particleMaterial);
    this.loadingScene.add(this.particles);
  }
  
  updateProgress(progress) {
    this.progress = progress;
    this.particleMaterial.uniforms.uProgress.value = progress;
    
    // Scale loading mesh based on progress
    const scale = 0.5 + progress * 0.5;
    this.loadingMesh.scale.setScalar(scale);
    
    // Rotate faster as loading completes
    this.loadingMesh.rotation.y += 0.01 + progress * 0.02;
    this.loadingMesh.rotation.x += 0.005 + progress * 0.01;
  }
  
  animate(time) {
    if (!this.isLoading) return;
    
    this.particleMaterial.uniforms.uTime.value = time;
    this.renderer.render(this.loadingScene, this.camera);
  }
  
  async transitionToMain() {
    // Dramatic transition from loading to main scene
    return new Promise(resolve => {
      gsap.to(this.loadingMesh.scale, {
        x: 0, y: 0, z: 0,
        duration: 0.8,
        ease: 'back.in(2)'
      });
      
      gsap.to(this.particleMaterial.uniforms.uProgress, {
        value: 0,
        duration: 1,
        ease: 'power2.in',
        onComplete: () => {
          this.isLoading = false;
          resolve();
        }
      });
    });
  }
}
```

## Device-Adaptive Quality

```javascript
class QualityManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.tier = this.detectTier();
    this.config = this.getConfig();
  }
  
  detectTier() {
    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const gpuRenderer = debugInfo ? 
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    // Check for known low-end GPUs
    const isLowEnd = /Mali|Adreno [34]|Intel HD [456]/i.test(gpuRenderer);
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    
    if (isLowEnd || hasLowMemory) return 'low';
    if (isMobile) return 'medium';
    return 'high';
  }
  
  getConfig() {
    const configs = {
      low: {
        pixelRatio: 1,
        shadowMapSize: 512,
        shadows: false,
        postProcessing: false,
        particleCount: 1000,
        geometryDetail: 16,
        antiAliasing: false,
        envMapResolution: 128
      },
      medium: {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        shadowMapSize: 1024,
        shadows: true,
        postProcessing: true,
        particleCount: 5000,
        geometryDetail: 32,
        antiAliasing: true,
        envMapResolution: 256
      },
      high: {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadowMapSize: 2048,
        shadows: true,
        postProcessing: true,
        particleCount: 20000,
        geometryDetail: 64,
        antiAliasing: true,
        envMapResolution: 512
      }
    };
    
    return configs[this.tier];
  }
  
  apply() {
    const config = this.config;
    
    this.renderer.setPixelRatio(config.pixelRatio);
    this.renderer.shadowMap.enabled = config.shadows;
    
    if (config.shadows) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    return config;
  }
}

// Usage
const quality = new QualityManager(renderer);
const config = quality.apply();

// Use config values when creating objects
const geometry = new THREE.SphereGeometry(1, config.geometryDetail, config.geometryDetail);
const particles = createParticles(config.particleCount);
```

## Memory Management

```javascript
class ResourceTracker {
  constructor() {
    this.resources = new Set();
  }
  
  track(resource) {
    if (resource.dispose || resource.geometry || resource.material) {
      this.resources.add(resource);
    }
    return resource;
  }
  
  untrack(resource) {
    this.resources.delete(resource);
  }
  
  dispose() {
    for (const resource of this.resources) {
      if (resource.geometry) {
        resource.geometry.dispose();
      }
      
      if (resource.material) {
        if (Array.isArray(resource.material)) {
          resource.material.forEach(m => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(resource.material);
        }
      }
      
      if (resource.dispose) {
        resource.dispose();
      }
    }
    
    this.resources.clear();
  }
  
  disposeMaterial(material) {
    // Dispose all textures
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    }
    material.dispose();
  }
}

// Usage
const tracker = new ResourceTracker();

const geometry = tracker.track(new THREE.BoxGeometry());
const material = tracker.track(new THREE.MeshStandardMaterial());
const mesh = tracker.track(new THREE.Mesh(geometry, material));

// Clean up
tracker.dispose();
```
