# Animation Architecture

## State Machines for Complex Sequences

### Why State Machines?

State machines prevent:
- Impossible states (`isLoading && isComplete`)
- Animation conflicts
- Race conditions
- Debugging nightmares

### Simple State Machine Implementation

```javascript
class AnimationStateMachine {
  constructor(initialState, states) {
    this.states = states;
    this.currentState = initialState;
    this.history = [];
    this.listeners = new Set();
    
    // Enter initial state
    this.states[initialState]?.enter?.();
  }
  
  transition(event) {
    const current = this.states[this.currentState];
    const nextState = current?.transitions?.[event];
    
    if (!nextState) {
      console.warn(`No transition "${event}" from state "${this.currentState}"`);
      return false;
    }
    
    if (!this.states[nextState]) {
      console.error(`State "${nextState}" does not exist`);
      return false;
    }
    
    // Exit current state
    current?.exit?.();
    
    // Track history
    this.history.push({ from: this.currentState, to: nextState, event });
    
    // Enter new state
    this.currentState = nextState;
    this.states[nextState]?.enter?.();
    
    // Notify listeners
    this.listeners.forEach(fn => fn(this.currentState, event));
    
    return true;
  }
  
  onTransition(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  is(state) {
    return this.currentState === state;
  }
}

// Usage: Page scroll experience
const pageStateMachine = new AnimationStateMachine('initial', {
  initial: {
    enter: () => {
      gsap.set('.hero', { opacity: 0, y: 100 });
      gsap.set('.content', { opacity: 0 });
    },
    transitions: {
      loaded: 'intro'
    }
  },
  
  intro: {
    enter: () => {
      const tl = gsap.timeline({
        onComplete: () => pageStateMachine.transition('introComplete')
      });
      
      tl.to('.hero', { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })
        .to('.content', { opacity: 1, duration: 0.8 }, '-=0.5');
    },
    transitions: {
      introComplete: 'idle',
      skip: 'idle'
    }
  },
  
  idle: {
    enter: () => {
      // Enable scroll-based animations
      ScrollTrigger.enable();
    },
    exit: () => {
      ScrollTrigger.disable();
    },
    transitions: {
      scrollStart: 'scrolling',
      interact: 'interactive'
    }
  },
  
  scrolling: {
    enter: () => {
      // Scroll-specific animations active
    },
    transitions: {
      scrollEnd: 'idle',
      sectionChange: 'transitioning'
    }
  },
  
  transitioning: {
    enter: () => {
      // Play section transition
      gsap.to(camera.position, {
        duration: 1.5,
        ease: 'power2.inOut',
        onComplete: () => pageStateMachine.transition('transitionComplete')
      });
    },
    transitions: {
      transitionComplete: 'scrolling'
    }
  },
  
  interactive: {
    enter: () => {
      // User is actively interacting with 3D element
      controls.enabled = true;
    },
    exit: () => {
      controls.enabled = false;
    },
    transitions: {
      interactEnd: 'idle'
    }
  }
});
```

### XState Integration (Production-Grade)

