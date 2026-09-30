import * as THREE from 'three'
import { createPlayfield } from './render/create-playfield.js'

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.01,
  100
)

camera.position.set(0, 2.2, 2.8)
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({
  antialias: true,
})

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const ambient = new THREE.HemisphereLight(0xffffff, 0x303040, 2)
scene.add(ambient)

const directional = new THREE.DirectionalLight(0xffffff, 3)
directional.position.set(2, 4, 3)
scene.add(directional)

const playfieldRoot = createPlayfield()
scene.add(playfieldRoot)

function resize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('resize', resize)

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}

animate()
