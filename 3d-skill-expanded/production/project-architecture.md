# Project Architecture for Complex 3D Sites

## Directory Structure

```
project/
├── index.html
├── main.js                 # Entry point
├── src/
│   ├── core/
│   │   ├── Scene.js        # Scene manager
│   │   ├── Renderer.js     # Renderer setup
│   │   ├── Camera.js       # Camera controller
│   │   └── Sizes.js        # Responsive handling
│   ├── world/
│   │   ├── World.js        # World manager
│   │   ├── Environment.js  # Lighting & environment
│   │   └── objects/        # 3D objects
│   │       ├── Hero.js
│   │       ├── Background.js
│   │       └── Particles.js
│   ├── animation/
│   │   ├── AnimationManager.js
│   │   ├── StateMachine.js
│   │   └── ScrollController.js
│   ├── shaders/
│   │   ├── hero/
│   │   │   ├── vertex.glsl
│   │   │   └── fragment.glsl
│   │   └── particles/
│   │       ├── vertex.glsl
│   │       └── fragment.glsl
│   ├── loaders/
│   │   └── AssetLoader.js
│   └── utils/
│       ├── ResourceTracker.js
│       ├── EventEmitter.js
│       └── Debug.js
├── assets/
│   ├── models/
│   ├── textures/
│   └── hdri/
└── styles/
    └── main.css
```

## Core Classes

### Scene Manager

```javascript
// src/core/Scene.js
import * as THREE from 'three';
import { EventEmitter } from '../utils/EventEmitter.js';

export class SceneManager extends EventEmitter {
  constructor() {
    super();
    
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.isRunning = false;
    this.animationId = null;
    
    // Track objects for cleanup
    this.objects = new Map();
  }
  
  add(name, object) {
    this.objects.set(name, object);
    this.scene.add(object);
    return object;
  }
  
  get(name) {
    return this.objects.get(name);
  }
  
  remove(name) {
    const object = this.objects.get(name);
    if (object) {
      this.scene.remove(object);
      this.objects.delete(name);
      this.disposeObject(object);
    }
  }
  
  disposeObject(object) {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => this.disposeMaterial(m));
        } else {
          this.disposeMaterial(child.material);
        }
      }
    });
  }
  
  disposeMaterial(material) {
    for (const key of Object.keys(material)) {
      const value = material[key];
      if (value && value.isTexture) {
        value.dispose();
      }
    }
    material.dispose();
  }
  
  destroy() {
    this.objects.forEach((_, name) => this.remove(name));
    this.objects.clear();
  }
}
```

### Renderer Manager

```javascript
// src/core/Renderer.js
import * as THREE from 'three';

export class RendererManager {
  constructor(canvas, sizes) {
    this.canvas = canvas;
    this.sizes = sizes;
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    
    this.configure();
    this.setupContextHandlers();
  }
  
  configure() {
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
  
  setupContextHandlers() {
    this.canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.onContextLost?.();
    });
    
    this.canvas.addEventListener('webglcontextrestored', () => {
      this.configure();
      this.onContextRestored?.();
    });
  }
  
  resize(width, height) {
    this.renderer.setSize(width, height);
  }
  
  render(scene, camera) {
    this.renderer.render(scene, camera);
  }
  
  dispose() {
    this.renderer.dispose();
  }
}
```

### Sizes Manager (Responsive)

```javascript
// src/core/Sizes.js
import { EventEmitter } from '../utils/EventEmitter.js';

export class Sizes extends EventEmitter {
  constructor() {
    super();
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.aspect = this.width / this.height;
    
    this.setupListeners();
  }
  
  setupListeners() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      // Debounce for performance
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 100);
    });
  }
  
  handleResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspect = this.width / this.height;
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    
    this.emit('resize', {
      width: this.width,
      height: this.height,
      aspect: this.aspect,
      pixelRatio: this.pixelRatio
    });
  }
}
```

### Camera Manager