```javascript
import { createMachine, interpret } from 'xstate';

const sceneMachine = createMachine({
  id: 'scene',
  initial: 'loading',
  context: {
    progress: 0,
    currentSection: 0,
    interactionTarget: null
  },
  states: {
    loading: {
      on: {
        PROGRESS: {
          actions: 'updateProgress'
        },
        LOADED: 'intro'
      }
    },
    intro: {
      entry: 'playIntroAnimation',
      after: {
        3000: 'active'
      },
      on: {
        SKIP: 'active'
      }
    },
    active: {
      initial: 'idle',
      states: {
        idle: {
          on: {
            SCROLL: 'scrolling',
            CLICK: {
              target: 'interacting',
              actions: 'setInteractionTarget'
            }
          }
        },
        scrolling: {
          on: {
            SCROLL_END: 'idle',
            SECTION_CHANGE: {
              target: 'transitioning',
              actions: 'updateSection'
            }
          }
        },
        transitioning: {
          entry: 'playSectionTransition',
          on: {
            TRANSITION_COMPLETE: 'idle'
          }
        },
        interacting: {
          entry: 'enableControls',
          exit: 'disableControls',
          on: {
            RELEASE: 'idle'
          }
        }
      }
    }
  }
}, {
  actions: {
    updateProgress: (context, event) => {
      context.progress = event.value;
    },
    playIntroAnimation: () => {
      // GSAP timeline
    },
    setInteractionTarget: (context, event) => {
      context.interactionTarget = event.target;
    },
    updateSection: (context, event) => {
      context.currentSection = event.section;
    },
    playSectionTransition: (context) => {
      // Animate to new section
    },
    enableControls: () => {
      controls.enabled = true;
    },
    disableControls: () => {
      controls.enabled = false;
    }
  }
});

const sceneService = interpret(sceneMachine).start();

// React to state changes
sceneService.onTransition(state => {
  console.log('State:', state.value);
});

// Send events
sceneService.send('LOADED');
sceneService.send({ type: 'SCROLL', delta: 100 });
```

## Timeline Orchestration

### GSAP Timeline with Labels

```javascript
function createMasterTimeline() {
  const master = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.inOut' }
  });
  
  // Section 1: Hero reveal
  master.addLabel('hero')
    .from('.hero-title', { y: 100, opacity: 0, duration: 1 })
    .from('.hero-subtitle', { y: 50, opacity: 0, duration: 0.8 }, '-=0.5')
    .to(heroMesh.position, { y: 0, duration: 1.5 }, '-=1')
    .to(heroMesh.rotation, { y: Math.PI * 2, duration: 2 }, '-=1.5');
  
  // Section 2: Features
  master.addLabel('features', '+=0.5')
    .to(camera.position, { x: 5, z: 8, duration: 1.5 })
    .from('.feature-cards', { 
      y: 100, 
      opacity: 0, 
      stagger: 0.2,
      duration: 0.8 
    }, '-=0.5');
  
  // Section 3: Showcase
  master.addLabel('showcase', '+=0.5')
    .to(camera.position, { x: -3, y: 4, z: 6, duration: 1.5 })
    .to(showcaseMesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 1 }, '-=1')
    .from('.showcase-text', { opacity: 0, x: -50, duration: 0.8 }, '-=0.5');
  
  // Section 4: Finale
  master.addLabel('finale', '+=0.5')
    .to(camera.position, { x: 0, y: 1, z: 5, duration: 2 })
    .to(scene.fog, { near: 1, far: 10, duration: 2 }, '-=2')
    .from('.cta-button', { scale: 0, duration: 0.5, ease: 'back.out(2)' });
  
  return master;
}

const masterTimeline = createMasterTimeline();

// Connect to scroll
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  onUpdate: self => {
    masterTimeline.progress(self.progress);
  }
});

// Or jump to labels
function goToSection(label) {
  gsap.to(masterTimeline, {
    progress: masterTimeline.labels[label] / masterTimeline.duration(),
    duration: 1.5,
    ease: 'power2.inOut'
  });
}
```

### Scroll-Progress Based Orchestration

