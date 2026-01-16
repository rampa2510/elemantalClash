# Bug Fixes & Common Glitches

## Visual Glitches

### Z-Fighting (Flickering Surfaces)

**Symptom**: Surfaces flicker or shimmer where two objects are at the same depth.

**Solutions**:

```javascript
// 1. Offset surfaces slightly
plane1.position.z = 0;
plane2.position.z = 0.001; // Tiny offset

// 2. Increase near plane (most common fix)
camera.near = 0.1;  // Not 0.001!
camera.updateProjectionMatrix();

// 3. Enable logarithmic depth buffer for large scenes
const renderer = new THREE.WebGLRenderer({
  logarithmicDepthBuffer: true
});

// 4. Use polygon offset for decals/overlays
const material = new THREE.MeshStandardMaterial({
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1
});
```

### Shadow Acne (Striped Shadows)

**Symptom**: Self-shadowing creates striped patterns on surfaces.

```javascript
// Fix: Adjust shadow bias
light.shadow.bias = -0.0001;      // Start here
light.shadow.normalBias = 0.02;   // For curved surfaces

// If shadows detach from objects, reduce bias
// If stripes persist, increase bias (but not too much)
```

### Shadow Peter-Panning (Floating Shadows)

**Symptom**: Shadows appear detached from objects.

```javascript
// Cause: bias is too high
// Fix: Reduce bias, use normalBias instead
light.shadow.bias = -0.00005;
light.shadow.normalBias = 0.01;
```

### Texture Seams on Spheres

**Symptom**: Visible line on spheres where UV wraps.

```javascript
// Fix: Use equirectangular mapping
texture.mapping = THREE.EquirectangularReflectionMapping;

// Or for standard textures, ensure seamless wrapping
texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
```

### Texture Flickering (Moire Patterns)

**Symptom**: Textures shimmer at distance or angles.

```javascript
// Fix: Enable mipmaps and anisotropic filtering
texture.generateMipmaps = true;
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
```

### Transparent Object Sorting

**Symptom**: Transparent objects render in wrong order.

```javascript
// Fix 1: Set renderOrder for manual control
transparentMesh1.renderOrder = 1;
transparentMesh2.renderOrder = 2;

// Fix 2: Use depthWrite: false for all transparent
const material = new THREE.MeshBasicMaterial({
  transparent: true,
  opacity: 0.5,
  depthWrite: false
});

// Fix 3: For many transparent objects, use OIT
// (Order-Independent Transparency - advanced)
```

### Jagged Edges (Aliasing)

```javascript
// Fix 1: Enable anti-aliasing on renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Fix 2: With post-processing, use SMAA pass
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
composer.addPass(new SMAAPass(width, height));

// Fix 3: For thin lines, increase line width or use screen-space techniques
```

## Animation Glitches

### Animation Jump After Tab Switch

**Symptom**: Animation jumps forward when returning to tab.

```javascript
const clock = new THREE.Clock();
let lastTime = 0;

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Reset clock to prevent accumulated time jump
    clock.start();
    clock.getDelta(); // Consume any accumulated delta
    lastTime = performance.now();
  }
});

function animate() {
  requestAnimationFrame(animate);
  
  // Cap delta to prevent huge jumps
  const delta = Math.min(clock.getDelta(), 0.1);
  
  // Use capped delta for animations
  mixer.update(delta);
}
```

### Stuttering Animation (GC Jank)

**Symptom**: Periodic micro-freezes every few seconds.

**Cause**: Creating objects in render loop triggers garbage collection.

```javascript
// ❌ BAD: Creates garbage every frame
function animate() {
  const direction = new THREE.Vector3(1, 0, 0);
  const temp = new THREE.Matrix4();
  mesh.position.add(direction.multiplyScalar(speed));
}

// ✅ GOOD: Reuse pre-allocated objects
const direction = new THREE.Vector3();
const temp = new THREE.Matrix4();

function animate() {
  direction.set(1, 0, 0);
  mesh.position.add(direction.multiplyScalar(speed));
}
```