```javascript
// src/core/Camera.js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
  constructor(sizes, canvas) {
    this.sizes = sizes;
    this.canvas = canvas;
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      sizes.aspect,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 5);
    
    this.controls = null;
    this.target = new THREE.Vector3(0, 0, 0);
    
    // For smooth camera movement
    this.targetPosition = new THREE.Vector3();
    this.currentPosition = new THREE.Vector3();
    this.smoothing = 0.05;
  }
  
  enableControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.9;
  }
  
  disableControls() {
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }
  
  setTarget(x, y, z) {
    this.targetPosition.set(x, y, z);
  }
  
  update(delta) {
    // Smooth interpolation to target
    this.currentPosition.lerp(this.targetPosition, this.smoothing);
    this.camera.position.copy(this.currentPosition);
    
    this.camera.lookAt(this.target);
    
    if (this.controls) {
      this.controls.update();
    }
  }
  
  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
```

## World Components

### Environment Setup

```javascript
// src/world/Environment.js
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class Environment {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.pmremGenerator = null;
    this.envMap = null;
  }
  
  async load(hdrPath) {
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    
    return new Promise((resolve, reject) => {
      new RGBELoader()
        .setDataType(THREE.HalfFloatType)
        .load(hdrPath, (texture) => {
          this.envMap = this.pmremGenerator.fromEquirectangular(texture).texture;
          
          this.scene.environment = this.envMap;
          this.scene.background = this.envMap;
          this.scene.backgroundBlurriness = 0.5;
          
          texture.dispose();
          this.pmremGenerator.dispose();
          
          resolve(this.envMap);
        }, undefined, reject);
    });
  }
  
  setBackgroundBlur(amount) {
    this.scene.backgroundBlurriness = amount;
  }
  
  setBackgroundIntensity(intensity) {
    this.scene.backgroundIntensity = intensity;
  }
  
  dispose() {
    if (this.envMap) {
      this.envMap.dispose();
    }
  }
}
```

### Base 3D Object Class

```javascript
// src/world/objects/BaseObject.js
import * as THREE from 'three';
import { EventEmitter } from '../../utils/EventEmitter.js';

export class BaseObject extends EventEmitter {
  constructor() {
    super();
    
    this.group = new THREE.Group();
    this.isReady = false;
    
    // Animation state
    this.animationState = {
      progress: 0,
      active: false
    };
  }
  
  // Override in subclass
  async init() {
    this.isReady = true;
  }
  
  // Override in subclass
  update(delta, elapsed) {}
  
  // Override in subclass
  setProgress(progress) {
    this.animationState.progress = progress;
  }
  
  show() {
    this.group.visible = true;
  }
  
  hide() {
    this.group.visible = false;
  }
  
  dispose() {
    this.group.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}
```

### Hero Object Example

```javascript
// src/world/objects/Hero.js
import * as THREE from 'three';
import { BaseObject } from './BaseObject.js';
import vertexShader from '../../shaders/hero/vertex.glsl';
import fragmentShader from '../../shaders/hero/fragment.glsl';

export class Hero extends BaseObject {
  constructor() {
    super();
    
    this.mesh = null;
    this.material = null;
    this.uniforms = {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uMouse: { value: new THREE.Vector2() }
    };
  }
  
  async init() {
    const geometry = new THREE.IcosahedronGeometry(1, 64);
    
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
    
    this.isReady = true;
    this.emit('ready');
  }
  
  update(delta, elapsed) {
    if (!this.isReady) return;
    
    this.uniforms.uTime.value = elapsed;
    this.mesh.rotation.y += 0.1 * delta;
  }
  
  setProgress(progress) {
    super.setProgress(progress);
    this.uniforms.uProgress.value = progress;
    
    // Animate based on progress
    this.group.position.y = THREE.MathUtils.lerp(-2, 0, this.easeOutCubic(progress));
    this.group.scale.setScalar(0.5 + progress * 0.5);
  }
  
  setMouse(x, y) {
    this.uniforms.uMouse.value.set(x, y);
  }
  
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}
```

## Animation System

### Animation Manager

