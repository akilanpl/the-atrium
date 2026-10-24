import { useState, useEffect } from "react";
import { GRAPHICS, quality, saved, save, type Quality } from "./settings";
import { setAudio, unlockAudio } from "./audio";
export function Settings({
  value,
  onChange,
  navigation,
  onNavigationChange,
}: {
  value: Quality;
  navigation: boolean;
  onNavigationChange: (value: boolean) => void;
  onChange: (v: Quality) => void;
}) {
  const [open, setOpen] = useState(false),
    [volume, setVolume] = useState(Number(saved("volume", ".4"))),
    [fx, setFx] = useState(Number(saved("effects", ".7"))),
    [muted, setMuted] = useState(saved("mute", "false") === "true");
  useEffect(() => {
    setAudio(volume, fx, muted);
    save("volume", String(volume));
    save("effects", String(fx));
    save("mute", String(muted));
  }, [volume, fx, muted]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code === "Escape") setOpen((value) => !value);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  return (
    <div className="settings">
      <button
        className="settings-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          unlockAudio();
        }}
      >
        ⚙ Settings
      </button>
      {open && (
        <section>
          <h3>Make yourself at home</h3>
          <label>
            <input
              type="checkbox"
              aria-label="Navigation aids"
              checked={navigation}
              onChange={(e) => onNavigationChange(e.target.checked)}
            />{" "}
            Navigation aids · map coordinates
          </label>
          <label>
            GRAPHICS
            <select
              value={value}
              onChange={(e) => {
                const v = quality(e.target.value);
                onChange(v);
                save("quality", v);
              }}
            >
              {Object.keys(GRAPHICS).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
          <label>
            MASTER VOLUME
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={volume}
              onChange={(e) => setVolume(+e.target.value)}
            />
          </label>
          <label>
            EFFECTS VOLUME
            <input
              type="range"
              min="0"
              max="1"
              step=".05"
              value={fx}
              onChange={(e) => setFx(+e.target.value)}
            />
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
            />{" "}
            Mute audio
          </label>
          <small>
            Mouse wheel: zoom · R: recenter camera
            <br />
            System reduced-motion preference is respected.
          </small>
        </section>
      )}
    </div>
  );
}
