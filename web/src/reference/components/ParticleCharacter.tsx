/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EntityForm } from '../types';
import {
  PARTICLE_COUNT,
  createGlowParticleTexture,
  generateOrbPoints,
  generateFemaleBustPoints,
  generateMaleBustPoints
} from './particleFormGenerators';

interface ParticleCharacterProps {
  form: EntityForm;
  audioAmplitude: number;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
  accentColor: string;
}

/**
 * 3D Particle Cloud Entity with live morphing, audio wave reactivity,
 * state reactions, and cursor tracking.
 */
const ParticleCloudEntity: React.FC<ParticleCharacterProps> = ({
  form,
  audioAmplitude,
  assistantState,
  accentColor
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Generate target shapes once
  const orbTargets = useMemo(() => generateOrbPoints(PARTICLE_COUNT), []);
  const femaleTargets = useMemo(() => generateFemaleBustPoints(PARTICLE_COUNT), []);
  const maleTargets = useMemo(() => generateMaleBustPoints(PARTICLE_COUNT), []);

  // Pre-generate static colors and particle sizes
  const { colors, currentPositions, targetPositions, velocities } = useMemo(() => {
    const colArray = new Float32Array(PARTICLE_COUNT * 3);
    const curArray = new Float32Array(PARTICLE_COUNT * 3);
    const tgtArray = new Float32Array(PARTICLE_COUNT * 3);
    const velArray = new Float32Array(PARTICLE_COUNT * 3);

    // Initial shape matches current form
    const initialSrc = form === 'orb' ? orbTargets : form === 'male' ? maleTargets : femaleTargets;

    const baseColor = new THREE.Color(accentColor || '#06b6d4');
    const whiteColor = new THREE.Color('#ffffff');
    const cyanColor = new THREE.Color('#38bdf8');
    const darkBlueColor = new THREE.Color('#0284c7');

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      curArray[i3] = initialSrc[i3];
      curArray[i3 + 1] = initialSrc[i3 + 1];
      curArray[i3 + 2] = initialSrc[i3 + 2];

      tgtArray[i3] = initialSrc[i3];
      tgtArray[i3 + 1] = initialSrc[i3 + 1];
      tgtArray[i3 + 2] = initialSrc[i3 + 2];

      // Varied celestial coloring (shimmering whites, bright cyans, deep blues)
      const r = Math.random();
      let pColor = baseColor;
      if (r < 0.22) {
        pColor = whiteColor;
      } else if (r < 0.65) {
        pColor = cyanColor;
      } else if (r < 0.85) {
        pColor = baseColor;
      } else {
        pColor = darkBlueColor;
      }

      colArray[i3] = pColor.r;
      colArray[i3 + 1] = pColor.g;
      colArray[i3 + 2] = pColor.b;
    }

    return {
      colors: colArray,
      initialPositions: curArray.slice(),
      currentPositions: curArray,
      targetPositions: tgtArray,
      velocities: velArray
    };
  }, [orbTargets, femaleTargets, maleTargets]); // targets are memoized

  // Particle glow texture
  const particleTexture = useMemo(() => createGlowParticleTexture(), []);

  // Update target coordinates and add dispersion impulse on form change
  useEffect(() => {
    const nextTarget = form === 'orb' ? orbTargets : form === 'male' ? maleTargets : femaleTargets;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      targetPositions[i3] = nextTarget[i3];
      targetPositions[i3 + 1] = nextTarget[i3 + 1];
      targetPositions[i3 + 2] = nextTarget[i3 + 2];

      // Add slight explosion/dispersion velocity for fluid transition
      velocities[i3] = (Math.random() - 0.5) * 0.08;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.08;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.08;
    }
  }, [form, orbTargets, femaleTargets, maleTargets, targetPositions, velocities]);

  // Animation render loop (60 FPS)
  useFrame((state, delta) => {
    if (!pointsRef.current || !groupRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position;
    const posArr = posAttr.array as Float32Array;

    const time = state.clock.getElapsedTime();
    const isSpeaking = assistantState === 'speaking';
    const isListening = assistantState === 'listening';
    const isThinking = assistantState === 'thinking';

    // 1. Mouse/pointer parallax tracking with gentle inertial damping
    const targetRotY = state.pointer.x * 0.32;
    const targetRotX = -state.pointer.y * 0.22;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotY, 0.06);
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, targetRotX, 0.06);

    // 2. Idle vertical floating and subtle breathing
    const floatY = Math.sin(time * 1.4) * 0.04;
    let targetBaseY = 0.06;
    if (form === 'orb') targetBaseY = 0.12;
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetBaseY + floatY,
      0.08
    );

    // State specific rotation mod
    if (isThinking) {
      // Swirling cosmic vortex curl
      groupRef.current.rotation.y += delta * 0.45;
    } else if (isListening) {
      // Attentive slight lean
      groupRef.current.rotation.x += Math.sin(time * 2.2) * 0.015 - 0.03;
    }

    // 3. Audio ripple wave factor
    const amp = isSpeaking ? Math.max(audioAmplitude, 0.28) : 0;
    const morphSpeed = THREE.MathUtils.clamp(delta * 4.5, 0.04, 0.16);

    // 4. Update individual particle positions (morphing + noise + audio reactivity)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // Damp velocities
      velocities[i3] *= 0.92;
      velocities[i3 + 1] *= 0.92;
      velocities[i3 + 2] *= 0.92;

      // Base target coordinates
      let tx = targetPositions[i3] + velocities[i3];
      let ty = targetPositions[i3 + 1] + velocities[i3 + 1];
      let tz = targetPositions[i3 + 2] + velocities[i3 + 2];

      // Idle breathing respiration expansion
      const distFromCenter = Math.sqrt(tx * tx + ty * ty + tz * tz) + 0.001;
      const breath = 1.0 + Math.sin(time * 1.8 + i * 0.02) * 0.018;
      tx *= breath;
      ty *= breath;
      tz *= breath;

      // Audio wave lip-sync ripple when speaking
      if (amp > 0.05) {
        // Spherical shockwave ripple
        const wave = Math.sin(time * 16.0 - distFromCenter * 5.0) * amp * 0.06;
        const normX = tx / distFromCenter;
        const normY = ty / distFromCenter;
        const normZ = tz / distFromCenter;

        tx += normX * wave;
        ty += normY * wave;
        tz += normZ * wave;

        // Specific jaw/mouth area articulation for busts
        if (form !== 'orb' && ty > 0.12 && ty < 0.28 && tz > 0.1) {
          ty -= amp * 0.035 * Math.sin(time * 20);
          tz += amp * 0.02 * Math.cos(time * 14);
        }
      }

      // Thinking orbit perturbation
      if (isThinking) {
        const curl = Math.sin(time * 3 + ty * 4) * 0.02;
        tx += curl;
        tz += curl;
      }

      // Smooth lerp towards target
      currentPositions[i3] += (tx - currentPositions[i3]) * morphSpeed;
      currentPositions[i3 + 1] += (ty - currentPositions[i3 + 1]) * morphSpeed;
      currentPositions[i3 + 2] += (tz - currentPositions[i3 + 2]) * morphSpeed;

      // Write directly to BufferGeometry array
      posArr[i3] = currentPositions[i3];
      posArr[i3 + 1] = currentPositions[i3 + 1];
      posArr[i3 + 2] = currentPositions[i3 + 2];
    }

    posAttr.needsUpdate = true;
  });

  // Clean disposal
  useEffect(() => {
    return () => {
      particleTexture.dispose();
    };
  }, [particleTexture]);

  return (
    <group ref={groupRef} position={[0, -0.15, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[currentPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.032}
          map={particleTexture}
          vertexColors
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      {/* Internal Core Glow Orb */}
      <mesh position={[0, form === 'orb' ? 0 : 0.25, 0]}>
        <sphereGeometry args={[form === 'orb' ? 0.35 : 0.18, 16, 16]} />
        <meshBasicMaterial
          color={accentColor || '#38bdf8'}
          transparent
          opacity={assistantState === 'speaking' ? 0.45 : 0.25}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

export const ParticleCharacter: React.FC<ParticleCharacterProps> = (props) => {
  return (
    <div className="w-full h-full relative select-none pointer-events-auto">
      <Canvas
        camera={{ position: [0, 0.1, 2.4], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={[1, 1.5]}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <ParticleCloudEntity {...props} />
      </Canvas>
    </div>
  );
};
