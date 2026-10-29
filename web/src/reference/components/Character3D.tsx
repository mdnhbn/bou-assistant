/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils, VRMHumanBoneName } from '@pixiv/three-vrm';
import type { CharacterConfig } from '../types';
import { getDesktopApi } from '../../services/desktop';
import { ArrowRight, Sparkles, RefreshCw, Box } from 'lucide-react';

interface Character3DProps {
  character: CharacterConfig;
  audioAmplitude: number;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
  onSwitchTo2D?: () => void;
}

/**
 * Animated VRM Humanoid Component.
 * Implements:
 * 1. Upper-body framing (head to waist) centered.
 * 2. Idle animations: breathing (chest/spine), natural blinking via VRM "blink" expression,
 *    subtle head and body sway, eyes that track pointer.
 * 3. State reactions: Listening (attentive head tilt), Thinking (look up/aside), Speaking (lively).
 * 4. Lip-sync: smooth mapping from audioAmplitude to 'aa', 'ih', 'ou' visemes.
 */
const VRMHumanoid: React.FC<{
  vrm: VRM;
  audioAmplitude: number;
  assistantState: 'idle' | 'listening' | 'thinking' | 'speaking';
  accentColor: string;
}> = ({ vrm, audioAmplitude, assistantState }) => {
  const currentAa = useRef(0);
  const currentIh = useRef(0);
  const currentOu = useRef(0);
  const lookTarget = useRef(new THREE.Vector3(0, 1.4, 2.5));

  useFrame((state, delta) => {
    // Update VRM physics and spring bone calculations
    vrm.update(delta);

    const time = state.clock.getElapsedTime();
    const isSpeaking = assistantState === 'speaking';
    const isListening = assistantState === 'listening';
    const isThinking = assistantState === 'thinking';

    // 1. Natural idle breathing via chest & spine bones
    const chest =
      vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.UpperChest) ||
      vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Chest);
    const spine = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Spine);
    const neck = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Neck);
    const head = vrm.humanoid?.getNormalizedBoneNode(VRMHumanBoneName.Head);

    const breath = Math.sin(time * 1.9) * 0.022;
    if (chest) {
      chest.rotation.x = breath;
    }
    if (spine) {
      spine.rotation.y = Math.sin(time * 0.65) * 0.015;
      spine.rotation.z = Math.cos(time * 0.8) * 0.01;
    }

    // 2. Pointer tracking for head and eyes
    const ptrX = state.pointer.x; // Range -1.0 to +1.0
    const ptrY = state.pointer.y; // Range -1.0 to +1.0

    let targetHeadY = ptrX * 0.28;
    let targetHeadX = -ptrY * 0.18;
    let targetHeadZ = 0;

    // 3. Dynamic State Reactions
    if (isListening) {
      // Head slightly tilted and attentive forward
      targetHeadZ = 0.07;
      targetHeadX -= 0.06;
      targetHeadY += Math.sin(time * 1.8) * 0.03;
      vrm.expressionManager?.setValue('surprised', 0.18);
    } else if (isThinking) {
      // Looks up and aside contemplatively
      targetHeadY = -0.26;
      targetHeadX = 0.15;
      targetHeadZ = -0.05;
      vrm.expressionManager?.setValue('surprised', 0.0);
    } else if (isSpeaking) {
      // Lively conversational expression and rhythmic head nod
      targetHeadX += Math.sin(time * 7.5) * 0.025 * Math.max(audioAmplitude, 0.4);
      targetHeadY += Math.cos(time * 4.2) * 0.018;
      vrm.expressionManager?.setValue('happy', 0.25);
    } else {
      vrm.expressionManager?.setValue('happy', 0.0);
      vrm.expressionManager?.setValue('surprised', 0.0);
    }

    if (head) {
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, targetHeadY, 0.09);
      head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, targetHeadX, 0.09);
      head.rotation.z = THREE.MathUtils.lerp(head.rotation.z, targetHeadZ, 0.09);
    }
    if (neck) {
      neck.rotation.y = THREE.MathUtils.lerp(neck.rotation.y, targetHeadY * 0.35, 0.09);
      neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, targetHeadX * 0.35, 0.09);
    }

    // 4. LookAt eye tracking
    if (vrm.lookAt) {
      lookTarget.current.set(ptrX * 1.4, 1.4 + ptrY * 0.7, 2.5);
      vrm.lookAt.lookAt(lookTarget.current);
    }

    // 5. Natural blinking (VRM 'blink' expression)
    const blinkCycle = time % 4.3;
    let blinkVal = 0;
    if (blinkCycle > 4.05 && blinkCycle < 4.2) {
      blinkVal = Math.sin(((blinkCycle - 4.05) / 0.15) * Math.PI);
    }
    vrm.expressionManager?.setValue('blink', blinkVal);

    // 6. Lip-sync: smooth mapping from audioAmplitude to 'aa', 'ih', 'ou' visemes
    const targetAa = isSpeaking ? Math.min(1.0, audioAmplitude * 1.4) : 0;
    const targetIh = isSpeaking ? (Math.sin(time * 14) > 0 ? audioAmplitude * 0.32 : 0) : 0;
    const targetOu = isSpeaking ? (Math.cos(time * 10) > 0.3 ? audioAmplitude * 0.28 : 0) : 0;

    currentAa.current = THREE.MathUtils.lerp(currentAa.current, targetAa, 0.32);
    currentIh.current = THREE.MathUtils.lerp(currentIh.current, targetIh, 0.32);
    currentOu.current = THREE.MathUtils.lerp(currentOu.current, targetOu, 0.32);

    vrm.expressionManager?.setValue('aa', currentAa.current);
    vrm.expressionManager?.setValue('ih', currentIh.current);
    vrm.expressionManager?.setValue('ou', currentOu.current);

    vrm.expressionManager?.update();
  });

  return <primitive object={vrm.scene} />;
};

