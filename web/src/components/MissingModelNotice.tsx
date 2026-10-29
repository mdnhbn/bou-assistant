import { useEffect, useState } from "react";
import { FileImage } from "lucide-react";
import { getDesktopApi } from "../services/desktop";
import { CHARACTERS, type CharacterId, type DisplayMode } from "../config/app";

export function MissingModelNotice({ characterId, mode }: { characterId: CharacterId; mode: DisplayMode }) {
  const character = CHARACTERS[characterId];
  const [modelFolder, setModelFolder] = useState(() => getDesktopApi() ? "%LOCALAPPDATA%\\BouStudio\\models\\characters" : "public/models");
  useEffect(() => {
    let alive = true;
    const api = getDesktopApi();
    if (api) void api.get_status().then((status) => { if (alive && status.characterModelsPath) setModelFolder(status.characterModelsPath); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  return (
    <div className="model-missing">
      <div className="missing-art" aria-hidden="true">
        <div className="missing-halo" />
        <div className="missing-person">
          <i className="figure-shoulders" />
          <i className="figure-neck" />
          <i className="figure-head" />
          <i className="figure-hair" />
        </div>
      </div>
      <p className="eyebrow">CHARACTER ASSET NEEDED</p>
      <h2>{character.name} is ready to arrive</h2>
      <p className="missing-copy">
        {mode === "2d"
          ? "2D view-এর জন্য portrait দিন। Portrait না থাকলে VRM snapshot ব্যবহার হবে।"
          : "3D character দেখাতে VRM ফাইলটি যোগ করো।"}
      </p>
      <div className="asset-path">
        <span className="asset-path-icon"><FileImage size={14} /></span>
        <div><small>VRM model</small><code>{modelFolder}/{characterId}.vrm</code></div>
      </div>
      {mode === "2d" && (
        <div className="asset-path asset-path-muted">
          <span className="asset-path-icon"><FileImage size={14} /></span>
          <div><small>Optional portrait</small><code>{modelFolder}/{characterId}.png</code></div>
        </div>
      )}
      <span className="asset-footnote">ফাইল যোগ হলে app বা পেজ আবার খুলুন</span>
    </div>
  );
}