### Different Animation Speed on Different Monitors

**Symptom**: Animation runs faster on 120Hz displays than 60Hz.

```javascript
// ❌ BAD: Frame-rate dependent
function animate() {
  mesh.rotation.x += 0.01; // 60fps = 0.6/sec, 120fps = 1.2/sec
}

// ✅ GOOD: Use delta time
const clock = new THREE.Clock();

function animate() {
  const delta = clock.getDelta();
  mesh.rotation.x += rotationSpeed * delta; // Consistent speed
}
```

### Lerp Not Reaching Target

**Symptom**: Smooth interpolation gets very close but never reaches target.

```javascript
// Problem: lerp approaches asymptotically
current += (target - current) * 0.1; // Never reaches exactly

// Fix 1: Snap when close enough
if (Math.abs(target - current) < 0.001) {
  current = target;
} else {
  current += (target - current) * 0.1;
}

// Fix 2: Use exponential decay with threshold
const decay = 1 - Math.pow(0.001, delta);
current = THREE.MathUtils.lerp(current, target, decay);
```

### GSAP + Three.js Conflicts

**Symptom**: GSAP animations don't work or cause visual issues.

```javascript
// ❌ BAD: Direct Three.js object animation
gsap.to(mesh.position, { x: 5 }); // May not trigger renders

// ✅ GOOD: Proxy object pattern
const proxy = { x: mesh.position.x };
gsap.to(proxy, {
  x: 5,
  onUpdate: () => {
    mesh.position.x = proxy.x;
    // Only needed if not in continuous render loop:
    renderer.render(scene, camera);
  }
});
```

## Performance Issues

### Memory Leak (Increasing RAM Usage)

```javascript
// Always dispose when removing objects
function removeObject(object) {
  scene.remove(object);
  
  // Dispose geometry
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  // Dispose material and its textures
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  }
}

function disposeMaterial(material) {
  // Dispose all texture maps
  const textureKeys = [
    'map', 'lightMap', 'bumpMap', 'normalMap',
    'displacementMap', 'specularMap', 'envMap',
    'alphaMap', 'aoMap', 'emissiveMap',
    'metalnessMap', 'roughnessMap'
  ];
  
  textureKeys.forEach(key => {
    if (material[key]) {
      material[key].dispose();
    }
  });
  
  material.dispose();
}
```

### FPS Drops Over Time

**Symptom**: Scene starts smooth but degrades.

```javascript
// Check: Are you adding objects without removing?
console.log('Scene objects:', scene.children.length);

// Check: Are geometries/materials accumulating?
console.log(renderer.info.memory);

// Fix: Implement object pooling for frequently created/destroyed objects
class ObjectPool {
  constructor(createFn, initialSize = 10) {
    this.createFn = createFn;
    this.available = [];
    this.active = new Set();
    
    for (let i = 0; i < initialSize; i++) {
      this.available.push(createFn());
    }
  }
  
  get() {
    const obj = this.available.pop() || this.createFn();
    this.active.add(obj);
    obj.visible = true;
    return obj;
  }
  
  release(obj) {
    if (this.active.has(obj)) {
      this.active.delete(obj);
      obj.visible = false;
      this.available.push(obj);
    }
  }
}
```

### Draw Call Explosion

**Symptom**: `renderer.info.render.calls` is very high.

```javascript
// Check draw calls
console.log('Draw calls:', renderer.info.render.calls);

// Fix 1: Use InstancedMesh for repeated objects
const count = 1000;
const instancedMesh = new THREE.InstancedMesh(geometry, material, count);

const matrix = new THREE.Matrix4();
for (let i = 0; i < count; i++) {
  matrix.setPosition(Math.random() * 10, Math.random() * 10, Math.random() * 10);
  instancedMesh.setMatrixAt(i, matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;

// Fix 2: Merge static geometries
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const geometries = meshes.map(m => m.geometry.clone());
const merged = mergeGeometries(geometries);
const singleMesh = new THREE.Mesh(merged, sharedMaterial);
```

