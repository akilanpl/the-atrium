import fs from "node:fs/promises";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  prune,
  unpartition,
  textureCompress,
} from "@gltf-transform/functions";
import sharp from "sharp";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const name of ["clock", "bust", "chandelier"]) {
  const source = "work/props/" + name + "/" + name + ".gltf";
  if (name === "clock") {
    const json = JSON.parse(await fs.readFile(source, "utf8"));
    for (const image of json.images)
      image.uri = image.uri.replace("_8k", "_1k");
    await fs.writeFile(
      "work/props/clock/clock-local.gltf",
      JSON.stringify(json),
    );
  }
  const doc = await io.read(
    name === "clock" ? "work/props/clock/clock-local.gltf" : source,
  );
  await doc.transform(
    textureCompress({ encoder: sharp, resize: [512, 512] }),
    dedup(),
    prune(),
    unpartition(),
  );
  await io.write("apps/client/public/assets/props/" + name + ".glb", doc);
  console.log(name);
}