```javascript
class ScrollOrchestrator {
  constructor() {
    this.sections = [];
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.smoothing = 0.1;
  }
  
  addSection(config) {
    this.sections.push({
      start: config.start,
      end: config.end,
      onEnter: config.onEnter,
      onLeave: config.onLeave,
      onProgress: config.onProgress,
      active: false
    });
    
    // Sort by start position
    this.sections.sort((a, b) => a.start - b.start);
  }
  
  update(scrollProgress) {
    this.targetProgress = scrollProgress;
    
    // Smooth interpolation
    this.currentProgress += (this.targetProgress - this.currentProgress) * this.smoothing;
    
    this.sections.forEach(section => {
      const isInRange = this.currentProgress >= section.start && 
                       this.currentProgress <= section.end;
      
      // Handle enter/leave
      if (isInRange && !section.active) {
        section.active = true;
        section.onEnter?.();
      } else if (!isInRange && section.active) {
        section.active = false;
        section.onLeave?.();
      }
      
      // Handle progress within section
      if (isInRange) {
        const localProgress = (this.currentProgress - section.start) / 
                             (section.end - section.start);
        section.onProgress?.(localProgress);
      }
    });
  }
}

// Usage
const orchestrator = new ScrollOrchestrator();

orchestrator.addSection({
  start: 0,
  end: 0.25,
  onEnter: () => console.log('Entered hero section'),
  onProgress: (p) => {
    heroMesh.rotation.y = p * Math.PI;
    heroMesh.position.y = THREE.MathUtils.lerp(0, 2, easeOutCubic(p));
  },
  onLeave: () => console.log('Left hero section')
});

orchestrator.addSection({
  start: 0.25,
  end: 0.5,
  onEnter: () => {
    gsap.to(camera.position, { x: 5, duration: 1 });
  },
  onProgress: (p) => {
    featuresMesh.scale.setScalar(0.5 + p * 0.5);
  }
});

// Connect to Lenis
lenis.on('scroll', ({ progress }) => {
  orchestrator.update(progress);
});
```

## Multi-Element Coordination

### Hierarchical Animation Groups

```javascript
class AnimationGroup extends THREE.Group {
  constructor() {
    super();
    this.animationState = {
      progress: 0,
      active: false
    };
    this.children = [];
  }
  
  addAnimatedChild(child, animationConfig) {
    child.userData.animation = animationConfig;
    this.add(child);
  }
  
  setProgress(progress) {
    this.animationState.progress = progress;
    
    this.children.forEach(child => {
      const config = child.userData.animation;
      if (!config) return;
      
      // Calculate local progress with stagger
      const stagger = config.stagger || 0;
      const localStart = stagger;
      const localEnd = 1 - (1 - stagger) * 0.2;
      
      let localProgress = (progress - localStart) / (localEnd - localStart);
      localProgress = Math.max(0, Math.min(1, localProgress));
      
      // Apply easing
      const ease = config.ease || (t => t);
      const easedProgress = ease(localProgress);
      
      // Apply transforms
      if (config.position) {
        child.position.lerpVectors(
          config.position.from,
          config.position.to,
          easedProgress
        );
      }
      
      if (config.rotation) {
        child.rotation.x = THREE.MathUtils.lerp(
          config.rotation.from.x, config.rotation.to.x, easedProgress
        );
        child.rotation.y = THREE.MathUtils.lerp(
          config.rotation.from.y, config.rotation.to.y, easedProgress
        );
      }
      
      if (config.scale) {
        const s = THREE.MathUtils.lerp(config.scale.from, config.scale.to, easedProgress);
        child.scale.setScalar(s);
      }
      
      if (config.opacity && child.material) {
        child.material.opacity = THREE.MathUtils.lerp(
          config.opacity.from, config.opacity.to, easedProgress
        );
      }
    });
  }
}

// Usage
const heroGroup = new AnimationGroup();

heroGroup.addAnimatedChild(mainMesh, {
  stagger: 0,
  ease: easeOutCubic,
  position: {
    from: new THREE.Vector3(0, -5, 0),
    to: new THREE.Vector3(0, 0, 0)
  },
  rotation: {
    from: { x: 0, y: -Math.PI },
    to: { x: 0, y: 0 }
  }
});

heroGroup.addAnimatedChild(accentMesh1, {
  stagger: 0.2,
  ease: easeOutBack,
  position: {
    from: new THREE.Vector3(-2, -3, 0),
    to: new THREE.Vector3(-2, 0, 0)
  },
  scale: { from: 0, to: 1 }
});

heroGroup.addAnimatedChild(accentMesh2, {
  stagger: 0.4,
  ease: easeOutBack,
  position: {
    from: new THREE.Vector3(2, -3, 0),
    to: new THREE.Vector3(2, 0, 0)
  },
  scale: { from: 0, to: 1 }
});

scene.add(heroGroup);

// Animate the whole group
gsap.to({ progress: 0 }, {
  progress: 1,
  duration: 2,
  ease: 'none',
  onUpdate: function() {
    heroGroup.setProgress(this.targets()[0].progress);
  }
});
```

