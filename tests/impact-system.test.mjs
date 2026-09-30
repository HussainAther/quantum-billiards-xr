import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.min.js";
import { createImpactSystem } from "../rendering/impact-system.js";

const group = new THREE.Group();
const system = createImpactSystem({ group, quality: "low" });
assert.equal(group.children.length, 9, "low quality should allocate a bounded pool");

system.spawn({
  position: new THREE.Vector3(0.1, 0.2, 0.3),
  normal: new THREE.Vector3(0, 1, 0),
  type: "target",
  strength: 1,
  reducedMotion: false,
});
assert.ok(group.children.some((child) => child.visible), "spawn should activate pooled visuals");

system.update(performance.now() + 2000);
assert.ok(group.children.every((child) => !child.visible), "expired effects should return to the pool");

system.dispose();
assert.equal(group.children.length, 0, "dispose should detach pooled resources");
console.log("impact system tests passed");
