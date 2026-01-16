# Performance Optimization Reference

## Draw Call Optimization

### InstancedMesh
```javascript
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial();
const count = 10000;

const mesh = new THREE.InstancedMesh(geometry, material, count);

const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3(1, 1, 1);

for (let i = 0; i < count; i++) {
  position.set(
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100,
    (Math.random() - 0.5) * 100
  );
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(i, matrix);
  mesh.setColorAt(i, new THREE.Color(Math.random(), Math.random(), Math.random()));
}

mesh.instanceMatrix.needsUpdate = true;
mesh.instanceColor.needsUpdate = true;
```

### Geometry Merging
```javascript
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const geometries = [];
for (let i = 0; i < 100; i++) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.translate(Math.random() * 50, Math.random() * 50, Math.random() * 50);
  geometries.push(geo);
}

const mergedGeometry = mergeGeometries(geometries);
const mesh = new THREE.Mesh(mergedGeometry, material);
// Single draw call for all boxes
```

### BatchedMesh (Three.js r159+)
```javascript
const batchedMesh = new THREE.BatchedMesh(maxGeometryCount, maxVertexCount, maxIndexCount, material);

const geometries = [
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.SphereGeometry(0.5, 16, 16),
  new THREE.ConeGeometry(0.5, 1, 16)
];

const geoIds = geometries.map(geo => batchedMesh.addGeometry(geo));

// Add instances
for (let i = 0; i < 1000; i++) {
  const geoId = geoIds[Math.floor(Math.random() * geoIds.length)];
  const instanceId = batchedMesh.addInstance(geoId);
  
  const matrix = new THREE.Matrix4();
  matrix.setPosition(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * 100 - 50);
  batchedMesh.setMatrixAt(instanceId, matrix);
}
```

## Texture Optimization

### KTX2 Compression
```javascript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const ktx2Loader = new KTX2Loader();
ktx2Loader.setTranscoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/basis/');
ktx2Loader.detectSupport(renderer);

ktx2Loader.load('texture.ktx2', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  material.map = texture;
});
```

### Texture Format Selection
| Content | Format | Compression |
|---------|--------|-------------|
| Color/Albedo | SRGB | ETC1S or UASTC |
| Normal | Linear | UASTC |
| Roughness/Metalness | Linear | ETC1S |
| HDR/Environment | RGBE | UASTC |
| Alpha | RGBA | UASTC |

### Texture Settings
```javascript
texture.minFilter = THREE.LinearMipmapLinearFilter;
texture.magFilter = THREE.LinearFilter;
texture.generateMipmaps = true;
texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

// For non-power-of-2 textures
texture.wrapS = THREE.ClampToEdgeWrapping;
texture.wrapT = THREE.ClampToEdgeWrapping;
```

## Mesh Optimization

### Draco Compression
```javascript
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' }); // or 'wasm'

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

### Meshopt Compression
```javascript
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
```

### LOD (Level of Detail)
```javascript
const lod = new THREE.LOD();

// High detail (close)
const highDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 64, 64),
  material
);
lod.addLevel(highDetail, 0);

// Medium detail
const mediumDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  material
);
lod.addLevel(mediumDetail, 10);

// Low detail (far)
const lowDetail = new THREE.Mesh(
  new THREE.SphereGeometry(1, 8, 8),
  material
);
lod.addLevel(lowDetail, 50);

scene.add(lod);

// Update in render loop
lod.update(camera);
```

## Memory Management

### Proper Disposal
```javascript
function disposeObject(object) {
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => disposeMaterial(material));
    } else {
      disposeMaterial(object.material);
    }
  }
  
  if (object.children) {
    object.children.forEach(child => disposeObject(child));
  }
}

function disposeMaterial(material) {
  Object.keys(material).forEach(key => {
    const value = material[key];
    if (value && typeof value.dispose === 'function') {
      value.dispose();
    }
  });
  material.dispose();
}

// Usage
scene.remove(object);
disposeObject(object);
```

### Object Pooling
```javascript
class ObjectPool {
  constructor(factory, initialSize = 10) {
    this.factory = factory;
    this.pool = [];
    
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory());
    }
  }
  
  acquire() {
    return this.pool.pop() || this.factory();
  }
  
  release(obj) {
    // Reset object state
    obj.position.set(0, 0, 0);
    obj.rotation.set(0, 0, 0);
    obj.scale.set(1, 1, 1);
    obj.visible = false;
    
    this.pool.push(obj);
  }
}

// Usage
const bulletPool = new ObjectPool(() => createBulletMesh(), 100);
const bullet = bulletPool.acquire();
// ... use bullet ...
bulletPool.release(bullet);
```

## Shader Optimization

### Branchless Code
```glsl
// BAD: Branching
if (x > 0.5) {
  color = red;
} else {
  color = blue;
}

// GOOD: Branchless
color = mix(blue, red, step(0.5, x));

// Alternative with smoothstep for gradual transition
color = mix(blue, red, smoothstep(0.4, 0.6, x));
```

### Precision Qualifiers
```glsl
// Full precision (desktop)
precision highp float;

// Medium precision (mobile-friendly)
precision mediump float;

// Low precision (colors, simple math)
lowp vec3 color = texture2D(sampler, uv).rgb;
```

### Precomputed Values
```glsl
// BAD: Computed every pixel
float angle = atan(pos.y, pos.x);
float radius = length(pos);

// GOOD: Use constants
const float PI = 3.14159265359;
const float TAU = 6.28318530718;
const float INV_PI = 0.31830988618;

// Precompute in vertex shader when possible
varying float vRadius;
// In vertex: vRadius = length(position.xy);
```

## Render Settings

### Renderer Configuration
```javascript
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance',
  stencil: false,
  depth: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
```

### Shadow Optimization
```javascript
// Directional light shadows
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
directionalLight.shadow.bias = -0.0001;

// Cascade shadows for large scenes
// Use THREE.CSM (Cascaded Shadow Maps)
```

## Performance Monitoring

### Stats.js
```javascript
import Stats from 'three/addons/libs/stats.module.js';

const stats = new Stats();
document.body.appendChild(stats.dom);

function animate() {
  stats.begin();
  // ... render ...
  stats.end();
  requestAnimationFrame(animate);
}
```

### r3f-perf
```jsx
import { Perf } from 'r3f-perf';

<Canvas>
  <Perf position="top-left" />
  <Scene />
</Canvas>
```

### GPU Timing
```javascript
// Check if EXT_disjoint_timer_query is available
const ext = renderer.getContext().getExtension('EXT_disjoint_timer_query_webgl2');

if (ext) {
  const query = renderer.getContext().createQuery();
  // Use for GPU timing
}
```

## Performance Targets

| Metric | Mobile | Desktop |
|--------|--------|---------|
| FPS | 30-60 | 60+ |
| Draw Calls | <100 | <500 |
| Triangles | <100K | <1M |
| Texture Memory | <256MB | <1GB |
| Total Memory | <512MB | <2GB |
| Load Time | <3s | <5s |

## Tools

| Tool | Purpose |
|------|---------|
| **Spector.js** | WebGL call inspection |
| **Chrome DevTools** | Performance profiling |
| **r3f-perf** | R3F specific metrics |
| **Stats.js** | FPS monitoring |
| **RenderDoc** | GPU frame capture |
| **gltf-transform** | CLI for glTF optimization |
