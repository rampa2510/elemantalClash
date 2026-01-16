# Physics & WebXR Reference

## Physics Engine Comparison

| Engine | Language | Performance | Best For |
|--------|----------|-------------|----------|
| **Rapier** | Rust/WASM | Excellent | Production, determinism |
| **Cannon-es** | JavaScript | Good | Simple projects |
| **Jolt** | C++/WASM | Excellent | Complex simulations |
| **Ammo.js** | C++/WASM | Good | Bullet physics port |
| **Oimo.js** | JavaScript | Medium | Lightweight |

## Rapier (Recommended)

### Vanilla Three.js Setup
```javascript
import RAPIER from '@dimforge/rapier3d';

// Initialize
await RAPIER.init();

const gravity = { x: 0.0, y: -9.81, z: 0.0 };
const world = new RAPIER.World(gravity);

// Create ground
const groundColliderDesc = RAPIER.ColliderDesc.cuboid(10.0, 0.1, 10.0);
world.createCollider(groundColliderDesc);

// Create dynamic body
const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
  .setTranslation(0.0, 5.0, 0.0);
const rigidBody = world.createRigidBody(rigidBodyDesc);

const colliderDesc = RAPIER.ColliderDesc.ball(0.5)
  .setRestitution(0.7);
world.createCollider(colliderDesc, rigidBody);

// Create Three.js mesh
const mesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.5),
  new THREE.MeshStandardMaterial()
);
scene.add(mesh);

// Update loop
function animate() {
  world.step();
  
  const position = rigidBody.translation();
  const rotation = rigidBody.rotation();
  
  mesh.position.set(position.x, position.y, position.z);
  mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
```

### React Three Rapier
```jsx
import { Physics, RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';

function Scene() {
  return (
    <Physics gravity={[0, -9.81, 0]} debug>
      {/* Static ground */}
      <RigidBody type="fixed">
        <mesh position={[0, -0.5, 0]}>
          <boxGeometry args={[20, 1, 20]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </RigidBody>
      
      {/* Dynamic ball */}
      <RigidBody position={[0, 5, 0]} restitution={0.7}>
        <mesh>
          <sphereGeometry args={[0.5]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <BallCollider args={[0.5]} />
      </RigidBody>
      
      {/* Kinematic body */}
      <RigidBody type="kinematicPosition" position={[2, 1, 0]}>
        <mesh>
          <boxGeometry args={[2, 0.2, 2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </RigidBody>
    </Physics>
  );
}
```

### Character Controller
```jsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier } from '@react-three/rapier';
import { useKeyboardControls } from '@react-three/drei';

function Character() {
  const rigidBodyRef = useRef();
  const [, getKeys] = useKeyboardControls();
  const { rapier, world } = useRapier();
  
  const SPEED = 5;
  const JUMP_FORCE = 5;
  
  useFrame(() => {
    const { forward, backward, left, right, jump } = getKeys();
    
    const rigidBody = rigidBodyRef.current;
    if (!rigidBody) return;
    
    const velocity = rigidBody.linvel();
    
    // Movement
    const direction = { x: 0, z: 0 };
    if (forward) direction.z = -1;
    if (backward) direction.z = 1;
    if (left) direction.x = -1;
    if (right) direction.x = 1;
    
    rigidBody.setLinvel({
      x: direction.x * SPEED,
      y: velocity.y,
      z: direction.z * SPEED
    }, true);
    
    // Jump (with ground check)
    if (jump) {
      const origin = rigidBody.translation();
      origin.y -= 1.0;
      
      const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, 0.2, true);
      
      if (hit) {
        rigidBody.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
      }
    }
  });
  
  return (
    <RigidBody ref={rigidBodyRef} colliders={false} enabledRotations={[false, false, false]}>
      <CapsuleCollider args={[0.5, 0.5]} position={[0, 1, 0]} />
      <mesh>
        <capsuleGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  );
}
```

### Joints
```jsx
import { RigidBody, SphericalJoint, RevoluteJoint, PrismaticJoint } from '@react-three/rapier';

// Spherical joint (ball and socket)
<SphericalJoint
  body1={body1Ref}
  body2={body2Ref}
  anchor1={[0, 0.5, 0]}
  anchor2={[0, -0.5, 0]}
/>

// Revolute joint (hinge)
<RevoluteJoint
  body1={body1Ref}
  body2={body2Ref}
  anchor={[0, 0, 0]}
  axis={[0, 1, 0]}
/>

// Prismatic joint (slider)
<PrismaticJoint
  body1={body1Ref}
  body2={body2Ref}
  anchor={[0, 0, 0]}
  axis={[1, 0, 0]}
  limits={[-2, 2]}
/>
```

## Cannon-es