```javascript
// src/animation/AnimationManager.js
import { EventEmitter } from '../utils/EventEmitter.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class AnimationManager extends EventEmitter {
  constructor() {
    super();
    
    this.timelines = new Map();
    this.scrollTriggers = new Map();
    this.masterProgress = 0;
  }
  
  createTimeline(name, config = {}) {
    const timeline = gsap.timeline({
      paused: true,
      ...config
    });
    
    this.timelines.set(name, timeline);
    return timeline;
  }
  
  getTimeline(name) {
    return this.timelines.get(name);
  }
  
  createScrollTrigger(name, config) {
    const trigger = ScrollTrigger.create({
      ...config,
      onUpdate: (self) => {
        this.masterProgress = self.progress;
        this.emit('progress', self.progress);
        config.onUpdate?.(self);
      }
    });
    
    this.scrollTriggers.set(name, trigger);
    return trigger;
  }
  
  setProgress(progress) {
    this.masterProgress = progress;
    this.emit('progress', progress);
  }
  
  dispose() {
    this.timelines.forEach(tl => tl.kill());
    this.timelines.clear();
    
    this.scrollTriggers.forEach(st => st.kill());
    this.scrollTriggers.clear();
  }
}
```

### Scroll Controller

```javascript
// src/animation/ScrollController.js
import Lenis from 'lenis';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';

export class ScrollController {
  constructor() {
    this.lenis = null;
    this.progress = 0;
    this.velocity = 0;
    this.callbacks = new Set();
  }
  
  init() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true
    });
    
    // Connect to GSAP
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);
    
    // Track progress
    this.lenis.on('scroll', ({ progress, velocity }) => {
      this.progress = progress;
      this.velocity = velocity;
      
      this.callbacks.forEach(cb => cb(progress, velocity));
    });
  }
  
  onScroll(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  scrollTo(target, options = {}) {
    this.lenis.scrollTo(target, options);
  }
  
  stop() {
    this.lenis.stop();
  }
  
  start() {
    this.lenis.start();
  }
  
  destroy() {
    this.lenis.destroy();
    this.callbacks.clear();
  }
}
```

## Asset Loading

### Asset Loader

```javascript
// src/loaders/AssetLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EventEmitter } from '../utils/EventEmitter.js';

export class AssetLoader extends EventEmitter {
  constructor() {
    super();
    
    this.loadingManager = new THREE.LoadingManager();
    this.setupLoaders();
    this.setupLoadingManager();
    
    this.assets = new Map();
  }
  
  setupLoaders() {
    // Texture loader
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    
    // GLTF loader with Draco
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');
    this.gltfLoader.setDRACOLoader(dracoLoader);
    
    // HDRI loader
    this.rgbeLoader = new RGBELoader(this.loadingManager);
    this.rgbeLoader.setDataType(THREE.HalfFloatType);
  }
  
  setupLoadingManager() {
    this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
      this.emit('start', { url, loaded: itemsLoaded, total: itemsTotal });
    };
    
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const progress = itemsLoaded / itemsTotal;
      this.emit('progress', { url, progress, loaded: itemsLoaded, total: itemsTotal });
    };
    
    this.loadingManager.onLoad = () => {
      this.emit('complete');
    };
    
    this.loadingManager.onError = (url) => {
      this.emit('error', { url });
    };
  }
  
  async loadTexture(name, url, options = {}) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, (texture) => {
        // Apply options
        if (options.colorSpace) {
          texture.colorSpace = options.colorSpace;
        }
        if (options.wrapS) texture.wrapS = options.wrapS;
        if (options.wrapT) texture.wrapT = options.wrapT;
        if (options.anisotropy) texture.anisotropy = options.anisotropy;
        
        this.assets.set(name, texture);
        resolve(texture);
      }, undefined, reject);
    });
  }
  
  async loadModel(name, url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => {
        this.assets.set(name, gltf);
        resolve(gltf);
      }, undefined, reject);
    });
  }
  
  async loadHDRI(name, url) {
    return new Promise((resolve, reject) => {
      this.rgbeLoader.load(url, (texture) => {
        this.assets.set(name, texture);
        resolve(texture);
      }, undefined, reject);
    });
  }
  
  get(name) {
    return this.assets.get(name);
  }
  
  dispose() {
    this.assets.forEach((asset) => {
      if (asset.dispose) asset.dispose();
    });
    this.assets.clear();
  }
}
```

