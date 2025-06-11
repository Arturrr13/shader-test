<template>
  <div ref="container" class="image-container">
    <img
      ref="image"
      src="https://cdn.pixabay.com/photo/2015/04/23/22/00/new-year-background-736885_1280.jpg"
      alt="Image"
      class="hidden-image"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue"
import * as THREE from "three"

const container = ref(null)
const image = ref(null)

const variables = {
  animIntensity: 0.5,
  easeFactor: 0.05,
  animSize: 0.5,
  pixelSize: "25.0",
  chromaOffset: 0.001,
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform vec2 u_prevMouse;
  uniform float u_aberrationIntensity;
  uniform float u_aspect;
  varying vec2 vUv;

  void main() {
    vec2 correctedUv = vec2(vUv.x * u_aspect, vUv.y);

    vec2 mouseCorrected = vec2(u_mouse.x * u_aspect, u_mouse.y);
    vec2 prevMouseCorrected = vec2(u_prevMouse.x * u_aspect, u_prevMouse.y);

    vec2 gridUV = floor(correctedUv * vec2(${variables.pixelSize}, ${variables.pixelSize})) / vec2(${variables.pixelSize}, ${variables.pixelSize});
    vec2 centerOfPixel = gridUV + vec2(0.5 / ${variables.pixelSize}, 0.5 / ${variables.pixelSize});

    vec2 mouseDirection = mouseCorrected - prevMouseCorrected;
    float movementLength = length(mouseDirection);

    vec2 pixelToMouseDirection = centerOfPixel - mouseCorrected;
    float pixelDistanceToMouse = length(pixelToMouseDirection);
    float strength = smoothstep(${variables.animSize}, 0.0, pixelDistanceToMouse);

    vec2 uvOffset = strength * -mouseDirection * ${variables.animIntensity};
    vec2 uv = vUv - uvOffset;

    float chromaOffset = strength * u_aberrationIntensity * ${variables.chromaOffset};
    vec4 colorR = texture2D(u_texture, uv + vec2(chromaOffset, 0.0));
    vec4 colorG = texture2D(u_texture, uv);
    vec4 colorB = texture2D(u_texture, uv - vec2(chromaOffset, 0.0));

    gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
  }
`

let mousePosition = { x: 0.5, y: 0.5 }
let targetMousePosition = { x: 0.5, y: 0.5 }
let prevPosition = { x: 0.5, y: 0.5 }
let aberrationIntensity = 0.0
let uniforms
let width = 0,
  height = 0,
  camera,
  mesh,
  renderer
const scene = new THREE.Scene()

const initializeScene = (texture) => {
  camera = new THREE.PerspectiveCamera(80, width / height, 0.01, 10)
  camera.position.z = 1

  uniforms = {
    u_mouse: { type: "v2", value: new THREE.Vector2() },
    u_prevMouse: { type: "v2", value: new THREE.Vector2() },
    u_aberrationIntensity: { type: "f", value: 0.0 },
    u_aspect: { type: "f", value: width / height },
    u_texture: { type: "t", value: texture },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
  })

  mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
  scene.add(mesh)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(width, height)
  container.value.appendChild(renderer.domElement)

  animate()
  resizePlane()
}

const animate = () => {
  requestAnimationFrame(animate)

  mousePosition.x +=
    (targetMousePosition.x - mousePosition.x) * variables.easeFactor
  mousePosition.y +=
    (targetMousePosition.y - mousePosition.y) * variables.easeFactor

  uniforms.u_mouse.value.set(mousePosition.x, 1.0 - mousePosition.y)
  uniforms.u_prevMouse.value.set(prevPosition.x, 1.0 - prevPosition.y)

  aberrationIntensity = Math.max(0.0, aberrationIntensity - 0.05)
  uniforms.u_aberrationIntensity.value = aberrationIntensity

  renderer.render(scene, camera)
}

const resizePlane = () => {
  const aspect = width / height
  const distance = camera.position.z
  const fovRadians = (camera.fov * Math.PI) / 180
  const viewHeight = 2 * Math.tan(fovRadians / 2) * distance
  const viewWidth = viewHeight * aspect
  mesh.scale.set(viewWidth, viewHeight, 1)
  uniforms.u_aspect.value = camera.aspect
}

const handelMouseMove = (event) => {
  const rect = container.value.getBoundingClientRect()
  prevPosition = { ...targetMousePosition }

  targetMousePosition.x = (event.clientX - rect.left) / rect.width
  targetMousePosition.y = (event.clientY - rect.top) / rect.height
  aberrationIntensity = 1.0
}

const handelMouseEnter = (event) => {
  const rect = container.value.getBoundingClientRect()
  mousePosition.x = targetMousePosition.x =
    (event.clientX - rect.left) / rect.width
  mousePosition.y = targetMousePosition.y =
    (event.clientY - rect.top) / rect.height
}

const handelMouseLeave = () => {
  variables.easeFactor = 0.05
  targetMousePosition = { ...prevPosition }
}

const handelResize = () => {
  const w = container.value.clientWidth
  const h = container.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)

  resizePlane()
}

onBeforeUnmount(() => {
  container.value.removeEventListener("mousemove", handelMouseMove)
  container.value.removeEventListener("mouseenter", handelMouseEnter)
  container.value.removeEventListener("mouseleave", handelMouseLeave)
})

onMounted(async () => {
  width = container.value.clientWidth
  height = container.value.clientHeight
  camera = new THREE.PerspectiveCamera(80, width / height, 0.01, 10)
  camera.position.z = 1

  initializeScene(new THREE.TextureLoader().load(image.value.src))

  container.value.addEventListener("mousemove", handelMouseMove)
  container.value.addEventListener("mouseenter", handelMouseEnter)
  container.value.addEventListener("mouseleave", handelMouseLeave)
  window.addEventListener("resize", handelResize)
})
</script>

<style scoped lang="scss">
.image-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.hidden-image {
  display: none;
}
</style>
