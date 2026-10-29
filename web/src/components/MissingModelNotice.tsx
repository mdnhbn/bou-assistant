import { FileImage } from "lucide-react";
import { CHARACTERS, type CharacterId, type DisplayMode } from "../config/app";

export function MissingModelNotice({ characterId, mode }: { characterId: CharacterId; mode: DisplayMode }) {
  const character = CHARACTERS[characterId];
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
          ? "ছবি ও VRM snapshot—দুটোর ফাইলই যোগ করলে 2D view দেখা যাবে।"
          : "3D character দেখাতে VRM ফাইলটি যোগ করো।"}
      </p>
      <div className="asset-path">
        <span className="asset-path-icon"><FileImage size={14} /></span>
        <div><small>VRM model</small><code>public{character.modelPath}</code></div>
      </div>
      {mode === "2d" && (
        <div className="asset-path asset-path-muted">
          <span className="asset-path-icon"><FileImage size={14} /></span>
          <div><small>Optional portrait</small><code>public{character.imagePath}</code></div>
        </div>
      )}
      <span className="asset-footnote">ফাইল যোগ হলে পেজ রিফ্রেশ করলেই লোড হবে</span>
    </div>
  );
}