## Main Entry Point

```javascript
// main.js
import { SceneManager } from './src/core/Scene.js';
import { RendererManager } from './src/core/Renderer.js';
import { CameraManager } from './src/core/Camera.js';
import { Sizes } from './src/core/Sizes.js';
import { Environment } from './src/world/Environment.js';
import { Hero } from './src/world/objects/Hero.js';
import { AnimationManager } from './src/animation/AnimationManager.js';
import { ScrollController } from './src/animation/ScrollController.js';
import { AssetLoader } from './src/loaders/AssetLoader.js';

class App {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.isRunning = false;
    this.animationId = null;
    
    this.init();
  }
  
  async init() {
    // Core
    this.sizes = new Sizes();
    this.sceneManager = new SceneManager();
    this.renderer = new RendererManager(this.canvas, this.sizes);
    this.camera = new CameraManager(this.sizes, this.canvas);
    
    // Loaders
    this.assetLoader = new AssetLoader();
    this.assetLoader.on('progress', ({ progress }) => {
      this.updateLoadingProgress(progress);
    });
    
    // Animation
    this.animationManager = new AnimationManager();
    this.scrollController = new ScrollController();
    this.scrollController.init();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load assets
    await this.loadAssets();
    
    // Create world
    await this.createWorld();
    
    // Setup animations
    this.setupAnimations();
    
    // Start
    this.hideLoader();
    this.start();
  }
  
  async loadAssets() {
    await Promise.all([
      this.assetLoader.loadHDRI('environment', '/assets/hdri/studio.hdr'),
      // Add more assets here
    ]);
  }
  
  async createWorld() {
    // Environment
    this.environment = new Environment(
      this.sceneManager.scene,
      this.renderer.renderer
    );
    await this.environment.load('/assets/hdri/studio.hdr');
    
    // Hero object
    this.hero = new Hero();
    await this.hero.init();
    this.sceneManager.add('hero', this.hero.group);
  }
  
  setupAnimations() {
    // Scroll-linked animation
    this.scrollController.onScroll((progress) => {
      this.hero.setProgress(progress);
    });
  }
  
  setupEventListeners() {
    // Resize
    this.sizes.on('resize', ({ width, height, aspect }) => {
      this.camera.resize(aspect);
      this.renderer.resize(width, height);
    });
    
    // Mouse
    window.addEventListener('mousemove', (e) => {
      const x = (e.clientX / this.sizes.width) * 2 - 1;
      const y = -(e.clientY / this.sizes.height) * 2 + 1;
      this.hero?.setMouse(x, y);
    });
    
    // Visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }
  
  updateLoadingProgress(progress) {
    // Update loading UI
    document.querySelector('.loader-progress').style.width = `${progress * 100}%`;
  }
  
  hideLoader() {
    gsap.to('.loader', {
      opacity: 0,
      duration: 0.5,
      onComplete: () => {
        document.querySelector('.loader').style.display = 'none';
      }
    });
  }
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }
  
  pause() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  resume() {
    this.sceneManager.clock.getDelta(); // Reset delta
    this.start();
  }
  
  animate() {
    if (!this.isRunning) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const delta = Math.min(this.sceneManager.clock.getDelta(), 0.1);
    const elapsed = this.sceneManager.clock.getElapsedTime();
    
    // Update objects
    this.hero?.update(delta, elapsed);
    this.camera.update(delta);
    
    // Render
    this.renderer.render(this.sceneManager.scene, this.camera.camera);
  }
  
  dispose() {
    this.pause();
    this.sceneManager.destroy();
    this.renderer.dispose();
    this.assetLoader.dispose();
    this.scrollController.destroy();
    this.animationManager.dispose();
  }
}

// Initialize
new App();
```
