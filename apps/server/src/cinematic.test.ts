import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bodyState,
  observedSpeed,
  transitionIdentity,
  burstEnvelope,
  ATMOSPHERES,
} from "../../client/src/presentation.js";
import { UNIVERSES } from "../../../packages/shared/src/universes.js";
test("physical presentation follows authoritative gravity and buoyancy", () => {
  assert.equal(bodyState("observatory", false, 2, true), "takeoff");
  assert.equal(bodyState("garden", false, -1, false), "air");
  assert.equal(bodyState("garden", true, 0, false), "land");
  assert.equal(bodyState("library", true, 0, true), "ground");
  assert.equal(bodyState("sanctuary", true, 0, true), "swim");
});
test("stationary and teleported remote avatars do not manufacture running speed", () => {
  assert.equal(observedSpeed(0, 0.016, false), 0);
  assert.equal(observedSpeed(100, 0.016, true), 0);
  assert.equal(observedSpeed(1, 0, false), 0);
  assert.equal(observedSpeed(0.05, 0.05, false), 1);
});
test("replay and round boundaries reset presentation identity", () => {
  assert.notEqual(
    transitionIdentity("a", "x", "EXPLORATION", 1),
    transitionIdentity("b", "x", "EXPLORATION", 1),
  );
  assert.notEqual(
    transitionIdentity("a", "x", "EXPLORATION", 1),
    transitionIdentity("a", "x", "EXPLORATION", 2),
  );
});
test("reward envelopes resolve cleanly and each universe has a distinct lighting palette", () => {
  assert.equal(burstEnvelope(-1), 0);
  assert.equal(burstEnvelope(0), 0);
  assert.equal(burstEnvelope(1.4), 0);
  assert.equal(burstEnvelope(99), 0);
  assert.ok(burstEnvelope(0.7) > 0.99);
  assert.equal(new Set(UNIVERSES.map((u) => ATMOSPHERES[u.id].fog)).size, 6);
});