/**
 * Stylized Holographic Cybernetic Mannequin displayed when external .vrm file
 * is waiting to be provided in public/models/
 */
const HolographicMannequin: React.FC<{
  accentColor: string;
  audioAmplitude: number;
  assistantState: string;
}> = ({ accentColor, audioAmplitude, assistantState }) => {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = -0.55 + Math.sin(time * 1.8) * 0.025;
    }
    if (headRef.current) {
      const isSpeaking = assistantState === 'speaking';
      const isListening = assistantState === 'listening';
      const isThinking = assistantState === 'thinking';

      let targetX = -state.pointer.y * 0.15;
      let targetY = state.pointer.x * 0.25;

      if (isListening) targetY += 0.08;
      if (isThinking) {
        targetY = -0.22;
        targetX = 0.12;
      }
      if (isSpeaking) {
        targetX += Math.sin(time * 8) * 0.03 * (audioAmplitude || 0.4);
      }

      headRef.current.rotation.y = THREE.MathUtils.lerp(headRef.current.rotation.y, targetY, 0.08);
      headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, targetX, 0.08);
    }
  });

  const wireMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      }),
    [accentColor]
  );

  const coreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0a1120'),
        roughness: 0.3,
        metalness: 0.8,
      }),
    []
  );

  return (
    <group ref={groupRef} position={[0, -0.55, 0]}>
      {/* Torso & Bust */}
      <mesh position={[0, -0.65, 0]} material={coreMat}>
        <cylinderGeometry args={[0.55, 0.75, 0.8, 16]} />
      </mesh>
      <mesh position={[0, -0.65, 0]} material={wireMat}>
        <cylinderGeometry args={[0.56, 0.76, 0.82, 16]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.15, 0]} material={wireMat}>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 12]} />
      </mesh>

      {/* Head & Cranium */}
      <group ref={headRef} position={[0, 0.25, 0]}>
        <mesh position={[0, 0, 0]} material={coreMat}>
          <sphereGeometry args={[0.42, 24, 20]} />
        </mesh>
        <mesh position={[0, 0, 0]} material={wireMat}>
          <sphereGeometry args={[0.43, 20, 16]} />
        </mesh>
        {/* Optic Visor */}
        <mesh position={[0, 0.06, 0.38]}>
          <boxGeometry args={[0.34, 0.08, 0.12]} />
          <meshBasicMaterial color={accentColor} />
        </mesh>
      </group>

      {/* Floating Hologram Ring */}
      <mesh position={[0, 0.25, 0]} rotation={[1.3, 0, 0]}>
        <torusGeometry args={[0.95, 0.012, 12, 48]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.7} />
      </mesh>
    </group>
  );
};

