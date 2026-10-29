import { lazy, Suspense, useEffect, useState, type PointerEvent } from "react";
import { AudioLines, Eye, Sparkles } from "lucide-react";
import { CHARACTERS, type CharacterId, type DisplayMode } from "../config/app";
import type { AssistantStatus } from "../store/types";
import { Character2D } from "./Character2D";

const Character3D = lazy(() => import("./Character3D").then((module) => ({ default: module.Character3D })));

export function CharacterStage({
  characterId,
  mode,
  status,
  amplitude,
}: {
  characterId: CharacterId;
  mode: DisplayMode;
  status: AssistantStatus;
  amplitude: number;
}) {
  const [imageMissing, setImageMissing] = useState(false);
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const character = CHARACTERS[characterId];
  useEffect(() => setImageMissing(false), [characterId, mode]);

  function followPointer(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    setGaze({
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2)),
    });
  }

  return (
    <section className={"character-stage state-" + status} onPointerMove={followPointer} aria-label={character.name + " character stage"}>
      <div className="stage-stars" aria-hidden="true" />
      <div className="stage-grid" aria-hidden="true" />
      <div className="stage-rings" aria-hidden="true"><div className="stage-ring ring-one" /><div className="stage-ring ring-two" /><div className="stage-ring ring-three" /></div>
      <div className="stage-glow" aria-hidden="true" />
      <div className="stage-header-copy">
        <span><span className="live-dot" /> {status === "listening" ? "LISTENING" : status === "thinking" ? "THINKING" : status === "speaking" ? "SPEAKING" : "STANDBY"}</span>
        <p>{character.title}</p>
      </div>

      <div className="actor-wrap" key={characterId + "-" + mode}>
        <div className="actor-shadow" />
        <div className="actor-fade">
          {mode === "3d" || imageMissing ? (
            <Suspense fallback={<div className="model-loading"><span className="loading-dot" /> Starting 3D scene</div>}>
              <Character3D
                key={characterId + "-" + mode + "-" + String(imageMissing)}
                characterId={characterId}
                status={status}
                amplitude={amplitude}
                gaze={gaze}
                snapshotOnly={mode === "2d" && imageMissing}
              />
            </Suspense>
          ) : <Character2D characterId={characterId} status={status} onMissing={() => setImageMissing(true)} />}
          {mode === "2d" && imageMissing && <div className="snapshot-caption">VRM SNAPSHOT FALLBACK</div>}
          {mode === "2d" && !imageMissing && <div className="portrait-caption"><Eye size={13} /> 2D PORTRAIT</div>}
        </div>
      </div>

      <div className="stage-side-note stage-side-left"><span className="side-note-icon"><Sparkles size={13} /></span><span>EMOTION<br /><b>{status.toUpperCase()}</b></span></div>
      <div className="stage-side-note stage-side-right"><span className="side-note-icon"><AudioLines size={13} /></span><span>MOCK AUDIO<br /><b>{amplitude.toFixed(2)} / 1.00</b></span></div>

      <div className="stage-character-name">
        <span className="name-line" />
        <div><small>YOUR COMPANION</small><strong>{character.name}</strong></div>
        <span className="name-line" />
      </div>
      {status === "speaking" && <div className="speaking-wave" aria-label="Mock voice waveform">
        {Array.from({ length: 25 }, (_, index) => (
          <span key={index} style={{ animationDelay: (index * 31) + "ms", transform: "scaleY(" + (0.35 + amplitude * ((index % 5) / 6 + 0.55)) + ")" }} />
        ))}
      </div>}
    </section>
  );
}