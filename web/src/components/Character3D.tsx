import { Component, Suspense, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { Group } from "three";
import { CHARACTERS, type CharacterId } from "../config/app";
import type { AssistantStatus } from "../store/types";
import { MissingModelNotice } from "./MissingModelNotice";

interface Character3DProps {
  characterId: CharacterId;
  status: AssistantStatus;
  amplitude: number;
  gaze: { x: number; y: number };
  snapshotOnly?: boolean;
}
interface AvatarProps extends Character3DProps { onSnapshot?: (image: string) => void; }

class ModelErrorBoundary extends Component<
  { children: ReactNode; characterId: CharacterId; snapshotOnly: boolean },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // TODO: Show asset diagnostics in a local developer panel.
  }
  render() {
    if (this.state.failed) {
      return <div className="model-error-layer">
        <MissingModelNotice characterId={this.props.characterId} mode={this.props.snapshotOnly ? "2d" : "3d"} />
      </div>;
    }
    return this.props.children;
  }
}

function LoadingModel() {
  return <Html center><div className="model-loading"><span className="loading-dot" /> Preparing character</div></Html>;
}

function VRMAvatar({ characterId, status, amplitude, gaze, onSnapshot }: AvatarProps) {
  const definition = CHARACTERS[characterId];
  const gltf = useLoader(GLTFLoader, definition.modelPath, (loader) =>
    loader.register((parser) => new VRMLoaderPlugin(parser)),
  );
  const vrm = useMemo(() => {
    const model = gltf.userData.vrm as VRM | undefined;
    if (!model) throw new Error("The selected file does not contain a VRM avatar.");
    VRMUtils.rotateVRM0(model);
    model.scene.position.set(0, -1.1, 0);
    model.scene.scale.setScalar(1.25);
    return model;
  }, [gltf]);
  const blinkTimer = useRef(0);
  const nextBlink = useRef(3.2 + Math.random() * 2.2);
  const blinkAmount = useRef(0);
  const captured = useRef(false);
  const avatarRoot = useRef<Group | null>(null);

  useEffect(() => {
    captured.current = false;
    return () => {
      // TODO: Release per-avatar GPU resources if models become dynamically replaceable.
    };
  }, [characterId]);

  useFrame(({ clock, gl }, delta) => {
    const time = clock.elapsedTime;
    const smooth = Math.min(1, delta * 4.5);
    const isListening = status === "listening";
    const isThinking = status === "thinking";
    const isSpeaking = status === "speaking";
    const head = vrm.humanoid?.getNormalizedBoneNode("head");
    const chest = vrm.humanoid?.getNormalizedBoneNode("upperChest") ??
      vrm.humanoid?.getNormalizedBoneNode("chest");

    if (head) {
      const targetTilt = isListening ? 0.095 : Math.sin(time * 0.38) * 0.015;
      head.rotation.z += (targetTilt - head.rotation.z) * smooth;
      head.rotation.x = gaze.y * 0.08 + Math.sin(time * 0.48) * 0.012 + (isThinking ? -0.1 : 0);
      head.rotation.y = gaze.x * 0.18 + Math.sin(time * 0.31) * 0.025 + (isThinking ? 0.12 : 0);
    }
    if (chest) {
      chest.rotation.x = Math.sin(time * 1.05) * 0.018;
      chest.rotation.z = Math.sin(time * 0.52) * 0.012;
    }
    if (avatarRoot.current) avatarRoot.current.position.y = -1.1 + Math.sin(time * 1.05) * 0.014;

    blinkTimer.current += delta;
    if (blinkTimer.current >= nextBlink.current && blinkAmount.current <= 0) {
      blinkAmount.current = 1;
      blinkTimer.current = 0;
      nextBlink.current = 2.8 + Math.random() * 3.4;
    }
    if (blinkAmount.current > 0) blinkAmount.current = Math.max(0, blinkAmount.current - delta * 8);

    const expression = vrm.expressionManager;
    expression?.setValue("blink", blinkAmount.current);
    expression?.setValue("lookUp", isThinking ? 0.45 : Math.max(0, -gaze.y) * 0.18);
    expression?.setValue("lookDown", Math.max(0, gaze.y) * 0.1);
    expression?.setValue("lookLeft", Math.max(0, -gaze.x) * 0.18 + (isThinking ? 0.15 : 0));
    expression?.setValue("lookRight", Math.max(0, gaze.x) * 0.18);
    expression?.setValue("relaxed", isListening ? 0.16 : 0);
    expression?.setValue("happy", isSpeaking ? 0.18 : 0);
    expression?.setValue("aa", isSpeaking ? amplitude * 0.72 : 0);
    expression?.setValue("ih", isSpeaking ? Math.max(0, amplitude - 0.5) * 0.24 : 0);
    expression?.setValue("ou", isSpeaking ? Math.max(0, 0.4 - amplitude) * 0.18 : 0);
    vrm.update(delta);

    if (onSnapshot && !captured.current && time > 0.55) {
      captured.current = true;
      try { onSnapshot(gl.domElement.toDataURL("image/png")); }
      catch { /* Keep the live VRM visible if the canvas cannot be captured. */ }
    }
  });

  return <primitive ref={avatarRoot} object={vrm.scene} />;
}

export function Character3D(props: Character3DProps) {
  const [snapshot, setSnapshot] = useState<string | null>(null);
  useEffect(() => setSnapshot(null), [props.characterId]);
  if (props.snapshotOnly && snapshot) {
    return <img className="vrm-snapshot" src={snapshot} alt={CHARACTERS[props.characterId].name + " 3D snapshot"} />;
  }

  return (
    <div className="character-3d">
      <ModelErrorBoundary key={props.characterId} characterId={props.characterId} snapshotOnly={Boolean(props.snapshotOnly)}>
        <Canvas
          camera={{ position: [0, 1.25, 3.7], fov: 31 }}
          dpr={[1, 1.7]}
          gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => gl.setClearColor("#000000", 0)}
        >
          <ambientLight intensity={1.65} />
          <hemisphereLight args={["#cdfdf0", "#17172c", 1.25]} />
          <directionalLight color="#e8faff" intensity={2.2} position={[-2.5, 4, 5]} />
          <pointLight color={CHARACTERS[props.characterId].tint} intensity={2.3} position={[2.4, 1.7, 2]} />
          <Suspense fallback={<LoadingModel />}>
            <VRMAvatar {...props} onSnapshot={props.snapshotOnly ? setSnapshot : undefined} />
          </Suspense>
        </Canvas>
      </ModelErrorBoundary>
    </div>
  );
}