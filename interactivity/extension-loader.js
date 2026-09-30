import { GLTFLoader } from "../vendor/loaders/GLTFLoader.js";
import { KHR_INTERACTIVITY } from "./constants.js";

const loader = new GLTFLoader();

export async function loadInteractiveGltf(url, diagnostics) {
  const documentUrl = new URL(url, window.location.href);
  const response = await fetch(documentUrl);
  if (!response.ok) throw new Error(`Failed to load ${documentUrl}: ${response.status}`);
  const document = await response.json();
  const hasExtension = Boolean(document.extensions?.[KHR_INTERACTIVITY]);
  diagnostics?.info(hasExtension ? `Loaded ${KHR_INTERACTIVITY} asset` : "Loaded glTF asset without interactivity");

  const gltf = await new Promise((resolve, reject) => {
    loader.parse(JSON.stringify(document), new URL(".", documentUrl).href, resolve, reject);
  });

  return { document, gltf };
}

export function cloneSceneWithUniqueMaterials(scene) {
  const clone = scene.clone(true);
  clone.traverse((object) => {
    if (!object.material) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
  return clone;
}
