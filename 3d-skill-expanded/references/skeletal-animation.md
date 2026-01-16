# Skeletal Animation System

## Animation Mixer Fundamentals

### Basic Setup

```javascript
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let mixer;
const clock = new THREE.Clock();

const loader = new GLTFLoader();
loader.load('character.glb', (gltf) => {
  const model = gltf.scene;
  scene.add(model);
  
  // Create mixer attached to model
  mixer = new THREE.AnimationMixer(model);
  
  // Get all animations
  const animations = gltf.animations;
  
  // Play first animation
  const action = mixer.clipAction(animations[0]);
  action.play();
});

// Update in render loop
function animate() {
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

### Animation Actions Control

```javascript
// Action properties
action.play();
action.stop();
action.reset();
action.paused = true;

// Timing
action.time = 0;                    // Current time
action.timeScale = 1;               // Playback speed (negative = reverse)
action.setDuration(2);              // Set duration
action.setLoop(THREE.LoopRepeat, Infinity);  // Loop mode

// Loop modes
THREE.LoopOnce        // Play once and stop
THREE.LoopRepeat      // Loop continuously
THREE.LoopPingPong    // Play forward then backward

// Weight for blending
action.weight = 1;                  // 0-1 influence
action.setEffectiveWeight(0.5);

// Fading
action.fadeIn(0.5);                 // Fade in over 0.5s
action.fadeOut(0.5);                // Fade out over 0.5s
action.crossFadeFrom(otherAction, 0.5);  // Crossfade
action.crossFadeTo(otherAction, 0.5);
```

---

## Animation Blending

### Crossfade Between Animations

```javascript
class AnimationController {
  constructor(model, animations) {
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.currentAction = null;
    
    // Create actions for all animations
    animations.forEach(clip => {
      this.actions[clip.name] = this.mixer.clipAction(clip);
    });
  }
  
  play(name, fadeTime = 0.5) {
    const newAction = this.actions[name];
    if (!newAction) return;
    
    if (this.currentAction && this.currentAction !== newAction) {
      // Crossfade from current to new
      newAction.reset();
      newAction.setEffectiveWeight(1);
      newAction.play();
      this.currentAction.crossFadeTo(newAction, fadeTime);
    } else {
      newAction.play();
    }
    
    this.currentAction = newAction;
  }
  
  update(delta) {
    this.mixer.update(delta);
  }
}

// Usage
const controller = new AnimationController(model, gltf.animations);
controller.play('idle');

// Transition to walk
controller.play('walk', 0.3);
```

### Additive Blending

```javascript
// Base animation
const idleAction = mixer.clipAction(idleClip);
idleAction.play();

// Additive animation (e.g., breathing, head turn)
const additiveAction = mixer.clipAction(additiveClip);
additiveAction.blendMode = THREE.AdditiveAnimationBlendMode;
additiveAction.setEffectiveWeight(0.5);
additiveAction.play();
```

### Layer-Based Blending

```javascript
class LayeredAnimationController {
  constructor(model, animations) {
    this.mixer = new THREE.AnimationMixer(model);
    this.layers = {
      base: { actions: {}, current: null },
      upper: { actions: {}, current: null },
      additive: { actions: {}, current: null }
    };
    
    // Sort animations into layers
    animations.forEach(clip => {
      const layerName = this.getLayerForClip(clip.name);
      this.layers[layerName].actions[clip.name] = this.mixer.clipAction(clip);
    });
  }
  
  getLayerForClip(clipName) {
    if (clipName.includes('upper_')) return 'upper';
    if (clipName.includes('additive_')) return 'additive';
    return 'base';
  }
  
  playOnLayer(layerName, clipName, fadeTime = 0.3) {
    const layer = this.layers[layerName];
    const newAction = layer.actions[clipName];
    
    if (layer.current && layer.current !== newAction) {
      newAction.reset();
      newAction.play();
      layer.current.crossFadeTo(newAction, fadeTime);
    } else {
      newAction.play();
    }
    
    layer.current = newAction;
  }
}
```

---

## Morph Targets (Blend Shapes)

### Setup and Control

```javascript
loader.load('face.glb', (gltf) => {
  const face = gltf.scene.getObjectByName('Face');
  
  // Access morph target influences
  const influences = face.morphTargetInfluences;
  const dictionary = face.morphTargetDictionary;
  
  console.log('Available morphs:', Object.keys(dictionary));
  // e.g., ['smile', 'frown', 'blink_L', 'blink_R', 'mouth_open']
  
  // Set morph target by name
  influences[dictionary['smile']] = 0.5;
  
  // Animate morphs
  function animateFace(time) {
    influences[dictionary['blink_L']] = Math.sin(time * 5) * 0.5 + 0.5;
    influences[dictionary['blink_R']] = Math.sin(time * 5) * 0.5 + 0.5;
  }
});
```

### Morph Target Animation from glTF

```javascript
// If glTF contains morph animations
loader.load('character.glb', (gltf) => {
  const model = gltf.scene;
  mixer = new THREE.AnimationMixer(model);
  
  // Find animation with morph tracks
  gltf.animations.forEach(clip => {
    clip.tracks.forEach(track => {
      if (track.name.includes('morphTargetInfluences')) {
        console.log('Morph animation found:', track.name);
      }
    });
  });
  
  // Play animation (includes morphs)
  const action = mixer.clipAction(gltf.animations[0]);
  action.play();
});
```

### Procedural Morph Animation

```javascript
class FacialAnimator {
  constructor(mesh) {
    this.mesh = mesh;
    this.influences = mesh.morphTargetInfluences;
    this.dict = mesh.morphTargetDictionary;
    
    // State
    this.blinkTimer = 0;
    this.nextBlink = this.randomBlinkInterval();
  }
  
