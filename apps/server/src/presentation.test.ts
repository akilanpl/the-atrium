import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { animationState, shortestAngle } from "../../client/src/motion.js";
import { quality, GRAPHICS } from "../../client/src/settings.js";
import { releaseCharacter } from "../../client/src/characterLifecycle.js";
import { Game } from "./game.js";
import {
  canOccupy,
  canTravel,
  groundHeight,
} from "../../../packages/shared/src/world.js";
test("locomotion transitions and shortest-angle turning", () => {
  let state = animationState(1, "idle", false, false);
  assert.equal(state, "start");
  state = animationState(2.2, state, false, false);
  assert.equal(state, "walk");
  state = animationState(5.4, state, false, false);
  assert.equal(state, "run");
  state = animationState(0, state, false, false);
  assert.equal(state, "stop");
  state = animationState(0, state, false, false);
  assert.equal(state, "idle");
  assert.equal(animationState(0, "idle", true, false), "turn");
  assert.equal(animationState(4, "run", false, true), "interact");
  assert.ok(
    Math.abs(shortestAngle(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 0.001,
  );
});
test("graphics presets scale workload and reject unknown settings", () => {
  assert.equal(quality("invalid"), "MEDIUM");
  assert.equal(quality("LOW"), "LOW");
  assert.ok(
    GRAPHICS.LOW.dpr < GRAPHICS.MEDIUM.dpr &&
      GRAPHICS.MEDIUM.dpr < GRAPHICS.HIGH.dpr,
  );
  assert.ok(!GRAPHICS.LOW.shadows && GRAPHICS.HIGH.shadows);
  assert.ok(GRAPHICS.LOW.particles < GRAPHICS.HIGH.particles);
});
test("both clothed humans have one compatible skeleton, full-body clips, and eyelid geometry", () => {
  for (const id of ["soren", "mara"]) {
    const data = readFileSync(`apps/client/public/assets/characters/${id}.glb`);
    assert.equal(data.readUInt32LE(0), 0x46546c67);
    const json = JSON.parse(
      data.subarray(20, 20 + data.readUInt32LE(12)).toString(),
    );
    assert.equal(json.skins.length, 1);
    assert.ok(json.skins[0].joints.length >= 50);
    for (const part of [
      "Body",
      "Eyes",
      "Hair_",
      "Cloth_shirt",
      "Cloth_jeans",
      "Cloth_boots",
    ])
      assert.ok(
        json.nodes.some(
          (n: any) => n.name?.includes(part) && n.mesh !== undefined,
        ),
        `${id}: ${part}`,
      );
    assert.ok(
      json.nodes
        .filter((n: any) => n.mesh !== undefined)
        .every((n: any) => n.skin === 0),
    );
    for (const clip of ["idle_breathe", "walk", "run", "turn", "interact"]) {
      const a = json.animations.find((a: any) => a.name === clip);
      assert.ok(a, clip);
      assert.ok(
        a.channels.length >= 20,
        clip + " must preserve the full-body pose",
      );
      for (const c of a.channels) assert.ok(json.nodes[c.target.node]);
    }
    const body = json.meshes.find((m: any) => m.name === "base");
    assert.deepEqual(body.extras.targetNames, ["blink_left", "blink_right"]);
    assert.ok(json.images.length >= 4);
  }
});
test("character cleanup releases clones without destroying shared cache", () => {
  const source = new THREE.Group(),
    bone = new THREE.Bone(),
    mesh = new THREE.SkinnedMesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial(),
    );
  source.add(bone, mesh);
  mesh.bind(new THREE.Skeleton([bone]));
  const model = clone(source);
  const owned = new THREE.MeshStandardMaterial();
  const instance = model.children.find(
    (o) => o instanceof THREE.SkinnedMesh,
  ) as THREE.SkinnedMesh;
  instance.material = owned;
  const mixer = new THREE.AnimationMixer(model);
  let materials = 0,
    geometry = 0;
  owned.addEventListener("dispose", () => materials++);
  mesh.geometry.addEventListener("dispose", () => geometry++);
  releaseCharacter(model, mixer, [owned]);
  assert.equal(materials, 1);
  assert.equal(geometry, 0);
  assert.notEqual(instance.skeleton, mesh.skeleton);
  assert.equal(instance.geometry, mesh.geometry);
});
test("avatar validation, motion replication and interaction events remain server owned", () => {
  const g = new Game("AVATAR");
  g.add("a", "A", "mara");
  g.add("b", "B", "forged");
  assert.equal(g.player("b").avatar, "soren");
  const p = g.player("a");
  g.setInput(
    "a",
    {
      epoch: g.epoch,
      seq: 1,
      x: 1,
      z: 0,
      yaw: 1,
      run: false,
      jump: false,
      descend: false,
    },
    100,
  );
  g.tick(150);
  assert.equal(p.motion, "walk");
  assert.ok(p.speed > 0 && p.speed <= 1.65);
  g.start("a", 200);
  g.player("b").universe = "library";
  g.next(300);
  p.x = -6;
  p.z = -3;
  g.interact("a", "clock");
  assert.equal(p.action, 1);
  assert.equal(p.yaw, Math.PI);
  assert.throws(() => g.interact("a", "not-an-object"));
  assert.equal(p.action, 1);
  g.finish("a", 400);
  g.replay("a");
  assert.equal(p.action, 0);
  assert.equal(p.avatar, "mara");
});
test("shared collision bounds protect doors and the closed bookshelf", () => {
  assert.ok(!canOccupy(0, -7.6, true, false));
  assert.ok(canOccupy(0, -7.6, true, true));
  assert.ok(!canOccupy(0, -10, false, false));
  assert.ok(canOccupy(0, -8, false, false));
  assert.ok(!canOccupy(20, 0, false, false));
  assert.ok(!canTravel(0, -9.3, 0, -10.7, false, false));
  assert.ok(!canOccupy(5, -4, true, true));
});

test("portal plinth height follows the rendered floor without changing library ground", () => {
  assert.equal(groundHeight(0, 2, false), 0.18);
  assert.equal(groundHeight(0, 6, false), 0);
  assert.equal(groundHeight(0, 2, true), 0);
});

test("camera targeting chooses only a visible reticle hit within reach and respects occluding walls", async () => {
  const { pickInteraction } =
    await import("../../client/src/spatialInteraction.js");
  const camera = new THREE.PerspectiveCamera(55, 1.6, 0.1, 100);
  camera.position.set(0, 3, 5);
  camera.lookAt(0, 1.4, 0);
  camera.updateMatrixWorld(true);
  const target = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.85, 0.85),
    new THREE.MeshBasicMaterial(),
  );
  target.position.set(0, 0.7, -2);
  target.userData.interact = "clock";
  target.updateMatrixWorld(true);
  assert.equal(
    pickInteraction(camera, [target], [], { x: 0, y: 0, z: 0 }),
    "clock",
  );
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 0.5),
    new THREE.MeshBasicMaterial(),
  );
  wall.position.set(0, 1.5, -1);
  wall.updateMatrixWorld(true);
  assert.equal(
    pickInteraction(camera, [target], [wall], { x: 0, y: 0, z: 0 }),
    "",
  );
  assert.equal(pickInteraction(camera, [target], [], { x: 5, y: 0, z: 0 }), "");
  target.position.x = 4;
  target.updateMatrixWorld(true);
  assert.equal(pickInteraction(camera, [target], [], { x: 4, y: 0, z: 0 }), "");
  target.geometry.dispose();
  wall.geometry.dispose();
  (target.material as THREE.Material).dispose();
  (wall.material as THREE.Material).dispose();
});
