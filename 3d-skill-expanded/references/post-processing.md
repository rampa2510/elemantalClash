# Post-Processing Reference

## pmndrs/postprocessing (Recommended)

### Setup
```javascript
import { 
  EffectComposer, 
  RenderPass, 
  EffectPass,
  BloomEffect,
  SMAAEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  VignetteEffect,
  ToneMappingEffect,
  NoiseEffect,
  GodRaysEffect,
  SSAOEffect,
  OutlineEffect
} from 'postprocessing';

const composer = new EffectComposer(renderer, {
  frameBufferType: THREE.HalfFloatType  // For HDR
});

composer.addPass(new RenderPass(scene, camera));
```

### Bloom
```javascript
const bloom = new BloomEffect({
  intensity: 1.5,
  luminanceThreshold: 0.4,
  luminanceSmoothing: 0.9,
  mipmapBlur: true,
  radius: 0.8,
  levels: 5
});

composer.addPass(new EffectPass(camera, bloom));

// Selective bloom (emissive materials)
material.emissive = new THREE.Color(0xff0000);
material.emissiveIntensity = 2.0;
```

### Depth of Field
```javascript
const dof = new DepthOfFieldEffect(camera, {
  focusDistance: 0.0,
  focalLength: 0.048,
  bokehScale: 2.0,
  height: 480,
  worldFocusDistance: null,
  worldFocusRange: null
});

// Update focus based on raycast
function updateFocus(target) {
  const distance = camera.position.distanceTo(target);
  dof.circleOfConfusionMaterial.uniforms.focusDistance.value = distance;
}
```

### Chromatic Aberration
```javascript
const chromaticAberration = new ChromaticAberrationEffect({
  offset: new THREE.Vector2(0.002, 0.002),
  radialModulation: true,
  modulationOffset: 0.5
});

// Animate offset
function animate() {
  chromaticAberration.offset.x = Math.sin(time * 0.5) * 0.003;
  chromaticAberration.offset.y = Math.cos(time * 0.3) * 0.003;
}
```

### SSAO (Screen Space Ambient Occlusion)
```javascript
import { SSAOEffect, NormalPass } from 'postprocessing';

const normalPass = new NormalPass(scene, camera);
composer.addPass(normalPass);

const ssao = new SSAOEffect(camera, normalPass.texture, {
  blendFunction: BlendFunction.MULTIPLY,
  samples: 16,
  rings: 4,
  distanceThreshold: 0.6,
  distanceFalloff: 0.1,
  rangeThreshold: 0.05,
  rangeFalloff: 0.01,
  luminanceInfluence: 0.7,
  radius: 0.05,
  scale: 0.5,
  bias: 0.025
});

composer.addPass(new EffectPass(camera, ssao));
```

### God Rays
```javascript
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(1, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffddaa })
);
sunMesh.position.set(0, 10, -20);
scene.add(sunMesh);

const godRays = new GodRaysEffect(camera, sunMesh, {
  density: 0.96,
  decay: 0.93,
  weight: 0.4,
  exposure: 0.55,
  samples: 60,
  clampMax: 1.0
});

composer.addPass(new EffectPass(camera, godRays));
```

### Outline
```javascript
const outline = new OutlineEffect(scene, camera, {
  blendFunction: BlendFunction.SCREEN,
  edgeStrength: 2.5,
  pulseSpeed: 0.0,
  visibleEdgeColor: 0xffffff,
  hiddenEdgeColor: 0x22090a,
  blur: false,
  xRay: true
});

// Add objects to outline
outline.selection.add(mesh1);
outline.selection.add(mesh2);

composer.addPass(new EffectPass(camera, outline));
```

### Anti-aliasing
```javascript
// SMAA (recommended for most cases)
const smaa = new SMAAEffect({
  preset: SMAAPreset.ULTRA
});

// FXAA (faster, lower quality)
import { FXAAEffect } from 'postprocessing';
const fxaa = new FXAAEffect();

composer.addPass(new EffectPass(camera, smaa));
```

### Combining Effects
```javascript
// Single pass for multiple effects (better performance)
composer.addPass(new EffectPass(camera, 
  bloom,
  chromaticAberration,
  vignette,
  smaa
));
```

## React Three Fiber Post-Processing

### Basic Setup
```jsx
import { 
  EffectComposer, 
  Bloom, 
  ChromaticAberration,
  DepthOfField,
  Noise,
  Vignette,
  SMAA,
  ToneMapping
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';

function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <SMAA />
      <Bloom
        intensity={1.5}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[0.002, 0.002]}
        radialModulation
        modulationOffset={0.5}
      />
      <Vignette
        offset={0.3}
        darkness={0.9}
        blendFunction={BlendFunction.NORMAL}
      />
      <Noise opacity={0.02} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
```

