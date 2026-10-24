import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dequantize,
  mergeDocuments,
  prune,
  dedup,
  unpartition,
  resample,
} from "@gltf-transform/functions";
import { Quaternion, Euler } from "three";
import fs from "node:fs/promises";
const folder = "work/character-source";
const output = "apps/client/public/assets/characters";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const presets = {
  soren: {
    hair: "short02",
    face: {
      face_jaw_width_incr: 0.4,
      face_nose_width_incr: 0.2,
      face_chin_incr: 0.2,
    },
  },
  mara: {
    hair: "bob02",
    face: {
      face_jaw_width_decr: 0.55,
      face_cheekbones_incr: 0.35,
      face_nose_width_decr: 0.3,
      face_lips_incr: 0.25,
      face_eye_size_incr: 0.15,
    },
  },
};
function bake(doc, face) {
  for (const mesh of doc.getRoot().listMeshes()) {
    const names = mesh.getExtras().targetNames || [];
    let kept = [];
    for (const primitive of mesh.listPrimitives()) {
      const targets = primitive.listTargets();
      for (const semantic of ["POSITION", "NORMAL"]) {
        const acc = primitive.getAttribute(semantic);
        if (!acc) continue;
        const result = new Float32Array(acc.getCount() * acc.getElementSize());
        const el = [];
        for (let i = 0; i < acc.getCount(); i++) {
          acc.getElement(i, el);
          result.set(el, i * acc.getElementSize());
        }
        for (const [name, w] of Object.entries(face)) {
          const target = targets[names.indexOf(name)]?.getAttribute(semantic);
          if (!target) continue;
          for (let i = 0; i < acc.getCount(); i++) {
            target.getElement(i, el);
            for (let k = 0; k < el.length; k++)
              result[i * el.length + k] += el[k] * w;
          }
        }
        acc.setArray(result).setNormalized(false);
      }
      kept = [];
      targets.forEach((target, i) => {
        if (names[i] === "blink_left" || names[i] === "blink_right")
          kept.push(names[i]);
        else primitive.removeTarget(target);
      });
      for (const s of primitive.listSemantics())
        if (s.startsWith("_")) primitive.setAttribute(s, null);
    }
    mesh.setExtras({ targetNames: kept }).setWeights(kept.map(() => 0));
  }
  for (const node of doc.getRoot().listNodes())
    if (node.getMesh()) node.setWeights(node.getMesh().getWeights());
}
function maskBody(doc) {
  const skin = doc.getRoot().listSkins()[0];
  const names = skin.listJoints().map((j) => j.getName());
  const mesh = doc
    .getRoot()
    .listMeshes()
    .find((m) => m.getName() === "base");
  for (const p of mesh.listPrimitives()) {
    const joints = p.getAttribute("JOINTS_0"),
      weights = p.getAttribute("WEIGHTS_0"),
      indices = p.getIndices();
    const v = [];
    const w = [];
    const hidden = (i) => {
      joints.getElement(i, v);
      weights.getElement(i, w);
      let covered = 0;
      for (let k = 0; k < 4; k++)
        if (
          /pelvis|spine|clavicle|upperarm|lowerarm|thigh|calf|foot|ball/.test(
            names[v[k]],
          )
        )
          covered += w[k];
      return covered > 0.6;
    };
    const original = indices.getArray(),
      filtered = [];
    for (let i = 0; i < original.length; i += 3) {
      if (![original[i], original[i + 1], original[i + 2]].every(hidden))
        filtered.push(original[i], original[i + 1], original[i + 2]);
    }
    indices.setArray(new Uint16Array(filtered));
  }
}
function authoredClip(doc, name, bones, duration) {
  const buffer = doc.getRoot().listBuffers()[0];
  const animation = doc.createAnimation(name);
  const idle = doc
    .getRoot()
    .listAnimations()
    .find((a) => a.getName() === "idle");
  // Hold all other body joints in the idle pose during authored one-shots.
  for (const channel of idle.listChannels()) {
    if (
      channel.getTargetPath() === "rotation" &&
      bones[channel.getTargetNode().getName()]
    )
      continue;
    const input = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(new Float32Array([0, duration]))
      .setBuffer(buffer);
    const source = channel.getSampler().getOutput();
    const first = [];
    source.getElement(0, first);
    const output = doc
      .createAccessor()
      .setType(source.getType())
      .setArray(new Float32Array([...first, ...first]))
      .setBuffer(buffer);
    const sampler = doc
      .createAnimationSampler()
      .setInput(input)
      .setOutput(output);
    animation
      .addSampler(sampler)
      .addChannel(
        doc
          .createAnimationChannel()
          .setTargetNode(channel.getTargetNode())
          .setTargetPath(channel.getTargetPath())
          .setSampler(sampler),
      );
  }
  for (const [bone, angles] of Object.entries(bones)) {
    const node = doc
      .getRoot()
      .listNodes()
      .find((n) => n.getName() === bone);
    if (!node) throw Error("Missing bone " + bone);
    const idleChannel = idle
      .listChannels()
      .find(
        (c) => c.getTargetNode() === node && c.getTargetPath() === "rotation",
      );
    const first = [];
    if (idleChannel) idleChannel.getSampler().getOutput().getElement(0, first);
    const base = new Quaternion(...(first.length ? first : node.getRotation()));
    const data = [];
    for (const amount of [0, 1, 1, 0]) {
      const delta = new Quaternion().setFromEuler(
        new Euler(...angles.map((x) => x * amount)),
      );
      data.push(...base.clone().multiply(delta).toArray());
    }
    const input = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(
        new Float32Array([0, duration * 0.35, duration * 0.65, duration]),
      )
      .setBuffer(buffer);
    const output = doc
      .createAccessor()
      .setType("VEC4")
      .setArray(new Float32Array(data))
      .setBuffer(buffer);
    const sampler = doc
      .createAnimationSampler()
      .setInput(input)
      .setOutput(output)
      .setInterpolation("LINEAR");
    animation
      .addSampler(sampler)
      .addChannel(
        doc
          .createAnimationChannel()
          .setTargetNode(node)
          .setTargetPath("rotation")
          .setSampler(sampler),
      );
  }
}
for (const [id, preset] of Object.entries(presets)) {
  const doc = await io.read(folder + "/base_body_anim.glb");
  await doc.transform(dequantize());
  bake(doc, preset.face);
  maskBody(doc);
  const bodySkin = doc.getRoot().listSkins()[0];
  const root = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === "Armature");
  for (const file of [
    "clothing_shirt.glb",
    "clothing_jeans.glb",
    "clothing_boots.glb",
    "hair_" + preset.hair + ".glb",
  ]) {
    const source = await io.read(folder + "/" + file);
    await source.transform(dequantize());
    bake(source, preset.face);
    const map = mergeDocuments(doc, source);
    for (const sourceNode of source.getRoot().listNodes()) {
      if (!sourceNode.getMesh()) continue;
      const n = map.get(sourceNode);
      if (sourceNode.getSkin()) {
        const order = sourceNode
          .getSkin()
          .listJoints()
          .map((j) => j.getName());
        const expected = bodySkin.listJoints().map((j) => j.getName());
        if (order.join() !== expected.join())
          throw Error("Rig order differs: " + file);
        n.setSkin(bodySkin);
      }
      root.addChild(n);
    }
    for (const sourceScene of source.getRoot().listScenes()) {
      const s = map.get(sourceScene);
      s.dispose();
    }
  }
  for (const a of [...doc.getRoot().listAnimations()])
    if (
      !["idle", "idle_breathe", "idle_look", "walk", "run"].includes(
        a.getName(),
      )
    )
      a.dispose();
  authoredClip(
    doc,
    "interact",
    { upperarm_r: [-0.8, 0, 0.2], lowerarm_r: [-0.6, 0, 0] },
    0.85,
  );
  authoredClip(
    doc,
    "turn",
    { spine_03: [0, 0.12, 0], head: [0, 0.25, 0] },
    0.8,
  );
  authoredClip(
    doc,
    "celebrate",
    { upperarm_l: [-0.4, 0, -0.6], upperarm_r: [-0.4, 0, 0.6] },
    1.4,
  );
  await doc.transform(prune(), dedup(), resample(), unpartition());
  await io.write(output + "/" + id + ".glb", doc);
  console.log(id, (await fs.stat(output + "/" + id + ".glb")).size);
}
