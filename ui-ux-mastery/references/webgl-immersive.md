# WebGL & Immersive Experiences

## When to Use WebGL

| Use Case | Recommendation |
|----------|---------------|
| Hero visual impact | ✓ Gradients, particles, morphing |
| Product visualization | ✓ 3D models, rotation, zoom |
| Data visualization | ✓ Complex, interactive charts |
| Immersive storytelling | ✓ Scroll-driven 3D scenes |
| Background ambient | ✓ Subtle, non-distracting |
| Critical content | ✗ Accessibility concerns |
| Mobile-first sites | ⚠️ Performance testing required |

---

## Stripe-Style Gradient (CSS Fallback + WebGL)

### CSS Version (Performant)

```css
.gradient-hero {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 50%,
    #f093fb 100%
  );
}

/* Animated gradient */
.gradient-animated {
  background: linear-gradient(
    -45deg,
    #6ec3f4,
    #3a3aff,
    #ff61ab,
    #E63946
  );
  background-size: 400% 400%;
  animation: gradient-shift 15s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Mesh gradient (multiple layers) */
.mesh-gradient {
  position: relative;
  background: #0a0a0a;
}

.mesh-gradient::before,
.mesh-gradient::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 20% 50%,
    rgba(110, 195, 244, 0.3) 0%,
    transparent 50%
  );
  animation: mesh-move 20s ease-in-out infinite;
}

.mesh-gradient::after {
  background: radial-gradient(
    ellipse at 80% 50%,
    rgba(255, 97, 171, 0.3) 0%,
    transparent 50%
  );
  animation-delay: -10s;
}

@keyframes mesh-move {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(5%, 5%) scale(1.1); }
  66% { transform: translate(-5%, -5%) scale(0.9); }
}
```

### WebGL Version (Three.js)

```html
<canvas id="gradient-canvas"></canvas>

<script type="module">
import * as THREE from 'https://unpkg.com/three@0.150.0/build/three.module.js';

class GradientBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    this.camera.position.z = 1;
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    this.createGradient();
    this.animate();
    this.handleResize();
  }
  
  createGradient() {
    // Custom shader for animated gradient
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    const fragmentShader = `
      uniform float uTime;
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      varying vec2 vUv;
      
      void main() {
        vec2 uv = vUv;
        
        // Animated gradient mixing
        float noise = sin(uv.x * 3.0 + uTime * 0.5) * 
                     cos(uv.y * 3.0 + uTime * 0.3) * 0.5 + 0.5;
        
        vec3 color = mix(uColor1, uColor2, uv.x + noise * 0.3);
        color = mix(color, uColor3, uv.y + noise * 0.2);
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#6ec3f4') },
        uColor2: { value: new THREE.Color('#3a3aff') },
        uColor3: { value: new THREE.Color('#ff61ab') }
      }
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    
    const elapsed = this.clock.getElapsedTime();
    this.mesh.material.uniforms.uTime.value = elapsed;
    
    this.renderer.render(this.scene, this.camera);
  }
  
  handleResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
}

// Initialize
new GradientBackground(document.getElementById('gradient-canvas'));
</script>
```

---

## Particle Systems

### Floating Particles (Ambient)

```javascript
class ParticleBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.particleCount = 50;
    
    this.resize();
    this.createParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.resize());
  }
  
  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }
  
  createParticles() {
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.particles.forEach(p => {
      // Update position
      p.x += p.vx;
      p.y += p.vy;
      
      // Wrap around edges
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
      
      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      this.ctx.fill();
    });
    
    // Connect nearby particles
    this.particles.forEach((p1, i) => {
      this.particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / 150)})`;
          this.ctx.stroke();
        }
      });
    });
    
    requestAnimationFrame(() => this.animate());
  }
}
```

### Mouse-Interactive Particles

```javascript
class InteractiveParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mouse = { x: 0, y: 0, radius: 150 };
    this.particles = [];
    
    this.resize();
    this.createParticles();
    this.animate();
    
    canvas.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }
  
  createParticles() {
    const particleCount = Math.floor((this.width * this.height) / 9000);
    
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        radius: Math.random() * 3 + 1,
        density: Math.random() * 30 + 1
      });
    }
  }
  
  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.particles.forEach(p => {
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.mouse.radius) {
        // Push particles away from mouse
        const force = (this.mouse.radius - distance) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        const pushX = Math.cos(angle) * force * p.density;
        const pushY = Math.sin(angle) * force * p.density;
        
        p.x -= pushX;
        p.y -= pushY;
      } else {
        // Return to base position
        const dx = p.baseX - p.x;
        const dy = p.baseY - p.y;
        p.x += dx * 0.05;
        p.y += dy * 0.05;
      }
      
      // Draw
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    });
    
    requestAnimationFrame(() => this.animate());
  }
  
  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }
}
```

