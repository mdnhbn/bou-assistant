import { useState } from "react";
import { CHARACTERS, type CharacterId } from "../config/app";
import type { AssistantStatus } from "../store/types";

export function Character2D({
  characterId,
  status,
  onMissing,
}: {
  characterId: CharacterId;
  status: AssistantStatus;
  onMissing: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const character = CHARACTERS[characterId];
  return (
    <div className={"character-2d state-" + status}>
      <div className="portrait-backlight" />
      {!loaded && <div className="portrait-loading">Portrait preview</div>}
      <img
        key={characterId}
        className="portrait-image"
        src={character.imagePath}
        alt={character.name + " front-facing portrait"}
        onLoad={() => setLoaded(true)}
        onError={onMissing}
      />
      {loaded && <div className="portrait-face-effects" aria-hidden="true">
        <span className="portrait-blink left-eye" />
        <span className="portrait-blink right-eye" />
        <span className="portrait-breath-light" />
      </div>}
      <div className="portrait-scanline" aria-hidden="true" />
    </div>
  );
}