  randomBlinkInterval() {
    return 2 + Math.random() * 4; // 2-6 seconds
  }
  
  update(delta) {
    // Auto-blink
    this.blinkTimer += delta;
    
    if (this.blinkTimer > this.nextBlink) {
      this.blink();
      this.blinkTimer = 0;
      this.nextBlink = this.randomBlinkInterval();
    }
    
    // Update blink animation
    this.updateBlink(delta);
  }
  
  blink() {
    this.blinkProgress = 0;
    this.isBlinking = true;
  }
  
  updateBlink(delta) {
    if (!this.isBlinking) return;
    
    this.blinkProgress += delta * 8; // Speed
    
    // Quick close, slower open
    let blinkValue;
    if (this.blinkProgress < 0.5) {
      blinkValue = this.blinkProgress * 2;
    } else {
      blinkValue = 1 - (this.blinkProgress - 0.5) * 2;
    }
    
    blinkValue = Math.max(0, Math.min(1, blinkValue));
    
    this.influences[this.dict['blink_L']] = blinkValue;
    this.influences[this.dict['blink_R']] = blinkValue;
    
    if (this.blinkProgress >= 1) {
      this.isBlinking = false;
    }
  }
  
  // Emotion presets
  setEmotion(emotion, weight = 1) {
    const emotions = {
      happy: { smile: 0.8, eyebrows_up: 0.3 },
      sad: { frown: 0.7, eyebrows_down: 0.5 },
      angry: { frown: 0.5, eyebrows_down: 0.8, mouth_tight: 0.4 },
      surprised: { mouth_open: 0.6, eyebrows_up: 0.8 }
    };
    
    const preset = emotions[emotion];
    if (!preset) return;
    
    Object.entries(preset).forEach(([morph, value]) => {
      if (this.dict[morph] !== undefined) {
        this.influences[this.dict[morph]] = value * weight;
      }
    });
  }
}
```

---

## Bone Manipulation

### Direct Bone Control

```javascript
loader.load('character.glb', (gltf) => {
  const model = gltf.scene;
  
  // Find bones
  const skeleton = model.getObjectByName('Armature');
  const head = skeleton.getObjectByName('Head');
  const spine = skeleton.getObjectByName('Spine');
  const handL = skeleton.getObjectByName('Hand_L');
  
  // Store original rotations
  const originalHeadRotation = head.rotation.clone();
  
  // Update bone rotation
  function lookAt(target) {
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(target, head.getWorldPosition(new THREE.Vector3()));
    direction.normalize();
    
    // Convert to local space
    const parentWorldQuaternion = new THREE.Quaternion();
    head.parent.getWorldQuaternion(parentWorldQuaternion);
    parentWorldQuaternion.invert();
    
    const localDirection = direction.clone();
    localDirection.applyQuaternion(parentWorldQuaternion);
    
    // Create rotation
    const targetQuaternion = new THREE.Quaternion();
    targetQuaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), // Bone's forward axis
      localDirection
    );
    
    // Apply with limits
    head.quaternion.slerp(targetQuaternion, 0.1);
  }
});
```

### IK (Inverse Kinematics) with CCDIKSolver

```javascript
import { CCDIKSolver } from 'three/examples/jsm/animation/CCDIKSolver.js';

