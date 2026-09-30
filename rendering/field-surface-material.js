import * as THREE from "../vendor/three.module.min.js";

const VERTEX_SHADER = `
precision highp float;

uniform float uTime;
uniform float uEnergy;
uniform float uScarStrength;
uniform float uScarExact;
uniform float uMotionScale;
uniform float uDisturbance;
uniform vec2 uImpactOrigin;
uniform int uGeometry;

varying vec3 vLocalPosition;
varying vec3 vWorldPosition;
varying float vField;
varying float vInside;

float hash11(float p) {
  return fract(sin(p * 127.1) * 43758.5453123);
}

float sdCircle(vec2 p) {
  return 0.84 - length(p);
}

float sdStadium(vec2 p) {
  vec2 q = vec2(max(abs(p.x) - 0.55, 0.0), p.y);
  return 0.58 - length(q);
}

float sdTriangle(vec2 p) {
  const float k = 1.7320508;
  p.x = abs(p.x) - 0.82;
  p.y = p.y + 0.48;
  if (p.x + k * p.y > 0.0) p = vec2(p.x - k * p.y, -k * p.x - p.y) * 0.5;
  p.x -= clamp(p.x, -1.64, 0.0);
  return -length(p) * sign(p.y);
}

float sdStarApprox(vec2 p) {
  float a = atan(p.y, p.x);
  float r = length(p);
  float lobes = 0.62 + 0.20 * cos(6.0 * a);
  return lobes - r;
}

float signedDomain(vec2 p) {
  if (uGeometry == 0) return sdCircle(p);
  if (uGeometry == 1) return sdTriangle(p);
  if (uGeometry == 2) return sdStarApprox(p);
  return sdStadium(p);
}

float fieldPattern(vec2 p) {
  float t = uTime * uMotionScale;
  float k = 3.1 + uEnergy * 0.105;
  float psi = 0.0;

  if (uGeometry == 0) {
    float r = length(p) / 0.84;
    float a = atan(p.y, p.x);
    float m = 2.0 + mod(uEnergy, 9.0);
    float radial = 1.0 + mod(floor(uEnergy / 34.0), 8.0);
    psi = sin(radial * 3.14159265 * (1.0 - r) + t * 2.2) * cos(m * a - t * 1.4);
    psi += 0.42 * sin((radial + 2.0) * 3.14159265 * (1.0 - r * r) - t) * cos((m + 3.0) * a + t * 0.8);
  } else if (uGeometry == 1) {
    float k2 = k * 0.58;
    psi = sin(k2 * (p.x + 0.22 * p.y) + t * 2.0);
    psi += sin(k2 * (-0.5 * p.x + 0.866 * p.y) - t * 1.4);
    psi += sin(k2 * (-0.5 * p.x - 0.866 * p.y) + t * 0.9);
    psi += 0.36 * sin(k2 * 1.7 * p.x - t * 1.6) * sin(k2 * 1.1 * p.y + t);
    psi *= 0.55;
  } else {
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float angle = hash11(uEnergy * 0.71 + fi * 13.31 + float(uGeometry) * 5.0) * 6.2831853;
      float speed = 0.35 + hash11(fi * 2.9 + uEnergy) * 0.95;
      float offset = hash11(uEnergy * 1.13 + fi * 5.7) * 6.2831853;
      psi += sin(k * dot(vec2(cos(angle), sin(angle)), p) + offset + t * speed);
    }
    psi *= 0.34;
  }

  float density = clamp(psi * psi * 0.26, 0.0, 1.0);
  return mix(density, min(1.0, density * 0.35 + abs(psi) * 0.5), uScarStrength * 0.62);
}

void main() {
  vec3 displaced = position;
  float domain = signedDomain(position.xz);
  float inside = smoothstep(-0.025, 0.02, domain);
  float edgeFade = smoothstep(0.0, 0.16, domain);
  float field = fieldPattern(position.xz) * edgeFade;
  displaced.y += inside * field * 0.115 * uMotionScale;
  float rippleDistance = distance(position.xz, uImpactOrigin);
  float ripple = sin(rippleDistance * 34.0 - uTime * 10.0) * exp(-rippleDistance * 5.5) * uDisturbance;
  displaced.y += inside * ripple * 0.016 * uMotionScale;
  displaced.y -= (1.0 - inside) * 0.027;

  vLocalPosition = displaced;
  vField = field;
  vInside = inside;
  vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec3 uBaseColor;
uniform vec3 uFieldColor;
uniform vec3 uScarColor;
uniform float uScarStrength;
uniform float uScarExact;
uniform float uTime;
uniform float uReducedMotion;
uniform float uDisturbance;
uniform vec2 uImpactOrigin;
uniform vec3 uCameraPosition;

varying vec3 vLocalPosition;
varying vec3 vWorldPosition;
varying float vField;
varying float vInside;

void main() {
  vec3 dx = dFdx(vWorldPosition);
  vec3 dy = dFdy(vWorldPosition);
  vec3 normal = normalize(cross(dx, dy));
  if (!gl_FrontFacing) normal *= -1.0;

  vec3 viewDirection = normalize(uCameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
  float weave = 0.5 + 0.5 * sin(vLocalPosition.x * 180.0 + sin(vLocalPosition.z * 137.0) * 0.7);
  float felt = mix(0.94, 1.04, weave * 0.22);

  float fieldGlow = pow(clamp(vField, 0.0, 1.0), 0.72);
  vec3 color = uBaseColor * felt;
  color = mix(color, uFieldColor, fieldGlow * 0.72);

  float calmPulse = mix(1.0, 0.88 + 0.12 * sin(uTime * 1.35), 1.0 - uReducedMotion);
  float scarSignal = uScarStrength * (0.2 + fieldGlow * 0.8) * calmPulse;
  color = mix(color, uScarColor, scarSignal * (0.28 + uScarExact * 0.34));
  color += uFieldColor * fieldGlow * 0.26;
  color += mix(uFieldColor, uScarColor, uScarExact) * fresnel * (0.035 + 0.10 * uScarStrength);
  float impactDistance = distance(vLocalPosition.xz, uImpactOrigin);
  float impactHalo = exp(-impactDistance * 7.0) * uDisturbance;
  vec3 spectral = mix(uFieldColor, vec3(0.72, 0.55, 1.0), smoothstep(0.0, 1.0, uScarExact));
  color += spectral * impactHalo * 0.22;

  vec3 outside = vec3(0.006, 0.007, 0.009);
  color = mix(outside, color, vInside);
  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const GEOMETRY_IDS = Object.freeze({ circle: 0, triangle: 1, star: 2, stadium: 3 });

export function createFieldSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    name: "QuantumFieldSurfaceMaterial",
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    transparent: false,
    uniforms: {
      uTime: { value: 0 },
      uEnergy: { value: 90 },
      uScarStrength: { value: 0 },
      uScarExact: { value: 0 },
      uMotionScale: { value: 1 },
      uDisturbance: { value: 0 },
      uImpactOrigin: { value: new THREE.Vector2() },
      uGeometry: { value: 0 },
      uBaseColor: { value: new THREE.Color(0x071412) },
      uFieldColor: { value: new THREE.Color(0x35d9d3) },
      uScarColor: { value: new THREE.Color(0xe2b55f) },
      uReducedMotion: { value: 0 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
  });
}

export function updateFieldSurfaceMaterial(material, options = {}) {
  if (!material?.uniforms) return;
  const uniforms = material.uniforms;
  if (Number.isFinite(options.timeSeconds)) uniforms.uTime.value = options.timeSeconds;
  if (Number.isFinite(options.energy)) uniforms.uEnergy.value = options.energy;
  if (Number.isFinite(options.scarStrength)) uniforms.uScarStrength.value = THREE.MathUtils.clamp(options.scarStrength, 0, 1);
  uniforms.uScarExact.value = options.scarExact ? 1 : 0;
  uniforms.uGeometry.value = GEOMETRY_IDS[options.geometry] ?? 0;
  uniforms.uReducedMotion.value = options.reducedMotion ? 1 : 0;
  if (Number.isFinite(options.disturbance)) uniforms.uDisturbance.value = THREE.MathUtils.clamp(options.disturbance, 0, 1.5);
  if (options.impactOrigin) uniforms.uImpactOrigin.value.copy(options.impactOrigin);
  const tier = options.quality || "high";
  uniforms.uMotionScale.value = tier === "low" ? 0 : tier === "medium" || tier === "xr-safe" ? 0.62 : 1;
  if (options.cameraPosition) uniforms.uCameraPosition.value.copy(options.cameraPosition);
}