## Context Loss

### WebGL Context Lost

**Symptom**: Screen goes black, errors in console.

```javascript
const canvas = document.getElementById('canvas');

// Prevent default handling
canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  console.log('WebGL context lost');
  
  // Stop animation loop
  cancelAnimationFrame(animationId);
  
  // Show fallback
  document.getElementById('fallback').style.display = 'block';
});

// Handle restoration
canvas.addEventListener('webglcontextrestored', () => {
  console.log('WebGL context restored');
  
  // Hide fallback
  document.getElementById('fallback').style.display = 'none';
  
  // Reinitialize everything
  init();
  animate();
});
```

### Force Context Loss for Testing

```javascript
// Test context loss handling
const gl = renderer.getContext();
const loseContext = gl.getExtension('WEBGL_lose_context');

// Simulate loss
loseContext.loseContext();

// Simulate restore (after some delay)
setTimeout(() => loseContext.restoreContext(), 2000);
```

## Mobile-Specific Issues

### Touch Events Not Working

```javascript
// Add touch event listeners alongside mouse
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd);

function handleTouchStart(event) {
  event.preventDefault();
  const touch = event.touches[0];
  // Convert touch to mouse coordinates
  onPointerDown({ clientX: touch.clientX, clientY: touch.clientY });
}
```

### iOS Safari Black Screen

**Symptom**: Works everywhere except iOS Safari.

```javascript
// Fix 1: Reduce pixel ratio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Fix 2: Limit texture sizes
const maxSize = Math.min(2048, renderer.capabilities.maxTextureSize);

// Fix 3: Ensure power-of-two textures
// iOS Safari is stricter about texture dimensions

// Fix 4: Check for WebGL2 support fallback
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
```

### Orientation Change Issues

```javascript
// iOS needs delayed resize handling
let resizeTimeout;

window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(handleResize, 100);
});

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  
  renderer.setSize(width, height);
  composer?.setSize(width, height);
}
```

## Shader Errors

### "precision" Error

```glsl
// Always declare precision at top of fragment shaders
precision highp float;
precision highp int;

// For vertex shaders (usually not needed but safe)
precision highp float;
```

### "MAX_VARYING_VECTORS" Exceeded

**Symptom**: Shader fails to compile with varying limit error.

```javascript
// Problem: Too many varyings between vertex and fragment
// Fix: Pack multiple values into vec4s

// Instead of:
varying float vFoo;
varying float vBar;
varying float vBaz;
varying float vQux;

// Use:
varying vec4 vPacked; // vPacked.x = foo, .y = bar, etc.
```

### Uniform Not Updating

```javascript
// Always mark uniforms as needing update
material.uniforms.uTime.value = time;
material.uniformsNeedUpdate = true; // Sometimes needed

// For textures, mark the texture
texture.needsUpdate = true;
```

## Loading Issues

### Model Not Appearing

```javascript
// Check 1: Model might be too small/large
loader.load('model.glb', (gltf) => {
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  console.log('Model size:', size);
  
  // Scale to fit
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 2 / maxDim;
  gltf.scene.scale.setScalar(scale);
  
  // Center
  const center = box.getCenter(new THREE.Vector3());
  gltf.scene.position.sub(center.multiplyScalar(scale));
});

// Check 2: Model might be at wrong position
gltf.scene.position.set(0, 0, 0);

// Check 3: Camera might be looking away
camera.lookAt(0, 0, 0);
```

### CORS Error Loading Assets

```javascript
// For development, use a local server (not file://)
// Live Server, Vite, etc.

// For production, ensure proper CORS headers on server
// Or use a CORS proxy for external assets

// Set crossOrigin on loaders
textureLoader.setCrossOrigin('anonymous');
```

### Draco Decoder Not Found

```javascript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
// Use CDN for decoder files
dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/libs/draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```
