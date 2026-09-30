import * as THREE from "./vendor/three.module.min.js";

const VR_PLACEMENT = Object.freeze({
  position: new THREE.Vector3(0, 0.78, -1.15),
  scale: 0.56,
});

const AR_SCALE = 0.52;
const ROTATE_SPEED = 1.35;
const DEADZONE = 0.18;

export function createXRTabletopMode({
  renderer,
  scene,
  playfieldRoot,
  getSource,
  onAim,
  onFire,
  onStatus,
  onEnvironmentMode,
}) {
  const controllers = [];
  const inversePlayfield = new THREE.Matrix4();
  const controllerOrigin = new THREE.Vector3();
  const controllerDirection = new THREE.Vector3();
  const controllerQuaternion = new THREE.Quaternion();
  const localOrigin = new THREE.Vector3();
  const localDirection = new THREE.Vector3();
  const localHit = new THREE.Vector3();
  const hitMatrix = new THREE.Matrix4();
  const hitPosition = new THREE.Vector3();
  const hitQuaternion = new THREE.Quaternion();
  const hitScale = new THREE.Vector3();
  const surfaceUp = new THREE.Vector3(0, 1, 0);
  const tempEuler = new THREE.Euler();

  let support = { ar: false, vr: false };
  let activeSession = null;
  let activeMode = null;
  let lastInputSource = null;
  let viewerSpace = null;
  let hitTestSource = null;
  let placementMode = false;
  let tablePlaced = false;
  let lastRotateTime = 0;

  const reticle = buildPlacementReticle();
  reticle.visible = false;
  scene.add(reticle);

  function emitStatus(label, extras = {}) {
    onStatus?.({
      supported: support.ar || support.vr,
      support: { ...support },
      active: Boolean(activeSession),
      mode: activeMode,
      placementMode,
      tablePlaced,
      label,
      ...extras,
    });
  }

  function placeVRTabletop() {
    playfieldRoot.position.copy(VR_PLACEMENT.position);
    playfieldRoot.rotation.set(0, 0, 0);
    playfieldRoot.scale.setScalar(VR_PLACEMENT.scale);
    playfieldRoot.visible = true;
    playfieldRoot.updateMatrixWorld(true);
  }

  function resetDesktopPlacement() {
    playfieldRoot.position.set(0, 0, 0);
    playfieldRoot.rotation.set(0, 0, 0);
    playfieldRoot.scale.setScalar(1);
    playfieldRoot.visible = true;
    playfieldRoot.updateMatrixWorld(true);
  }

  function buildPlacementReticle() {
    const group = new THREE.Group();
    group.name = "xr-ar-placement-reticle";

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.085, 0.105, 48),
      new THREE.MeshBasicMaterial({
        color: 0x66efdf,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;

    const crossMaterial = new THREE.LineBasicMaterial({
      color: 0xe7fff9,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const crossGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.14, 0.002, 0),
      new THREE.Vector3(0.14, 0.002, 0),
      new THREE.Vector3(0, 0.002, 0),
      new THREE.Vector3(0, 0.002, -0.14),
      new THREE.Vector3(0, 0.002, 0.14),
    ]);
    const cross = new THREE.Line(crossGeometry, crossMaterial);
    group.add(ring, cross);
    group.renderOrder = 20;
    return group;
  }

  function buildControllers() {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -0.75),
    ]);
    const material = new THREE.LineBasicMaterial({
      color: 0x66ef9a,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    for (let index = 0; index < 2; index += 1) {
      const controller = renderer.xr.getController(index);
      const ray = new THREE.Line(geometry.clone(), material.clone());
      ray.name = "xr-aim-ray";
      controller.add(ray);

      const selectHandler = (event) => {
        lastInputSource = event.data || event.inputSource || lastInputSource;
        if (activeMode === "ar" && placementMode) {
          placeAtReticle();
          return;
        }
        onFire(event);
      };
      const squeezeHandler = (event) => {
        lastInputSource = event.data || event.inputSource || lastInputSource;
        if (activeMode === "ar" && tablePlaced) togglePlacementMode();
      };

      controller.userData.qbSelectHandler = selectHandler;
      controller.userData.qbSqueezeHandler = squeezeHandler;
      controller.addEventListener("selectstart", selectHandler);
      controller.addEventListener("squeezestart", squeezeHandler);
      controllers.push(controller);
      scene.add(controller);
    }

    geometry.dispose();
    material.dispose();
  }

  async function detectSupport() {
    support = { ar: false, vr: false };
    emitStatus("Checking");

    if (!window.isSecureContext || !navigator.xr) {
      emitStatus("No XR");
      return { ...support };
    }

    const [ar, vr] = await Promise.all([
      navigator.xr.isSessionSupported("immersive-ar").catch(() => false),
      navigator.xr.isSessionSupported("immersive-vr").catch(() => false),
    ]);
    support = { ar, vr };
    emitStatus(ar ? "AR Ready" : vr ? "VR Ready" : "No XR");
    return { ...support };
  }

  async function start(mode = "ar") {
    const current = renderer.xr.getSession();
    if (current) await current.end();
    if (mode === "ar" && !support.ar) return false;
    if (mode === "vr" && !support.vr) return false;

    try {
      const session = await navigator.xr.requestSession(
        mode === "ar" ? "immersive-ar" : "immersive-vr",
        mode === "ar"
          ? {
              requiredFeatures: ["hit-test"],
              optionalFeatures: ["local-floor", "dom-overlay", "hand-tracking", "anchors"],
              domOverlay: document.body ? { root: document.body } : undefined,
            }
          : {
              requiredFeatures: ["local-floor"],
              optionalFeatures: ["bounded-floor", "hand-tracking"],
            }
      );

      activeSession = session;
      activeMode = mode;
      tablePlaced = mode === "vr";
      placementMode = mode === "ar";
      lastRotateTime = performance.now();

      if (mode === "ar") {
        playfieldRoot.visible = false;
        reticle.visible = false;
        onEnvironmentMode?.("ar");
        await prepareARHitTest(session);
        emitStatus("Find a surface");
      } else {
        reticle.visible = false;
        onEnvironmentMode?.("vr");
        placeVRTabletop();
        emitStatus("Tabletop VR");
      }

      session.addEventListener("end", handleSessionEnd, { once: true });
      await renderer.xr.setSession(session);
      return true;
    } catch (error) {
      cleanupHitTest();
      activeSession = null;
      activeMode = null;
      placementMode = false;
      tablePlaced = false;
      reticle.visible = false;
      onEnvironmentMode?.("desktop");
      resetDesktopPlacement();
      emitStatus("Blocked", { error });
      return false;
    }
  }

  async function end() {
    const current = renderer.xr.getSession();
    if (current) await current.end();
  }

  async function toggle(mode = "ar") {
    const current = renderer.xr.getSession();
    if (current) return end();
    return start(mode);
  }

  async function prepareARHitTest(session) {
    cleanupHitTest();
    viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  }

  function cleanupHitTest() {
    hitTestSource?.cancel?.();
    hitTestSource = null;
    viewerSpace = null;
  }

  function handleSessionEnd() {
    cleanupHitTest();
    reticle.visible = false;
    activeSession = null;
    activeMode = null;
    placementMode = false;
    tablePlaced = false;
    lastInputSource = null;
    onEnvironmentMode?.("desktop");
    resetDesktopPlacement();
    emitStatus(support.ar ? "AR Ready" : support.vr ? "VR Ready" : "No XR");
  }

  function update(frame) {
    if (!renderer.xr.isPresenting) return false;
    if (activeMode === "ar") {
      updateARReticle(frame);
      updateARRotation(frame);
    }
    return updateAim();
  }

  function updateARReticle(frame) {
    if (!placementMode || !hitTestSource || !frame) {
      reticle.visible = false;
      return;
    }
    const referenceSpace = renderer.xr.getReferenceSpace();
    if (!referenceSpace) return;

    const hits = frame.getHitTestResults(hitTestSource);
    if (!hits.length) {
      reticle.visible = false;
      return;
    }

    const pose = hits[0].getPose(referenceSpace);
    if (!pose) {
      reticle.visible = false;
      return;
    }

    hitMatrix.fromArray(pose.transform.matrix);
    hitMatrix.decompose(hitPosition, hitQuaternion, hitScale);
    // Keep v1 placement intentionally tabletop-like: reject steep/vertical
    // surfaces rather than letting the simulation appear to float from a wall.
    surfaceUp.set(0, 1, 0).applyQuaternion(hitQuaternion).normalize();
    if (surfaceUp.dot(new THREE.Vector3(0, 1, 0)) < 0.72) {
      reticle.visible = false;
      return;
    }

    reticle.position.copy(hitPosition);

    // Hit-test orientation can include arbitrary yaw. Align the reticle to the
    // detected surface normal while keeping its visual orientation stable.
    surfaceUp.set(0, 1, 0).applyQuaternion(hitQuaternion).normalize();
    reticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceUp);
    reticle.visible = true;
  }

  function placeAtReticle() {
    if (!reticle.visible || activeMode !== "ar") return false;
    playfieldRoot.position.copy(reticle.position);
    playfieldRoot.position.y += 0.018;

    // Keep gameplay level on horizontal surfaces. This prevents a noisy hit
    // pose from pitching the simulation while still using the real hit point.
    tempEuler.setFromQuaternion(reticle.quaternion, "YXZ");
    playfieldRoot.rotation.set(0, tempEuler.y, 0);
    playfieldRoot.scale.setScalar(AR_SCALE);
    playfieldRoot.visible = true;
    playfieldRoot.updateMatrixWorld(true);

    tablePlaced = true;
    placementMode = false;
    reticle.visible = false;
    emitStatus("AR Placed");
    pulse(0.28, 35);
    return true;
  }

  function togglePlacementMode(force) {
    if (activeMode !== "ar") return false;
    placementMode = typeof force === "boolean" ? force : !placementMode;
    if (placementMode) {
      emitStatus(tablePlaced ? "Move table" : "Find a surface");
    } else {
      reticle.visible = false;
      emitStatus(tablePlaced ? "AR Placed" : "Find a surface");
    }
    return placementMode;
  }

  function updateARRotation(frame) {
    if (!tablePlaced || placementMode || activeMode !== "ar") return;
    const now = frame?.predictedDisplayTime || performance.now();
    const dt = Math.min(0.05, Math.max(0, (now - lastRotateTime) / 1000));
    lastRotateTime = now;

    for (const source of activeSession?.inputSources || []) {
      const axes = source?.gamepad?.axes;
      if (!axes?.length) continue;
      const x = axes.length >= 4 ? axes[2] : axes[0];
      if (Math.abs(x) <= DEADZONE) continue;
      playfieldRoot.rotation.y -= x * ROTATE_SPEED * dt;
      playfieldRoot.updateMatrixWorld(true);
      break;
    }
  }

  function updateAim() {
    if (!renderer.xr.isPresenting) return false;
    if (activeMode === "ar" && (!tablePlaced || placementMode)) return false;
    const controller = controllers.find((item) => item.visible);
    if (!controller) return false;

    controllerOrigin.setFromMatrixPosition(controller.matrixWorld);
    controller.getWorldQuaternion(controllerQuaternion);
    controllerDirection.set(0, 0, -1).applyQuaternion(controllerQuaternion).normalize();

    inversePlayfield.copy(playfieldRoot.matrixWorld).invert();
    localOrigin.copy(controllerOrigin).applyMatrix4(inversePlayfield);
    localDirection.copy(controllerDirection).transformDirection(inversePlayfield).normalize();

    if (Math.abs(localDirection.y) < 0.001) return false;
    const distance = (0.065 - localOrigin.y) / localDirection.y;
    if (distance <= 0 || distance > 8) return false;

    localHit.copy(localOrigin).addScaledVector(localDirection, distance);
    const source = getSource();
    const yaw = (Math.atan2(localHit.z - source.y, localHit.x - source.x) * 180) / Math.PI;
    onAim(yaw);
    return true;
  }

  function pulse(intensity = 0.4, duration = 45) {
    if (!renderer.xr.isPresenting) return false;
    const sources = [];
    if (lastInputSource) sources.push(lastInputSource);
    for (const source of activeSession?.inputSources || []) {
      if (!sources.includes(source)) sources.push(source);
    }
    for (const source of sources) {
      const gamepad = source?.gamepad;
      const actuator = gamepad?.hapticActuators?.[0] || gamepad?.vibrationActuator;
      if (!actuator) continue;
      try {
        if (typeof actuator.pulse === "function") {
          actuator.pulse(THREE.MathUtils.clamp(intensity, 0, 1), Math.max(1, duration));
          return true;
        }
        if (typeof actuator.playEffect === "function") {
          actuator.playEffect("dual-rumble", {
            duration: Math.max(1, duration),
            strongMagnitude: THREE.MathUtils.clamp(intensity, 0, 1),
            weakMagnitude: THREE.MathUtils.clamp(intensity * 0.65, 0, 1),
          });
          return true;
        }
      } catch {
        // Haptics are optional and differ across WebXR runtimes.
      }
    }
    return false;
  }

  function dispose() {
    cleanupHitTest();
    reticle.removeFromParent();
    reticle.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose();
    });
    for (const controller of controllers) {
      if (controller.userData.qbSelectHandler) {
        controller.removeEventListener("selectstart", controller.userData.qbSelectHandler);
      }
      if (controller.userData.qbSqueezeHandler) {
        controller.removeEventListener("squeezestart", controller.userData.qbSqueezeHandler);
      }
      controller.removeFromParent();
      controller.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose();
      });
    }
    controllers.length = 0;
  }

  buildControllers();
  resetDesktopPlacement();

  return {
    detectSupport,
    start,
    end,
    toggle,
    update,
    updateAim,
    pulse,
    placeVRTabletop,
    resetDesktopPlacement,
    placeAtReticle,
    togglePlacementMode,
    dispose,
    get isActive() {
      return Boolean(activeSession);
    },
    get mode() {
      return activeMode;
    },
    get isARPlacementMode() {
      return activeMode === "ar" && placementMode;
    },
    get isTablePlaced() {
      return tablePlaced;
    },
    get support() {
      return { ...support };
    },
  };
}