---

## 3D Product Viewer

```html
<div id="product-viewer"></div>

<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ProductViewer {
  constructor(container) {
    this.container = container;
    
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf5f5f5);
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1, 3);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    
    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 10;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 1;
    
    this.addLights();
    this.loadModel();
    this.animate();
  }
  
  addLights() {
    // Ambient
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    // Key light
    const key = new THREE.DirectionalLight(0xffffff, 1);
    key.position.set(5, 5, 5);
    key.castShadow = true;
    this.scene.add(key);
    
    // Fill light
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 0, 5);
    this.scene.add(fill);
    
    // Rim light
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(0, 5, -5);
    this.scene.add(rim);
  }
  
  loadModel() {
    const loader = new GLTFLoader();
    
    // Show loading indicator
    this.showLoading();
    
    loader.load(
      '/models/product.glb',
      (gltf) => {
        this.model = gltf.scene;
        this.scene.add(this.model);
        
        // Center and scale model
        const box = new THREE.Box3().setFromObject(this.model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        this.model.scale.multiplyScalar(scale);
        this.model.position.sub(center.multiplyScalar(scale));
        
        this.hideLoading();
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        this.updateLoading(percent);
      },
      (error) => {
        console.error('Error loading model:', error);
        this.hideLoading();
      }
    );
  }
  
  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  
  showLoading() { /* ... */ }
  updateLoading(percent) { /* ... */ }
  hideLoading() { /* ... */ }
}
</script>
```

---

## Scroll-Linked 3D

```javascript
class ScrollLinked3D {
  constructor() {
    this.progress = 0;
    this.targetProgress = 0;
    
    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      this.targetProgress = window.scrollY / scrollHeight;
    });
    
    this.animate();
  }
  
  animate() {
    // Smooth scroll progress
    this.progress += (this.targetProgress - this.progress) * 0.05;
    
    // Update 3D scene based on progress
    if (this.model) {
      // Rotate model
      this.model.rotation.y = this.progress * Math.PI * 2;
      
      // Move camera
      this.camera.position.z = 5 - this.progress * 3;
      
      // Change colors
      const hue = this.progress * 360;
      this.scene.background = new THREE.Color(`hsl(${hue}, 50%, 10%)`);
    }
    
    requestAnimationFrame(() => this.animate());
  }
}
```

---

## Performance Best Practices

### 1. Viewport Detection

```javascript
// Only animate when in viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });
}, { threshold: 0.1 });

observer.observe(canvas);
```

### 2. Device Capability Detection

```javascript
// Check for WebGL support
function hasWebGL() {
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
}

// Check for reduced motion preference
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Fallback strategy
if (!hasWebGL() || prefersReducedMotion()) {
  showStaticFallback();
} else {
  initWebGL();
}
```

### 3. Mobile Optimization

```javascript
// Reduce complexity on mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const config = {
  particleCount: isMobile ? 25 : 100,
  pixelRatio: isMobile ? 1 : Math.min(window.devicePixelRatio, 2),
  shadows: !isMobile,
  postProcessing: !isMobile
};
```

### 4. Frame Rate Monitoring

```javascript
class PerformanceMonitor {
  constructor() {
    this.fps = 60;
    this.frames = 0;
    this.lastTime = performance.now();
    
    this.monitor();
  }
  
  monitor() {
    this.frames++;
    const now = performance.now();
    
    if (now - this.lastTime >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.lastTime = now;
      
      // Reduce quality if FPS drops
      if (this.fps < 30) {
        this.reduceQuality();
      }
    }
    
    requestAnimationFrame(() => this.monitor());
  }
  
  reduceQuality() {
    // Reduce particle count
    // Lower resolution
    // Disable shadows
    // Simplify shaders
  }
}
```

---

## Quick Reference

### Gradient Background → CSS First, WebGL for Complex

### Particle Effects → Canvas 2D for Simple, Three.js for 3D

### Product Viewer → Three.js + GLTFLoader

### Scroll-Linked → IntersectionObserver + requestAnimationFrame

### Mobile → Reduce, Fallback, or Static
