# 3D Web Graphics Mastery Skill

> Comprehensive expertise for creating PREMIUM, award-winning 3D web experiences. Covers Three.js r181+, React Three Fiber, WebGL, WebGPU, TSL shaders, GLSL, physics (Rapier, Cannon-es), WebXR VR/AR, GPGPU particles, raymarching, SDFs, post-processing, and production optimization. Emphasizes BOLD large-scale transformations and professional execution patterns from studios like Lusion, Active Theory, and Resn.

## Philosophy: BOLD over SAFE

Award-winning 3D experiences prioritize dramatic, full-page transformations over subtle effects:
- Full-screen 3D hero sections that dominate the viewport
- Camera movements that traverse entire scenes (not just wobble)
- Particles that explode, swirl, and reform (not just drift)
- Materials that dramatically transform (not just shimmer)
- Scroll experiences that fundamentally reshape the 3D world

---

## Quick Reference

| Task | Reference File |
|------|----------------|
| Animation timing, GSAP, state machines | `references/animation-architecture.md` |
| SDF primitives, raymarching, GLSL | `references/shaders-sdf.md` |
| Particle systems, GPGPU, instancing | `references/particles-procedural.md` |
| Post-processing, bloom, effects | `references/post-processing.md` |
| Physics, Rapier, WebXR VR/AR | `references/physics-xr.md` |
| Performance, optimization, profiling | `references/performance.md` |
| Materials, lighting, visual polish | `references/visual-polish.md` |
| Premium patterns, state machines | `references/premium-execution.md` |
| Asset sources, tools, CDN URLs | `references/resources.md` |
| **NEW** onBeforeCompile, MRT, volumetrics | `references/advanced-techniques.md` |
| **NEW** Gaussian Splatting, GPU-driven | `references/cutting-edge.md` |
| **NEW** Marching Cubes, L-Systems, flow fields | `references/procedural-generation.md` |
| **NEW** Skeletal animation, morph targets | `references/skeletal-animation.md` |
| **NEW** GLSL noise implementations | `references/noise-functions.md` |
| **NEW** Expert blogs, courses, communities | `references/expert-resources.md` |
| Project structure, scene management | `production/project-architecture.md` |
| CDN imports, import maps | `production/cdn-setup.md` |
| Common visual glitches, fixes | `production/bug-fixes.md` |
| Working hero section example | `examples/premium-hero.html` |
| Working scroll experience example | `examples/scroll-experience.html` |

---

## Essential Patterns

### GSAP + Three.js Proxy Pattern
```javascript
const proxy = { value: 0 };
gsap.to(proxy, {
  value: 1,
  duration: 1.2,
  ease: "power3.out",
  onUpdate: () => {
    mesh.position.y = proxy.value * 5;
    mesh.rotation.y = proxy.value * Math.PI;
    material.uniforms.uProgress.value = proxy.value;
  }
});
```

### Frame-Rate Independent Animation
```javascript
const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), 0.1); // Cap at 100ms
  velocity.multiplyScalar(1 - damping * delta * 60);
  position.add(velocity.clone().multiplyScalar(delta * 60));
}
```

### Resource Disposal Pattern
```javascript
function dispose(obj) {
  obj.traverse(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      Object.values(child.material).forEach(val => {
        if (val?.dispose) val.dispose();
      });
      child.material.dispose();
    }
  });
}
```

### Lenis + GSAP ScrollTrigger Sync
```javascript
const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

---

## Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Animate Three.js directly with GSAP | Use proxy objects |
| Create objects in render loop | Pre-allocate, use object pools |
| Skip disposal on unmount | Always dispose geometry/material/textures |
| Use setTimeout for animations | Use GSAP or requestAnimationFrame |
| Ignore reduced-motion preference | Check `prefers-reduced-motion` |
| Hard-code pixel values | Use relative units, check device pixel ratio |

---

## Technology Stack

| Category | Recommended |
|----------|-------------|
| Core 3D | Three.js r181+ |
| React Integration | React Three Fiber + Drei |
| Animation | GSAP 3.12+ with ScrollTrigger |
| Smooth Scroll | Lenis 1.1+ |
| Physics | Rapier (WASM) or Cannon-es |
| Post-Processing | pmndrs/postprocessing |
| Shaders | GLSL / TSL (WebGPU) |
| State Management | Zustand |
| WebXR | @react-three/xr |

---

## CDN Import Map (Verified 2024-2025)

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/",
    "gsap": "https://cdn.jsdelivr.net/npm/gsap@3.12.5/index.js",
    "lenis": "https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.mjs"
  }
}
</script>
```

---

## Performance Targets

| Metric | Desktop | Mobile | Critical |
|--------|---------|--------|----------|
| FPS | 60 | 30-60 | 60 |
| Draw Calls | <100 | <50 | <200 |
| Triangles | <2M | <500K | <5M |
| Texture VRAM | <100MB | <50MB | <200MB |
| LCP | <2.5s | <3s | <4s |
| JS per frame | <8ms | <12ms | <16ms |