### Depth of Field
```jsx
import { DepthOfField } from '@react-three/postprocessing';

function Effects() {
  const depthOfFieldRef = useRef();
  
  // Update focus on click
  const handleClick = (event) => {
    const distance = event.distance;
    if (depthOfFieldRef.current) {
      depthOfFieldRef.current.target = distance;
    }
  };
  
  return (
    <EffectComposer>
      <DepthOfField
        ref={depthOfFieldRef}
        focusDistance={0}
        focalLength={0.02}
        bokehScale={2}
        height={480}
      />
    </EffectComposer>
  );
}
```

### Selective Bloom
```jsx
import { SelectiveBloom } from '@react-three/postprocessing';

function Effects() {
  const lightRef = useRef();
  
  return (
    <>
      <mesh ref={lightRef}>
        <sphereGeometry args={[0.5]} />
        <meshBasicMaterial color="yellow" />
      </mesh>
      
      <EffectComposer>
        <SelectiveBloom
          lights={[lightRef]}
          selection={[lightRef]}
          intensity={2}
          luminanceThreshold={0}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}
```

## Custom Post-Processing Effects

### Creating Custom Effect
```javascript
import { Effect } from 'postprocessing';

const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec2 uResolution;
  
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Scanlines
    float scanline = sin(uv.y * uResolution.y * 2.0) * 0.02 * uIntensity;
    
    // Vignette
    float vignette = 1.0 - length(uv - 0.5) * uIntensity;
    
    // RGB shift
    vec2 offset = vec2(0.002 * uIntensity, 0.0);
    vec4 r = texture2D(inputBuffer, uv + offset);
    vec4 g = texture2D(inputBuffer, uv);
    vec4 b = texture2D(inputBuffer, uv - offset);
    
    vec3 color = vec3(r.r, g.g, b.b);
    color += scanline;
    color *= vignette;
    
    outputColor = vec4(color, inputColor.a);
  }
`;

class RetroEffect extends Effect {
  constructor({ intensity = 1.0 } = {}) {
    super('RetroEffect', fragmentShader, {
      uniforms: new Map([
        ['uTime', new THREE.Uniform(0)],
        ['uIntensity', new THREE.Uniform(intensity)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2())]
      ])
    });
  }
  
  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += deltaTime;
    
    const size = renderer.getSize(new THREE.Vector2());
    this.uniforms.get('uResolution').value.copy(size);
  }
}

// Usage
const retroEffect = new RetroEffect({ intensity: 0.5 });
composer.addPass(new EffectPass(camera, retroEffect));
```

### Custom Effect in R3F
```jsx
import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';

const fragmentShader = `/* ... */`;

class GlitchEffectImpl extends Effect {
  constructor(props) {
    super('GlitchEffect', fragmentShader, {
      uniforms: new Map([
        ['uTime', new THREE.Uniform(0)],
        ['uAmount', new THREE.Uniform(props.amount || 0.5)]
      ])
    });
  }
  
  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += deltaTime;
  }
}

const GlitchEffect = forwardRef(({ amount = 0.5 }, ref) => {
  const effect = useMemo(() => new GlitchEffectImpl({ amount }), [amount]);
  return <primitive ref={ref} object={effect} dispose={null} />;
});

// Usage
<EffectComposer>
  <GlitchEffect amount={0.3} />
</EffectComposer>
```

## Common Effect Combinations

### Cinematic Look
```jsx
<EffectComposer>
  <SMAA />
  <Bloom intensity={0.5} luminanceThreshold={0.8} />
  <Vignette offset={0.5} darkness={0.5} />
  <ChromaticAberration offset={[0.001, 0.001]} radialModulation />
  <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
</EffectComposer>
```

### Stylized / Toon
```jsx
<EffectComposer>
  <Outline 
    visibleEdgeColor={0x000000}
    edgeStrength={2}
    blur
  />
  <Pixelation granularity={4} />
  <Noise opacity={0.05} />
</EffectComposer>
```

### Sci-Fi / Cyberpunk
```jsx
<EffectComposer>
  <Bloom intensity={2} luminanceThreshold={0.2} mipmapBlur />
  <ChromaticAberration offset={[0.005, 0.005]} />
  <Scanline density={1.5} />
  <Glitch active />
  <Noise opacity={0.1} />
</EffectComposer>
```

## Performance Tips

1. **Use EffectPass** for multiple effects (single pass)
2. **Reduce resolution** for expensive effects (DOF, SSAO)
3. **Disable multisampling** when using post-processing
4. **Use HalfFloatType** for HDR rendering
5. **Profile with Chrome DevTools**

## Resources
- **pmndrs/postprocessing**: https://github.com/pmndrs/postprocessing
- **@react-three/postprocessing**: https://docs.pmnd.rs/react-postprocessing
- **Effect API Docs**: https://pmndrs.github.io/postprocessing/public/docs/
