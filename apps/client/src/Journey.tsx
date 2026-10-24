import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Lenis from "lenis";
import "./journey.css";
import { WorldVignette } from "./WorldVignette";

const worlds = [
  {
    name: "Clockwork Library",
    word: "Time keeps its secrets.",
    text: "Read the rhythm of moving shelves. Stop the clock, and find what time concealed.",
    color: "#d9ad66",
    mode: "TIMING / CLOCK BRAKE",
  },
  {
    name: "Astral Observatory",
    word: "Let gravity go.",
    text: "Rise between celestial instruments. In a world without weight, look beyond the floor.",
    color: "#b6a3f5",
    mode: "LOW GRAVITY / ASCENT",
  },
  {
    name: "Sunken Sanctuary",
    word: "Follow the quiet current.",
    text: "Drift through a submerged sanctuary. Turn the valve and read the water’s path.",
    color: "#6bd5c7",
    mode: "BUOYANCY / CURRENT",
  },
  {
    name: "Polarity Forge",
    word: "Opposites draw you closer.",
    text: "A sleeping furnace. A magnetic carriage. Change the field to open a new approach.",
    color: "#ef9969",
    mode: "MAGNETISM / CARRIAGE",
  },
  {
    name: "Shifting Manor",
    word: "Nothing stays where it was.",
    text: "Watch the portraits. Light the candle. The walls remember a different way through.",
    color: "#baa5c5",
    mode: "SLIDING WALLS / CANDLE",
  },
  {
    name: "Tempest Garden",
    word: "Trust the space between.",
    text: "Cross suspended paths in a restless sky. Wake the turbine and ride the moving garden.",
    color: "#bbd38b",
    mode: "WIND / MOVING PLATFORMS",
  },
];
type Timeline = {
  progress: number;
  chapter: number;
  world: number;
  reduced: boolean;
  active: boolean;
};
class SceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        className="journey-scene-fallback"
        role="img"
        aria-label="A luminous doorway in the mist"
      />
    ) : (
      this.props.children
    );
  }
}
function Portal({ color = "#e4c78d" }: { color?: string }) {
  return (
    <group>
      <mesh position={[0, 2.8, 0]}>
        <torusGeometry args={[2.15, 0.09, 8, 80]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, 2.8, -0.08]}>
        <circleGeometry args={[2.05, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.13} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[5, 0.6, 2.6]} />
        <meshStandardMaterial color="#384345" roughness={0.9} />
      </mesh>
    </group>
  );
}
function Palace({ timeline }: { timeline: React.RefObject<Timeline> }) {
  const [cameraTarget] = useState(() => new THREE.Vector3());
  const [lightColor] = useState(() => new THREE.Color());
  const scene = useRef<THREE.Group>(null);
  const artifact = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const glows = useRef<THREE.PointLight>(null);
  useFrame(({ camera, clock }, dt) => {
    const s = timeline.current;
    if (!s.active) return;
    const t = s.reduced ? 0 : clock.elapsedTime;
    const p = s.progress;
    camera.position.lerp(
      cameraTarget.set(
        Math.sin(t * 0.08) * 0.5 + (s.world - 2.5) * 0.25,
        5.5 - Math.min(p * 5, 2),
        19 - Math.sin(p * Math.PI) * 6,
      ),
      1 - Math.exp(-dt * 2),
    );
    camera.lookAt(0, 3, 0);
    if (scene.current) scene.current.rotation.y = Math.sin(t * 0.045) * 0.035;
    if (artifact.current) {
      artifact.current.visible = s.chapter >= 9;
      artifact.current.rotation.y = t * 0.25;
      artifact.current.position.y = 4 + Math.sin(t * 0.7) * 0.15;
    }
    if (orbit.current) {
      orbit.current.rotation.z =
        t * (s.world === 0 ? 0.13 : s.world === 3 ? -0.2 : 0.045);
      orbit.current.rotation.y = s.world === 1 ? t * 0.12 : 0.2;
      orbit.current.position.y = s.world === 2 ? Math.sin(t * 0.8) * 0.3 : 0;
    }
    if (glows.current) {
      glows.current.color.lerp(
        lightColor.set(worlds[s.world].color),
        1 - Math.exp(-dt * 2),
      );
      glows.current.intensity =
        20 + Math.sin(t * 1.4) * 4 + (s.chapter === 11 ? 20 : 0);
    }
  });
  return (
    <>
      <color attach="background" args={["#090f16"]} />
      <fog attach="fog" args={["#090f16", 16, 55]} />
      <ambientLight intensity={0.7} color="#92a4b6" />
      <directionalLight position={[4, 12, 6]} intensity={2} color="#f2d6a2" />
      <pointLight
        ref={glows}
        position={[0, 4, 3]}
        intensity={30}
        distance={22}
      />
      <group ref={scene}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial
            color="#17232b"
            metalness={0.35}
            roughness={0.55}
          />
        </mesh>
        {[-1, 1].flatMap((side) =>
          Array.from({ length: 7 }, (_, i) => (
            <group
              key={`${side}-${i}`}
              position={[side * (6 + i * 0.7), 0, -i * 4]}
            >
              <mesh position={[0, 5.5, 0]}>
                <cylinderGeometry args={[0.32, 0.55, 11 + i * 0.7, 8]} />
                <meshStandardMaterial color="#4a5054" roughness={0.8} />
              </mesh>
              <mesh position={[0, 10, 0]} rotation={[0, 0, side * 0.2]}>
                <boxGeometry args={[1, 1, 3]} />
                <meshStandardMaterial color="#69706c" />
              </mesh>
            </group>
          )),
        )}
        <group position={[3, 0, -4]}>
          <Portal />
          {[-1, 1].map((side) => (
            <group key={side} position={[side * 3.5, 0, -1]}>
              <mesh position={[0, 4, 0]}>
                <boxGeometry args={[1.5, 8, 2]} />
                <meshStandardMaterial color="#56616a" />
              </mesh>
              <mesh position={[0, 9, 0]}>
                <coneGeometry args={[1.15, 3, 4]} />
                <meshStandardMaterial
                  color="#2d3c4a"
                  metalness={0.5}
                  roughness={0.5}
                />
              </mesh>
              <mesh position={[0, 6, 1.03]}>
                <boxGeometry args={[0.12, 1.8, 0.04]} />
                <meshBasicMaterial color="#e1c695" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, 7.5, -1]}>
            <torusGeometry args={[3, 0.24, 6, 48, Math.PI]} />
            <meshStandardMaterial color="#68757a" />
          </mesh>
          <mesh position={[0, 0, 3]}>
            <boxGeometry args={[6, 0.2, 6]} />
            <meshStandardMaterial color="#48535b" />
          </mesh>
        </group>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh
            key={`mountain-${i}`}
            position={[(i - 4) * 9, -2, -35 - Math.abs(i - 4) * 2]}
          >
            <coneGeometry args={[8, 15 + Math.sin(i * 4) * 5, 5]} />
            <meshStandardMaterial color="#35424f" />
          </mesh>
        ))}
        {[-1, 1].map((side) => (
          <mesh
            key={`ray-${side}`}
            position={[side * 4, 7, -4]}
            rotation={[0, 0, side * 0.35]}
          >
            <coneGeometry args={[2.2, 16, 12, 1, true]} />
            <meshBasicMaterial
              color="#e8d5a0"
              transparent
              opacity={0.025}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
        {worlds.map((w, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <group
              key={w.name}
              position={[Math.sin(a) * 10, 0, Math.cos(a) * 7 - 9]}
              rotation={[0, -a, 0]}
              scale={0.65}
            >
              <Portal color={w.color} />
            </group>
          );
        })}
        <group ref={orbit} position={[0, 3, -2]}>
          {[3.2, 3.8, 4.5].map((r, i) => (
            <mesh
              key={r}
              position={[0, 3, -2]}
              rotation={[i * 0.7, 0.4, i * 0.4]}
            >
              <torusGeometry args={[r, 0.025, 4, 80]} />
              <meshBasicMaterial color="#b89e71" transparent opacity={0.3} />
            </mesh>
          ))}
        </group>
        <group ref={artifact} position={[0, 4, 4]} scale={0.7}>
          <mesh>
            <torusGeometry args={[0.45, 0.09, 8, 32]} />
            <meshStandardMaterial
              color="#ebce84"
              metalness={0.8}
              roughness={0.2}
              emissive="#b98735"
              emissiveIntensity={0.5}
            />
          </mesh>
          <mesh position={[0, -0.9, 0]}>
            <boxGeometry args={[0.12, 1.4, 0.12]} />
            <meshStandardMaterial
              color="#ebce84"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh position={[0.2, -1.4, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.15]} />
            <meshStandardMaterial color="#ebce84" />
          </mesh>
        </group>
        <Dust />
      </group>
    </>
  );
}
function Dust() {
  const ref = useRef<THREE.Points>(null);
  const [positions] = useState(() =>
    Float32Array.from(
      { length: 360 },
      (_, i) => Math.sin(i * 127.1 + 17) * (i % 3 === 1 ? 10 : 22),
    ),
  );
  useFrame((_, dt) => {
    if (ref.current && !matchMedia("(prefers-reduced-motion: reduce)").matches)
      ref.current.rotation.y += dt * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#e8c989"
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}
export function Journey({ onEnter }: { onEnter: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<Timeline>({
    progress: 0,
    chapter: 0,
    world: 0,
    reduced: false,
    active: true,
  });
  const [active, setActive] = useState(0);
  const [menu, setMenu] = useState(false);
  const [render, setRender] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    const sync = () => {
      timeline.current.reduced = query.matches;
      setReduced(query.matches);
      lenis?.destroy();
      lenis = query.matches
        ? undefined
        : new Lenis({
            duration: 1.25,
            smoothWheel: true,
            syncTouch: false,
            anchors: true,
          });
    };
    sync();
    query.addEventListener("change", sync);
    const sections = Array.from(
      root.current!.querySelectorAll<HTMLElement>("[data-chapter]"),
    );
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) =>
          e.target.classList.toggle("in-view", e.isIntersecting),
        ),
      { threshold: 0.12 },
    );
    sections.forEach((el) => observer.observe(el));
    let frame = 0;
    const tick = (time: number) => {
      lenis?.raf(time);
      const h = innerHeight;
      const total = document.documentElement.scrollHeight - h;
      timeline.current.progress = total > 0 ? scrollY / total : 0;
      let current = 0;
      sections.forEach((el, i) => {
        if (el.getBoundingClientRect().top < h * 0.6) current = i;
      });
      timeline.current.chapter = current;
      if (current >= 3 && current <= 8) timeline.current.world = current - 3;
      root.current?.style.setProperty(
        "--journey-progress",
        String(timeline.current.progress),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const visibility = () => {
      timeline.current.active = !document.hidden;
      setRender(!document.hidden);
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      observer.disconnect();
      query.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  const select = (i: number) => {
    setActive(i);
    timeline.current.world = i;
  };
  const enter = () => {
    window.scrollTo(0, 0);
    onEnter();
  };
  return (
    <div
      ref={root}
      className="journey"
      onPointerMove={(event) => {
        if (timeline.current.reduced || event.pointerType !== "mouse") return;
        const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
          ".journey-cta, .journey-links button",
        );
        if (!button) return;
        const rect = button.getBoundingClientRect();
        button.style.setProperty(
          "--pull-x",
          `${(event.clientX - rect.left - rect.width / 2) * 0.04}px`,
        );
        button.style.setProperty(
          "--pull-y",
          `${(event.clientY - rect.top - rect.height / 2) * 0.06}px`,
        );
      }}
      onPointerLeave={() =>
        root.current
          ?.querySelectorAll<HTMLButtonElement>("button")
          .forEach((button) => {
            button.style.removeProperty("--pull-x");
            button.style.removeProperty("--pull-y");
          })
      }
      role="main"
      style={{ "--world-color": worlds[active].color } as React.CSSProperties}
    >
      <a className="journey-skip" href="#doors">
        Skip to the worlds
      </a>
      <div className="journey-backdrop" aria-hidden="true">
        <SceneBoundary>
          <Suspense fallback={<div className="journey-scene-fallback" />}>
            <Canvas
              frameloop={render && !reduced ? "always" : "demand"}
              dpr={[0.75, 1.25]}
              camera={{ position: [0, 5.5, 19], fov: 50 }}
              gl={{ antialias: false, powerPreference: "low-power" }}
              fallback={<div className="journey-scene-fallback" />}
            >
              <Palace timeline={timeline} />
            </Canvas>
          </Suspense>
        </SceneBoundary>
      </div>
      <div className="journey-haze" aria-hidden="true" />
      <nav className="journey-nav" aria-label="Main navigation">
        <a href="#arrival" className="journey-logo">
          ◈ THE ATRIUM
        </a>
        <button
          className="journey-menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          Menu
        </button>
        <div className={menu ? "journey-links open" : "journey-links"}>
          <a href="#doors" onClick={() => setMenu(false)}>
            The worlds
          </a>
          <a href="#ritual" onClick={() => setMenu(false)}>
            The ritual
          </a>
          <button onClick={enter}>
            Enter the Atrium <span>↗</span>
          </button>
        </div>
      </nav>
      <section id="arrival" data-chapter className="journey-hero">
        <p className="journey-kicker">A PALACE BETWEEN UNIVERSES</p>
        <h1>
          THE
          <br />
          <em>ATRIUM</em>
        </h1>
        <p className="journey-tagline">
          Every door hides a world.
          <br />
          Every world hides a key.
        </p>
        <button className="journey-cta" onClick={enter}>
          Enter the Atrium <span>↗</span>
        </button>
        <a className="journey-scroll" href="#descent">
          SCROLL TO CROSS THE THRESHOLD <span>↓</span>
        </a>
        <span className="journey-edition">
          PRIVATE MULTIPLAYER · 2–6 PLAYERS
        </span>
      </section>
      <section id="descent" data-chapter className="journey-descent">
        <p className="journey-kicker">01 / THE THRESHOLD</p>
        <h2>
          Some places
          <br />
          exist <em>between.</em>
        </h2>
        <p>
          Beyond the familiar, six impossible worlds share a single address.
          Gather your friends. Step inside. Leave something worth finding.
        </p>
        <div className="journey-threshold" aria-hidden="true">
          ◈
        </div>
      </section>
      <section id="doors" data-chapter className="journey-doors">
        <p className="journey-kicker">02 / CHOOSE YOUR CURIOSITY</p>
        <h2>
          Six doors.
          <br />
          <em>No ordinary worlds.</em>
        </h2>
        <div
          className="journey-door-grid"
          role="group"
          aria-label="Universe selector"
        >
          {worlds.map((w, i) => (
            <button
              key={w.name}
              aria-pressed={active === i}
              onClick={() => select(i)}
              onPointerEnter={() => select(i)}
              onFocus={() => select(i)}
              style={
                {
                  "--door-color": w.color,
                  "--door-delay": `${i * 90}ms`,
                } as React.CSSProperties
              }
            >
              <span className="journey-door-arch">
                <span className="journey-door-sigil">
                  {["◷", "✧", "≈", "⌁", "◇", "〰"][i]}
                </span>
              </span>
              <small>0{i + 1}</small>
              <strong>{w.name}</strong>
            </button>
          ))}
        </div>
        <div className="journey-world-info" key={active} aria-live="polite">
          <span>{worlds[active].mode}</span>
          <p>{worlds[active].text}</p>
          <a href={`#world-${active}`}>Discover this world ↓</a>
        </div>
      </section>
      {worlds.map((w, i) => (
        <section
          key={w.name}
          id={`world-${i}`}
          data-chapter
          className={`journey-world journey-world-${i}`}
          style={{ "--local-color": w.color } as React.CSSProperties}
        >
          <div className="journey-world-art" aria-hidden="true">
            <WorldVignette world={i} />
            <div className="art-drift" />
          </div>
          <div className="journey-world-copy">
            <p className="journey-kicker">
              UNIVERSE 0{i + 1} / {w.mode}
            </p>
            <h3>{w.name}</h3>
            <h2>{w.word}</h2>
            <p>{w.text}</p>
            <a href="#ritual">
              Every world hides a key <span>↘</span>
            </a>
          </div>
        </section>
      ))}
      <section id="ritual" data-chapter className="journey-key">
        <p className="journey-kicker">03 / A SECRET OF YOUR OWN</p>
        <h2>
          Small object.
          <br />
          <em>Infinite possibility.</em>
        </h2>
        <div className="journey-key-art" aria-hidden="true">
          <svg viewBox="0 0 120 220">
            <circle cx="60" cy="48" r="28" />
            <circle cx="60" cy="48" r="18" />
            <path d="M60 76V190H89V174H72V158H90M49 20L60 8L71 20" />
          </svg>
        </div>
        <div className="journey-key-steps">
          {[
            "Hide your key",
            "Leave a clue",
            "Explore their worlds",
            "Find what they concealed",
          ].map((s, i) => (
            <p key={s}>
              <span>0{i + 1}</span>
              {s}
            </p>
          ))}
        </div>
      </section>
      <section data-chapter className="journey-how">
        <p className="journey-kicker">04 / THE RITUAL</p>
        <h2>
          A gathering.
          <br />A secret. <em>A race.</em>
        </h2>
        <div className="journey-floorplan" aria-hidden="true">
          <span>◈</span>
          {worlds.map((w, i) => (
            <i
              key={w.name}
              style={
                { "--i": i, "--door-color": w.color } as React.CSSProperties
              }
            >
              ✧
            </i>
          ))}
        </div>
        <ol>
          {[
            "Gather 2–6 friends in a private lobby.",
            "Receive a world. Hide your key. Leave a clue.",
            "Travel through each other’s worlds, one round at a time.",
            "Collect every rival key. Return to unlock the central portal.",
          ].map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>
      <section id="portal" data-chapter className="journey-finale">
        <div className="journey-convergence" aria-hidden="true">
          {worlds.map((w, i) => (
            <i
              key={w.name}
              style={
                { "--i": i, "--door-color": w.color } as React.CSSProperties
              }
            >
              ✧
            </i>
          ))}
        </div>
        <p className="journey-kicker">SIX WORLDS. ONE WAY HOME.</p>
        <h2>
          The last door
          <br />
          opens <em>for you.</em>
        </h2>
        <button className="journey-cta" onClick={enter}>
          Enter the Atrium <span>↗</span>
        </button>
        <p>Playable alpha · private rooms · no account needed</p>
        <a href="#arrival">Return to the threshold ↑</a>
      </section>
      <div className="journey-footer">
        <span>◈ THE ATRIUM</span>
        <span>AN ORIGINAL MULTIPLAYER MYSTERY</span>
        <button onClick={enter}>Play with friends ↗</button>
      </div>
    </div>
  );
}