export const Character3D: React.FC<Character3DProps> = ({
  character,
  audioAmplitude,
  assistantState,
  onSwitchTo2D,
}) => {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const [modelDirectory, setModelDirectory] = useState('public/models');
  useEffect(() => {
    void getDesktopApi()?.get_status().then((status) => setModelDirectory(status.characterModelsPath)).catch(() => undefined);
  }, []);

  const modelFile = character.id === 'female' ? 'bou.vrm' : 'aether.vrm';
  const modelUrl = `/models/${modelFile}`;

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setLoadError(null);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      modelUrl,
      (gltf) => {
        if (isCancelled) return;
        const loadedVrm = gltf.userData.vrm as VRM;
        if (!loadedVrm) {
          setLoadError(`File at ${modelUrl} does not contain valid VRM data.`);
          setIsLoading(false);
          return;
        }

        // Align VRM 0.0 models to face the camera
        VRMUtils.rotateVRM0(loadedVrm);

        // Ensure frustum culling doesn't prematurely hide hair or limbs
        loadedVrm.scene.traverse((obj) => {
          obj.frustumCulled = false;
        });

        // Center upper body (head to waist) on screen:
        // By positioning the model base at y = -1.0, the chest is at y ~ 0.1 and head at y ~ 0.45
        loadedVrm.scene.position.set(0, -1.05, 0);

        setVrm(loadedVrm);
        setLoadError(null);
        setIsLoading(false);
      },
      undefined,
      (err) => {
        if (isCancelled) return;
        console.warn(`[VRM Loader] Could not load ${modelUrl}:`, err);
        setLoadError(modelFile);
        setVrm(null);
        setIsLoading(false);
      }
    );

    return () => {
      isCancelled = true;
      if (vrm) {
        VRMUtils.deepDispose(vrm.scene);
      }
    };
  }, [character.id, modelFile, modelUrl, retryCount]);

  return (
    <div className="w-full h-full relative select-none pointer-events-auto">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 0.15, 1.8], fov: 36 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        className="w-full h-full"
      >
        {/* Soft Sci-Fi Studio Lighting & Rim Lights */}
        <ambientLight intensity={0.8} />
        {/* Key Light (Front-right warm white) */}
        <directionalLight position={[2.5, 3.5, 2.5]} intensity={1.7} color="#ffffff" />
        {/* Character Accent Rim Light (Left rim) */}
        <directionalLight position={[-3, 2, -1.5]} intensity={2.2} color={character.accentColor} />
        {/* Silhouette Backlight (Rim glow from behind) */}
        <directionalLight position={[0, 3, -3]} intensity={2.0} color="#38bdf8" />
        {/* Subtle Under-Chun Fill */}
        <pointLight position={[0, -0.6, 1.5]} intensity={1.0} color={character.accentColor} />

        {vrm ? (
          <VRMHumanoid
            vrm={vrm}
            audioAmplitude={audioAmplitude}
            assistantState={assistantState}
            accentColor={character.accentColor}
          />
        ) : (
          <HolographicMannequin
            accentColor={character.accentColor}
            audioAmplitude={audioAmplitude}
            assistantState={assistantState}
          />
        )}
      </Canvas>

      {/* Missing VRM File Clear On-Screen Guidance Banner */}
      {loadError && !isLoading && (
        <div className="absolute top-20 md:top-24 left-1/2 -translate-x-1/2 w-[92%] max-w-lg z-20 pointer-events-auto">
          <div className="bg-slate-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 md:p-5 shadow-2xl shadow-cyan-950/40 text-left transition-all animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                style={{
                  backgroundColor: `${character.accentColor}18`,
                  borderColor: `${character.accentColor}40`,
                  color: character.accentColor,
                }}
              >
                <Box className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-100 tracking-wide">
                    3D VRM Model Required
                  </h4>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {character.name} ({character.id})
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  To view the real human 3D avatar with live expressions and lip-sync, place your{' '}
                  <span className="font-mono text-cyan-300">.vrm</span> model file here:
                </p>

                <div className="mt-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[11px] text-cyan-400 select-all flex items-center justify-between">
                  <span className="break-all">{modelDirectory}/{modelFile}</span>
                  <span className="text-[10px] text-slate-500">VRM 0.0 / 1.0</span>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                  {onSwitchTo2D && (
                    <button
                      onClick={onSwitchTo2D}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Switch to 2D Mode</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => setRetryCount((c) => c + 1)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Check Again</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="px-4 py-2 rounded-xl bg-slate-950/70 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-cyan-400 flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Loading VRM Humanoid: {modelFile}...</span>
          </div>
        </div>
      )}

      {/* Subtle bottom gradient ground fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent pointer-events-none" />
    </div>
  );
};