### React Three Cannon
```jsx
import { Physics, useSphere, useBox, usePlane } from '@react-three/cannon';

function Scene() {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <Ground />
      <Ball />
    </Physics>
  );
}

function Ground() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0]
  }));
  
  return (
    <mesh ref={ref}>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
}

function Ball() {
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position: [0, 5, 0],
    args: [0.5]
  }));
  
  const handleClick = () => {
    api.applyImpulse([0, 5, 0], [0, 0, 0]);
  };
  
  return (
    <mesh ref={ref} onClick={handleClick}>
      <sphereGeometry args={[0.5]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
}
```

## WebXR

### VR Setup (Vanilla)
```javascript
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Enable XR
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));

// Controllers
const controllerModelFactory = new XRControllerModelFactory();

const controller1 = renderer.xr.getController(0);
scene.add(controller1);

const controller2 = renderer.xr.getController(1);
scene.add(controller2);

// Controller models
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
scene.add(controllerGrip1);

// Controller events
controller1.addEventListener('selectstart', onSelectStart);
controller1.addEventListener('selectend', onSelectEnd);
controller1.addEventListener('squeezestart', onSqueezeStart);
controller1.addEventListener('squeezeend', onSqueezeEnd);

// XR render loop
renderer.setAnimationLoop((time, frame) => {
  renderer.render(scene, camera);
});
```

### AR Setup with Hit Testing
```javascript
import { ARButton } from 'three/addons/webxr/ARButton.js';

renderer.xr.enabled = true;
document.body.appendChild(ARButton.createButton(renderer, {
  requiredFeatures: ['hit-test']
}));

let hitTestSource = null;
let hitTestSourceRequested = false;

renderer.setAnimationLoop((time, frame) => {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();
    
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      hitTestSourceRequested = true;
    }
    
    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }
  
  renderer.render(scene, camera);
});
```

### Hand Tracking
```javascript
import { XRHandModelFactory } from 'three/addons/webxr/XRHandModelFactory.js';

const handModelFactory = new XRHandModelFactory();

// Left hand
const hand1 = renderer.xr.getHand(0);
hand1.add(handModelFactory.createHandModel(hand1, 'mesh'));
scene.add(hand1);

// Right hand
const hand2 = renderer.xr.getHand(1);
hand2.add(handModelFactory.createHandModel(hand2, 'mesh'));
scene.add(hand2);

// Gesture detection
class GestureDetector {
  constructor(hand) {
    this.hand = hand;
  }
  
  isPinching() {
    const indexTip = this.hand.joints['index-finger-tip'];
    const thumbTip = this.hand.joints['thumb-tip'];
    
    if (!indexTip || !thumbTip) return false;
    
    const distance = indexTip.position.distanceTo(thumbTip.position);
    return distance < 0.02;
  }
  
  isPointing() {
    const indexTip = this.hand.joints['index-finger-tip'];
    const indexPip = this.hand.joints['index-finger-phalange-intermediate'];
    
    if (!indexTip || !indexPip) return false;
    
    return indexTip.position.y > indexPip.position.y + 0.02;
  }
}
```

### React Three XR
```jsx
import { XR, Controllers, Hands, VRButton } from '@react-three/xr';

function App() {
  return (
    <>
      <VRButton />
      <Canvas>
        <XR>
          <Controllers />
          <Hands />
          <Scene />
        </XR>
      </Canvas>
    </>
  );
}

// Interactive objects
import { Interactive, useXR, useController } from '@react-three/xr';

function InteractiveBox() {
  const [hovered, setHovered] = useState(false);
  const [selected, setSelected] = useState(false);
  
  return (
    <Interactive
      onHover={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onSelect={() => setSelected(!selected)}
    >
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color={selected ? 'green' : hovered ? 'yellow' : 'red'} />
      </mesh>
    </Interactive>
  );
}

// Teleportation
import { TeleportationPlane } from '@react-three/xr';

<TeleportationPlane
  leftHand
  rightHand
  maxDistance={10}
>
  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[100, 100]} />
    <meshStandardMaterial color="green" />
  </mesh>
</TeleportationPlane>
```

## Device Support Matrix

| Device | VR | AR | Hand Tracking |
|--------|----|----|---------------|
| Meta Quest 2/3/Pro | ✅ | ✅ | ✅ |
| Apple Vision Pro | ✅ | ✅ | ✅ |
| HTC Vive | ✅ | ❌ | Limited |
| Valve Index | ✅ | ❌ | ✅ |
| Android (ARCore) | ❌ | ✅ | ❌ |
| iOS Safari | ❌ | ✅ | ❌ |

## Resources
- **Rapier Docs**: https://rapier.rs/docs/
- **@react-three/rapier**: https://github.com/pmndrs/react-three-rapier
- **WebXR Device API**: https://immersive-web.github.io/webxr/
- **@react-three/xr**: https://github.com/pmndrs/react-xr
- **Three.js XR Examples**: https://threejs.org/examples/?q=webxr