---

## Coverage Topics

### Core (Original Skill)
- Animation timing values and easing curves
- GSAP + Three.js integration patterns
- SDF primitives (14 shapes) and raymarching
- GLSL noise functions (hash, value, simplex, FBM, curl, voronoi)
- Particle systems (instanced, GPGPU WebGL/WebGPU)
- Post-processing (bloom, chromatic aberration, god rays)
- Physics (Rapier setup, character controller, joints)
- WebXR (VR setup, AR hit testing, hand tracking)
- Performance optimization and profiling
- Materials (glass, car paint, brushed metal, fabric)
- Scene state machines with interpolation
- Bug fixes (shadow acne, z-fighting, disposal)

### Expanded Coverage (New Files)
- **Advanced Techniques**: onBeforeCompile, CSM library, RectAreaLight, Light Probes, Cascaded Shadow Maps, Multiple Render Targets (deferred rendering), water caustics, volumetric rendering (Beer's law, Henyey-Greenstein, cloud raymarching), volumetric lighting (god rays), KTX2/Basis Universal texture compression
- **Cutting-Edge**: 3D Gaussian Splatting (GaussianSplats3D, Spark.js, gsplat.js), GPU-driven rendering, mesh shaders, Nanite/Lumen concepts for web, SSGI, Filament PBR BRDF, GTAO, TAA, ReSTIR, LYGIA shader library, NodeToy, ShaderFrog, MathBox
- **Procedural Generation**: Marching Cubes, custom isosurface functions, procedural terrain with erosion, L-Systems for plants/trees, flow fields, circle packing, reaction-diffusion, organic motion, OKLCH color space
- **Skeletal Animation**: AnimationMixer, action control, crossfade blending, additive blending, layer-based animation, morph targets (blend shapes), procedural facial animation, direct bone control, IK with CCDIKSolver, animation events, root motion extraction, R3F useAnimations
- **Noise Functions**: Complete GLSL implementations (value, Perlin, simplex, Worley, curl, voronoi), FBM variants (ridged, turbulence, domain warping), shaping functions, gl-noise library, practical examples
- **Expert Resources**: Bruno Simon's course curriculum, SimonDev GLSL, Maxime Heckel's blog catalog, Varun Vachhar patterns, Steven Wittens MathBox, Inigo Quilez reference, YouTube channels, newsletters, communities, books, academic papers

---

## Quality Signals

### Professional vs Amateur

| Amateur | Professional |
|---------|--------------|
| Linear easing | Custom cubic-bezier curves |
| Instant state changes | Interpolated transitions |
| Fixed camera | Dynamic camera paths |
| Basic materials | PBR with environment maps |
| No loading state | Orchestrated intro sequence |
| Ignores mobile | Responsive with quality tiers |
| Memory leaks | Proper disposal lifecycle |

---

## Award-Winning Studios Reference

| Studio | Specialty | Learn From |
|--------|-----------|------------|
| **Lusion** | Particles, Physics | Houdini→WebGL pipelines, SDF physics |
| **Active Theory** | Immersive experiences | State-based architecture |
| **Resn** | Creative technology | Playful interactions |
| **Hello Monday** | Brand experiences | Narrative-driven 3D |
| **Makemepulse** | Motion design | Timing and choreography |

---

## File Structure

```
3d-web-graphics-mastery/
├── SKILL.md (this file)
├── references/
│   ├── animation-architecture.md (696 lines)
│   ├── shaders-sdf.md (362 lines)
│   ├── particles-procedural.md (512 lines)
│   ├── post-processing.md (407 lines)
│   ├── physics-xr.md (431 lines)
│   ├── performance.md (375 lines)
│   ├── visual-polish.md (618 lines)
│   ├── premium-execution.md (932 lines)
│   ├── resources.md (258 lines)
│   ├── advanced-techniques.md (NEW - ~600 lines)
│   ├── cutting-edge.md (NEW - ~500 lines)
│   ├── procedural-generation.md (NEW - ~550 lines)
│   ├── skeletal-animation.md (NEW - ~500 lines)
│   ├── noise-functions.md (NEW - ~500 lines)
│   └── expert-resources.md (NEW - ~400 lines)
├── production/
│   ├── project-architecture.md (868 lines)
│   ├── cdn-setup.md (382 lines)
│   └── bug-fixes.md (538 lines)
└── examples/
    ├── premium-hero.html (738 lines)
    └── scroll-experience.html (678 lines)
```

**Total: ~10,000+ lines of production-ready knowledge**

---

## Usage Instructions

1. **Read this SKILL.md first** for essential patterns and quick reference
2. **Consult specific reference files** based on your task (see table above)
3. **Study examples** for complete, working implementations
4. **Check production guides** for architecture and bug fixes
5. **Always apply BOLD philosophy** - dramatic transformations over subtle effects
