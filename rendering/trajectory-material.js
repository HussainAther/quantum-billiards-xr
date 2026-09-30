import * as THREE from "../vendor/three.module.min.js";

const VERTEX_SHADER = `
attribute float pathProgress;
varying float vPathProgress;

void main() {
  vPathProgress = pathProgress;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform vec3 pathColor;
uniform float pathOpacity;
uniform float timeSeconds;
uniform float pulseSpeed;
uniform float pulseDensity;
uniform float pulseStrength;
uniform float tailFade;
uniform float phaseOffset;
uniform float confidence;
uniform float reducedMotion;

varying float vPathProgress;

void main() {
  float progress = clamp(vPathProgress, 0.0, 1.0);
  float movingPhase = phaseOffset;
  if (reducedMotion < 0.5) {
    movingPhase += timeSeconds * pulseSpeed;
  }

  float wave = 0.5 + 0.5 * sin((progress * pulseDensity - movingPhase) * 6.28318530718);
  wave = smoothstep(0.28, 0.9, wave);

  float head = smoothstep(0.0, 0.08, progress);
  float tail = mix(1.0, smoothstep(0.0, 0.32, progress), clamp(tailFade, 0.0, 1.0));
  float certainty = mix(0.72, 1.0, clamp(confidence, 0.0, 1.0));
  float alpha = pathOpacity * head * tail * certainty * mix(1.0, wave, pulseStrength);

  if (alpha < 0.01) discard;
  gl_FragColor = vec4(pathColor, alpha);
}
`;

export function createTrajectoryMaterial({
  color = 0x39d8e8,
  opacity = 0.9,
  pulseSpeed = 0.38,
  pulseDensity = 4.5,
  pulseStrength = 0.24,
  tailFade = 0.18,
  phaseOffset = 0,
  confidence = 1,
  reducedMotion = false,
} = {}) {
  return new THREE.ShaderMaterial({
    name: "QuantumTrajectoryMaterial",
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      pathColor: { value: new THREE.Color(color) },
      pathOpacity: { value: opacity },
      timeSeconds: { value: 0 },
      pulseSpeed: { value: pulseSpeed },
      pulseDensity: { value: pulseDensity },
      pulseStrength: { value: pulseStrength },
      tailFade: { value: tailFade },
      phaseOffset: { value: phaseOffset },
      confidence: { value: confidence },
      reducedMotion: { value: reducedMotion ? 1 : 0 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
}

export function updateTrajectoryMaterial(material, {
  color,
  opacity,
  timeSeconds,
  phaseOffset,
  confidence,
  pulseStrength,
  reducedMotion,
} = {}) {
  const uniforms = material?.uniforms;
  if (!uniforms) return;
  if (color !== undefined) uniforms.pathColor.value.set(color);
  if (opacity !== undefined) uniforms.pathOpacity.value = opacity;
  if (timeSeconds !== undefined) uniforms.timeSeconds.value = timeSeconds;
  if (phaseOffset !== undefined) uniforms.phaseOffset.value = phaseOffset;
  if (confidence !== undefined) uniforms.confidence.value = confidence;
  if (pulseStrength !== undefined) uniforms.pulseStrength.value = pulseStrength;
  if (reducedMotion !== undefined) uniforms.reducedMotion.value = reducedMotion ? 1 : 0;
}
