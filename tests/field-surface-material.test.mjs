import assert from "node:assert/strict";
import { createFieldSurfaceMaterial, updateFieldSurfaceMaterial } from "../rendering/field-surface-material.js";

const material = createFieldSurfaceMaterial();
updateFieldSurfaceMaterial(material, {
  timeSeconds: 4.5,
  energy: 180,
  geometry: "stadium",
  scarStrength: 0.8,
  scarExact: true,
  quality: "medium",
  reducedMotion: true,
});

assert.equal(material.uniforms.uTime.value, 4.5);
assert.equal(material.uniforms.uEnergy.value, 180);
assert.equal(material.uniforms.uGeometry.value, 3);
assert.equal(material.uniforms.uScarStrength.value, 0.8);
assert.equal(material.uniforms.uScarExact.value, 1);
assert.equal(material.uniforms.uMotionScale.value, 0.62);
assert.equal(material.uniforms.uReducedMotion.value, 1);

updateFieldSurfaceMaterial(material, { scarStrength: 3, quality: "low" });
assert.equal(material.uniforms.uScarStrength.value, 1);
assert.equal(material.uniforms.uMotionScale.value, 0);

material.dispose();
console.log("field surface material tests passed");
