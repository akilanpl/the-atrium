import type { Motion } from "../../../packages/shared/src/world.js";
export function animationState(
  speed: number,
  previous: Motion,
  turning: boolean,
  interacting: boolean,
): Motion {
  if (interacting) return "interact";
  if (speed > 0.12) {
    if (previous === "idle" || previous === "stop" || previous === "turn")
      return "start";
    return speed > 2.6 ? "run" : "walk";
  }
  if (previous === "walk" || previous === "run" || previous === "start")
    return "stop";
  return turning ? "turn" : "idle";
}
export function shortestAngle(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}