loader.load('character.glb', (gltf) => {
  const model = gltf.scene;
  const skinnedMesh = model.getObjectByProperty('type', 'SkinnedMesh');
  
  // Define IK chain
  const iks = [
    {
      target: 22, // Target bone index (e.g., hand target)
      effector: 20, // End effector bone (e.g., hand)
      links: [
        { index: 19, rotationMin: new THREE.Vector3(-Math.PI, 0, 0), 
                     rotationMax: new THREE.Vector3(0, 0, 0) }, // Elbow
        { index: 18 }, // Upper arm
        { index: 17 }  // Shoulder
      ]
    }
  ];
  
  const ikSolver = new CCDIKSolver(skinnedMesh, iks);
  
  // Create IK target helper
  const targetBone = skinnedMesh.skeleton.bones[22];
  
  function animate() {
    // Move target
    targetBone.position.copy(mouseWorldPosition);
    
    // Solve IK
    ikSolver.update();
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
});
```

---

## Animation Events

### Using Animation Events

```javascript
// Add event to animation clip
const clip = gltf.animations[0];

// Create event at specific time
mixer.addEventListener('loop', (e) => {
  console.log('Animation looped:', e.action.getClip().name);
});

mixer.addEventListener('finished', (e) => {
  console.log('Animation finished:', e.action.getClip().name);
  // Trigger next animation
  controller.play('idle');
});

// Custom events using time markers
class AnimationEventSystem {
  constructor(mixer) {
    this.mixer = mixer;
    this.events = new Map();
    this.firedEvents = new Set();
  }
  
  addEvent(clipName, time, callback) {
    const key = `${clipName}_${time}`;
    this.events.set(key, { clipName, time, callback });
  }
  
  update() {
    this.events.forEach((event, key) => {
      const action = this.mixer._actions.find(
        a => a.getClip().name === event.clipName
      );
      
      if (action && action.isRunning()) {
        const currentTime = action.time;
        
        if (currentTime >= event.time && !this.firedEvents.has(key)) {
          event.callback();
          this.firedEvents.add(key);
        }
        
        // Reset for looping animations
        if (currentTime < event.time) {
          this.firedEvents.delete(key);
        }
      }
    });
  }
}

// Usage
const eventSystem = new AnimationEventSystem(mixer);
eventSystem.addEvent('walk', 0.3, () => playFootstepSound('left'));
eventSystem.addEvent('walk', 0.8, () => playFootstepSound('right'));
```

---

## Root Motion

### Extracting Root Motion from Animation

```javascript
class RootMotionController {
  constructor(model, mixer) {
    this.model = model;
    this.mixer = mixer;
    this.rootBone = model.getObjectByName('Root') || model.getObjectByName('Hips');
    
    this.previousRootPosition = new THREE.Vector3();
    this.previousRootRotation = new THREE.Quaternion();
    
    if (this.rootBone) {
      this.previousRootPosition.copy(this.rootBone.position);
      this.previousRootRotation.copy(this.rootBone.quaternion);
    }
  }
  
  update(delta) {
    if (!this.rootBone) return { position: new THREE.Vector3(), rotation: new THREE.Quaternion() };
    
    // Calculate delta movement
    const deltaPosition = new THREE.Vector3();
    deltaPosition.subVectors(this.rootBone.position, this.previousRootPosition);
    
    const deltaRotation = new THREE.Quaternion();
    deltaRotation.copy(this.previousRootRotation).invert();
    deltaRotation.multiply(this.rootBone.quaternion);
    
    // Apply to model (world space)
    const worldDelta = deltaPosition.clone();
    worldDelta.applyQuaternion(this.model.quaternion);
    this.model.position.add(worldDelta);
    
    // Reset root bone to origin (bake motion into model transform)
    this.rootBone.position.set(0, this.rootBone.position.y, 0);
    
    // Store for next frame
    this.previousRootPosition.copy(this.rootBone.position);
    this.previousRootRotation.copy(this.rootBone.quaternion);
    
    return { position: deltaPosition, rotation: deltaRotation };
  }
}
```

---

## Skinning Performance

### GPU Skinning (Default)

Three.js uses GPU skinning by default, which is efficient for most cases.

### Skeleton Helper for Debugging

```javascript
const helper = new THREE.SkeletonHelper(model);
scene.add(helper);
```

### Optimizing Skinned Meshes

```javascript
// Share skeleton between meshes
const sharedSkeleton = originalMesh.skeleton;
clonedMesh.bind(sharedSkeleton);

// Reduce bone count
// In Blender: Remove unused bones, merge similar bones

// LOD for skinned meshes
const lod = new THREE.LOD();
lod.addLevel(highDetailSkinnedMesh, 0);
lod.addLevel(lowDetailSkinnedMesh, 50);
lod.addLevel(billboardSprite, 100);
```

### Bone Limits

| Platform | Max Bones per Mesh |
|----------|-------------------|
| Desktop WebGL | 256 |
| Mobile WebGL | 64-128 |
| WebGPU | 1024+ |

---

## React Three Fiber Animation

```jsx
import { useAnimations, useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';

function AnimatedCharacter({ animation = 'idle' }) {
  const group = useRef();
  const { scene, animations } = useGLTF('/character.glb');
  const { actions, mixer } = useAnimations(animations, group);
  
  useEffect(() => {
    // Fade to new animation
    const currentAction = actions[animation];
    
    if (currentAction) {
      // Fade out all other actions
      Object.values(actions).forEach(action => {
        if (action !== currentAction) {
          action.fadeOut(0.3);
        }
      });
      
      // Fade in current
      currentAction.reset().fadeIn(0.3).play();
    }
    
    return () => {
      currentAction?.fadeOut(0.3);
    };
  }, [animation, actions]);
  
  return <primitive ref={group} object={scene} />;
}

// Usage
<AnimatedCharacter animation="walk" />
```