### Camera Path Animation

```javascript
class CameraPathAnimator {
  constructor(camera, renderer, scene) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.path = null;
    this.lookAtPath = null;
    this.progress = 0;
  }
  
  setPath(points, lookAtPoints = null) {
    this.path = new THREE.CatmullRomCurve3(
      points.map(p => new THREE.Vector3(...p))
    );
    
    if (lookAtPoints) {
      this.lookAtPath = new THREE.CatmullRomCurve3(
        lookAtPoints.map(p => new THREE.Vector3(...p))
      );
    }
  }
  
  setProgress(progress) {
    this.progress = Math.max(0, Math.min(1, progress));
    
    if (this.path) {
      const position = this.path.getPoint(this.progress);
      this.camera.position.copy(position);
      
      if (this.lookAtPath) {
        const lookAt = this.lookAtPath.getPoint(this.progress);
        this.camera.lookAt(lookAt);
      } else {
        // Look along the path tangent
        const tangent = this.path.getTangent(this.progress);
        const lookAt = position.clone().add(tangent);
        this.camera.lookAt(lookAt);
      }
    }
  }
  
  // Visualize path for debugging
  createHelper() {
    const points = this.path.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
    return new THREE.Line(geometry, material);
  }
}

// Usage
const cameraAnimator = new CameraPathAnimator(camera, renderer, scene);

cameraAnimator.setPath([
  [0, 2, 10],   // Start
  [5, 3, 7],    // Move right
  [3, 4, 4],    // Move up
  [-2, 3, 6],   // Move left
  [0, 2, 5]     // End
], [
  [0, 0, 0],    // Look at center
  [0, 1, 0],
  [0, 2, 0],
  [0, 1, 0],
  [0, 0, 0]
]);

// Connect to scroll
ScrollTrigger.create({
  trigger: 'body',
  start: 'top top',
  end: 'bottom bottom',
  scrub: 1,
  onUpdate: self => {
    cameraAnimator.setProgress(self.progress);
    renderer.render(scene, camera);
  }
});
```

## Performance Considerations

### Throttled Updates

```javascript
class ThrottledAnimator {
  constructor(targetFPS = 60) {
    this.interval = 1000 / targetFPS;
    this.lastTime = 0;
    this.accumulator = 0;
  }
  
  shouldUpdate(currentTime) {
    const delta = currentTime - this.lastTime;
    this.accumulator += delta;
    this.lastTime = currentTime;
    
    if (this.accumulator >= this.interval) {
      this.accumulator = 0;
      return true;
    }
    return false;
  }
}

// Limit scroll handler to 60fps
const animator = new ThrottledAnimator(60);

lenis.on('scroll', ({ progress }) => {
  if (animator.shouldUpdate(performance.now())) {
    updateScene(progress);
  }
});
```

### Render on Demand

```javascript
class OnDemandRenderer {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.needsRender = true;
    this.rafId = null;
  }
  
  invalidate() {
    this.needsRender = true;
    
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this.render());
    }
  }
  
  render() {
    this.rafId = null;
    
    if (this.needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.needsRender = false;
    }
  }
  
  // For continuous animation, call this in a loop
  continuousRender() {
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(() => this.continuousRender());
  }
  
  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// Usage
const onDemand = new OnDemandRenderer(renderer, scene, camera);

// Only render when something changes
mesh.position.x = 5;
onDemand.invalidate();

// For scroll, render on demand
ScrollTrigger.create({
  onUpdate: () => onDemand.invalidate()
});
```
