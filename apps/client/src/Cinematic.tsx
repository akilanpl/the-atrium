import { useEffect, useState } from "react";
import { reducedMotion } from "./settings";
import type { Snapshot } from "../../../packages/shared/src/world";
import { universe } from "../../../packages/shared/src/universes";
import { transitionIdentity } from "./presentation";
export function Cinematic({ state }: { state: Snapshot | null }) {
  const identity = state
    ? transitionIdentity(state.epoch, state.owner, state.phase, state.round)
    : "opening";
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!state) {
      try {
        if (sessionStorage.getItem("atrium:intro")) return;
        sessionStorage.setItem("atrium:intro", "seen");
      } catch {
        /* Session persistence is optional. */
      }
    }
    setVisible(true);
    const timer = setTimeout(
      () => setVisible(false),
      reducedMotion() ? 600 : state ? 1400 : 5500,
    );
    const skip = (e: KeyboardEvent) => {
      if (e.code === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", skip);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", skip);
    };
  }, [identity]);
  const title = !state
    ? "THE ATRIUM"
    : state.phase === "FINISHED"
      ? "THE CONCORDANCE IS COMPLETE"
      : state.phase === "FINALE"
        ? "THE FINAL CONVERGENCE"
        : state.owner
          ? universe(state.world || "library").name
          : state.phase === "WAITING"
            ? "THE TRAVELERS GATHER"
            : "THE GRAND ATRIUM";
  return visible ? (
    <aside className="cinematic-caption" aria-live="polite">
      <span>{!state ? "SIX WORLDS · ONE ANCIENT PALACE" : state.phase}</span>
      <strong>{title}</strong>
      <button
        onClick={() => {
          setVisible(false);
          window.dispatchEvent(new Event("atrium:skip-intro"));
        }}
      >
        Skip · Esc
      </button>
    </aside>
  ) : null;
}
