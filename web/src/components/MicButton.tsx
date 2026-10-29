import { Mic, MicOff } from "lucide-react";

export function MicButton({ listening, onClick, disabled }: { listening: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className={"mic-button" + (listening ? " is-listening" : "")}
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? "কথা বলা থামাও" : "কথা বলা শুরু করো"}
      title={listening ? "কথা বলা থামাও" : "কথা বলা শুরু করো"}
    >
      <span className="mic-button-halo" />
      {listening ? <MicOff size={22} /> : <Mic size={22} />}
      <span className="mic-button-label">{listening ? "থামাও" : "কথা বলো"}</span>
    </button>
  );
}
