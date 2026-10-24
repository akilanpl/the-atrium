import type { UniverseId } from "../../../packages/shared/src/universes";
type Sound =
  | "observatory"
  | "sanctuary"
  | "forge"
  | "manor"
  | "garden"
  | "stone"
  | "wood"
  | "key"
  | "mechanism"
  | "portal"
  | "tick"
  | "victory"
  | "hall"
  | "library"
  | "door";
let context: AudioContext | null = null,
  master: GainNode | null = null,
  effects: GainNode | null = null,
  ambience: AudioBufferSourceNode | null = null;
let masterLevel = 0.4,
  effectsLevel = 0.7,
  muted = false;
const buffers = new Map<string, AudioBuffer>();
const pending = new Map<string, Promise<AudioBuffer>>();
async function buffer(name: Sound) {
  if (buffers.has(name)) return buffers.get(name)!;
  if (!pending.has(name))
    pending.set(
      name,
      fetch(`/assets/audio/${name}.wav`)
        .then((r) => {
          if (!r.ok) throw Error("Audio unavailable");
          return r.arrayBuffer();
        })
        .then((a) => context!.decodeAudioData(a))
        .then((a) => {
          buffers.set(name, a);
          return a;
        }),
    );
  return pending.get(name)!;
}
export function unlockAudio() {
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    effects = context.createGain();
    effects.connect(master);
    master.connect(context.destination);
    setAudio(masterLevel, effectsLevel, muted);
  }
  void context.resume().catch(() => {});
}
export function setAudio(volume: number, fx: number, mute: boolean) {
  masterLevel = volume;
  effectsLevel = fx;
  muted = mute;
  if (master && effects && context) {
    master.gain.setTargetAtTime(mute ? 0 : volume, context.currentTime, 0.08);
    effects.gain.setTargetAtTime(fx, context.currentTime, 0.08);
  }
}
export async function sound(name: Sound, gain = 0.7, pan = 0) {
  if (!context || context.state !== "running") return;
  try {
    const b = await buffer(name);
    const source = context.createBufferSource(),
      g = context.createGain(),
      p = context.createStereoPanner();
    source.buffer = b;
    g.gain.value = gain;
    p.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(g);
    g.connect(p);
    p.connect(effects!);
    source.onended = () => {
      source.disconnect();
      g.disconnect();
      p.disconnect();
    };
    source.start();
  } catch {
    /* Audio failure must never interrupt a game action. */
  }
}
let ambientId = "";
let ambientGeneration = 0;
export async function ambienceFor(world: UniverseId | "") {
  const id = world || "hall";
  if (id === ambientId || !context) return;
  ambientId = id;
  const gen = ++ambientGeneration;
  ambience?.stop();
  ambience = null;
  try {
    const b = await buffer(id);
    if (gen !== ambientGeneration) return;
    const s = context.createBufferSource(),
      g = context.createGain();
    s.buffer = b;
    s.loop = true;
    g.gain.value = 0.4;
    s.connect(g);
    g.connect(master!);
    s.onended = () => {
      s.disconnect();
      g.disconnect();
    };
    s.start();
    ambience = s;
  } catch {
    ambientId = "";
  }
}
