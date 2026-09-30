import assert from "node:assert/strict";
import { canReplayShot, createReplaySnapshot } from "../experience/shot-replay.js";

const source = [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }];
const snapshot = createReplaySnapshot({ path3: source, color: 0xffffff, duration: 900, geometry: "circle", challengeIndex: 0, energy: 55, power: 66 });
assert.ok(snapshot);
assert.equal(snapshot.path3.length, 2);
source[0].x = 99;
assert.equal(snapshot.path3[0].x, 1, "snapshot must not retain mutable point references");
assert.equal(canReplayShot(snapshot, { phase: "playing", paused: false, replaying: false, shots: [] }), true);
assert.equal(canReplayShot(snapshot, { phase: "playing", paused: false, replaying: true, shots: [] }), false);
assert.equal(canReplayShot(snapshot, { phase: "playing", paused: false, replaying: false, shots: [{}] }), false);
assert.equal(createReplaySnapshot({ path3: [{ x: 0, y: 0, z: 0 }] }), null);
console.log("experience tests passed");
