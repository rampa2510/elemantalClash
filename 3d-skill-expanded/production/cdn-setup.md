# CDN Setup & Import Patterns

## Import Maps (Recommended)

Modern browsers support import maps for clean module syntax without bundlers:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>

<script type="module" src="./main.js"></script>
```

### Usage in JavaScript

```javascript
// Clean imports like npm
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
```

## CDN Options (Priority Order)

### 1. jsDelivr (Primary - Most Reliable)

```javascript
// Core Three.js
"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"

// Addons
"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"

// Specific files
"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js"
"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js"
"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/DRACOLoader.js"
"https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/RGBELoader.js"

// Decoder paths
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');
ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/basis/');
```

### 2. unpkg (Backup)

```javascript
"https://unpkg.com/three@0.170.0/build/three.module.js"
"https://unpkg.com/three@0.170.0/examples/jsm/"
```

### 3. esm.sh (Alternative)

```javascript
"https://esm.sh/three@0.170.0"
"https://esm.sh/three@0.170.0/examples/jsm/controls/OrbitControls.js"
```

## GSAP CDN

```html
<!-- Standard (global) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>

<!-- ES Module -->
<script type="importmap">
{
  "imports": {
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm",
    "gsap/ScrollTrigger": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/ScrollTrigger.js"
  }
}
</script>
```

```javascript
// ES Module usage
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

## Lenis Smooth Scroll

```html
<!-- CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.css">

<!-- JS (standard) -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js"></script>

<!-- ES Module -->
<script type="importmap">
{
  "imports": {
    "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm"
  }
}
</script>
```

## Complete Import Map Template

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm",
    "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.1.18/+esm"
  }
}
</script>
```

## CDN Fallback Pattern

```javascript
async function loadThreeWithFallback() {
  const cdns = [
    'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js',
    'https://unpkg.com/three@0.170.0/build/three.module.js',
    'https://esm.sh/three@0.170.0'
  ];
  
  for (const cdn of cdns) {
    try {
      const THREE = await import(cdn);
      console.log(`Loaded Three.js from ${cdn}`);
      return THREE;
    } catch (e) {
      console.warn(`Failed to load from ${cdn}:`, e);
    }
  }
  
  throw new Error('Failed to load Three.js from all CDNs');
}

// Usage
const THREE = await loadThreeWithFallback();
```

## WebGL Detection & Fallback

```javascript
function checkWebGL() {
  const canvas = document.createElement('canvas');
  
  // Try WebGL2 first
  let gl = canvas.getContext('webgl2');
  if (gl) return { version: 2, gl, supported: true };
  
  // Fallback to WebGL1
  gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  if (gl) return { version: 1, gl, supported: true };
  
  return { version: 0, gl: null, supported: false };
}

// Usage
const webgl = checkWebGL();

if (!webgl.supported) {
  // Show fallback content
  document.getElementById('canvas').innerHTML = `
    <div class="fallback">
      <video autoplay muted loop playsinline>
        <source src="fallback.mp4" type="video/mp4">
      </video>
      <p>Your browser doesn't support WebGL</p>
    </div>
  `;
} else {
  initThreeJS();
}
```

## Context Loss Handling

```javascript
const canvas = document.getElementById('canvas');

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.log('WebGL context lost');
  
  // Stop animation
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  
  // Show message
  showContextLostMessage();
});

canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  
  hideContextLostMessage();
  
  // Reinitialize scene
  init();
  animate();
});

function showContextLostMessage() {
  const msg = document.createElement('div');
  msg.id = 'context-lost';
  msg.innerHTML = '<p>Reloading graphics...</p>';
  msg.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 20px;
    border-radius: 8px;
    z-index: 9999;
  `;
  document.body.appendChild(msg);
}

function hideContextLostMessage() {
  const msg = document.getElementById('context-lost');
  if (msg) msg.remove();
}
```

## GPU Tier Detection

```javascript
// Detect GPU capabilities for quality settings
function detectGPUTier() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) return 'low';
  
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = debugInfo ? 
    gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
  
  // Check for known GPUs
  const isLowEnd = /Mali-[GT]|Adreno [34]|Intel HD [456]|PowerVR/i.test(renderer);
  const isHighEnd = /RTX|Radeon RX [67]|M[123] Pro|M[123] Max/i.test(renderer);
  
  // Check for mobile
  const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
  
  // Check memory
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
  
  if (isHighEnd && !isMobile) return 'ultra';
  if (isLowEnd || hasLowMemory) return 'low';
  if (isMobile) return 'medium';
  return 'high';
}

// Quality presets
const qualityPresets = {
  low: {
    pixelRatio: 1,
    shadows: false,
    postProcessing: false,
    particleCount: 1000,
    textureSize: 512,
    antialiasing: false
  },
  medium: {
    pixelRatio: 1.5,
    shadows: true,
    postProcessing: true,
    particleCount: 5000,
    textureSize: 1024,
    antialiasing: true
  },
  high: {
    pixelRatio: 2,
    shadows: true,
    postProcessing: true,
    particleCount: 20000,
    textureSize: 2048,
    antialiasing: true
  },
  ultra: {
    pixelRatio: 2,
    shadows: true,
    postProcessing: true,
    particleCount: 100000,
    textureSize: 4096,
    antialiasing: true
  }
};

// Apply quality settings
const tier = detectGPUTier();
const quality = qualityPresets[tier];

renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
renderer.shadowMap.enabled = quality.shadows;
```

## Production HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Experience</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow-x: hidden; }
    
    #canvas {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    
    .content {
      position: relative;
      z-index: 1;
      min-height: 100vh;
    }
    
    .fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100vh;
      background: #000;
      color: white;
    }
    
    @media (prefers-reduced-motion: reduce) {
      * { 
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  
  <div class="content">
    <!-- Your content here -->
  </div>

  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
      "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"
    }
  }
  </script>
  
  <script type="module" src="./main.js"></script>
</body>
</html>
```
