<template>
  <div ref="containerRef" class="anim-container"></div>
</template>

<script setup lang="ts">
import * as THREE from "three"

const containerRef = ref<HTMLElement | null>(null)

const variables = {
  animIntensity: 0.9,
  easeFactor: 0.1,
  animSize: 0.6,
  pixelSize: "40.0",
}
let mousePosition = { x: 0.5, y: 0.5 }
let targetMousePosition = { x: 0.5, y: 0.5 }
let prevPosition = { x: 0.5, y: 0.5 }
let width = 0,
  height = 0,
  camera: THREE.OrthographicCamera,
  uniforms: THREE.ShaderMaterial["uniforms"],
  mesh: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.ShaderMaterial,
    THREE.Object3DEventMap
  >,
  renderer: THREE.WebGLRenderer
const scene = new THREE.Scene()

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D u_texture;    
  uniform vec2 u_mouse;
  uniform vec2 u_prevMouse;
  
  void main() {
    vec2 gridUV = floor(vUv * vec2(${variables.pixelSize}, ${variables.pixelSize})) / vec2(${variables.pixelSize}, ${variables.pixelSize});
    vec2 centerOfPixel = gridUV + vec2(1.0 / ${variables.pixelSize}, 1.0 / ${variables.pixelSize});

    vec2 mouseDirection = u_mouse - u_prevMouse;

    float movementLength = length(mouseDirection);

    vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
    float pixelDistanceToMouse = length(pixelToMouseDirection);
    float strength = smoothstep(${variables.animSize}, 0.0, pixelDistanceToMouse);

    vec2 uvOffset = strength * -mouseDirection * ${variables.animIntensity};
    vec2 uv = vUv - uvOffset;

    vec4 color = texture2D(u_texture, uv);
    vec3 debugColor = vec3(uvOffset.x * 10.0, uvOffset.y * 10.0, 0.0);
    gl_FragColor = vec4(mix(color.rgb, debugColor, 0.5), 1.0);
  }
`

const createTextTexture = (
  text: string,
  font: string,
  size: number | null,
  color: string,
  fontWeight: string
) => {
  if (!containerRef.value) return

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")

  if (!ctx) return

  canvas.width = containerRef.value.offsetWidth
  canvas.height = containerRef.value.offsetHeight

  const fontSize = size || Math.floor(canvas.width * 2)

  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = color || "#ffffff"
  ctx.font = `${fontWeight} ${fontSize}px ${font || "Arial"}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const scaleFactor = Math.min(1, (canvas.width * 1) / textWidth)
  const aspectCorrection = canvas.width / canvas.height

  ctx.setTransform(
    scaleFactor,
    0,
    0,
    scaleFactor / aspectCorrection,
    canvas.width / 2,
    canvas.height / 2
  )
  ctx.strokeStyle = "#1a1a1a"
  ctx.lineWidth = fontSize * 0.005
  for (let i = 0; i < 3; i++) {
    ctx.strokeText(text, 0, 0)
  }
  ctx.fillText(text, 0, 0)

  return new THREE.CanvasTexture(canvas)
}

const initializeScene = (texture: THREE.Texture | undefined) => {
  if (!containerRef.value || !texture) return

  width = containerRef.value.offsetWidth
  height = containerRef.value.offsetHeight
  const aspectRatio = width / height

  camera = new THREE.OrthographicCamera(
    -1,
    1,
    1 / aspectRatio,
    -1 / aspectRatio,
    0.1,
    1000
  )
  camera.position.z = 1

  uniforms = {
    u_mouse: { type: "v2", value: new THREE.Vector2() },
    u_prevMouse: { type: "v2", value: new THREE.Vector2() },
    u_mouseDirection: { type: "v2", value: new THREE.Vector2() },
    u_texture: { type: "t", value: texture },
  } as THREE.ShaderMaterial["uniforms"]

  mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
    })
  )

  scene.add(mesh)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setClearColor(0xffffff, 1) // Перевірь потім зміну кольору
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)
}

const reloadTexture = () => {
  const newTexture = createTextTexture(
    "Some Text",
    "OffBit Trial",
    null,
    "#ffffff",
    "700"
  )

  if (mesh) {
    mesh.material.uniforms.u_texture.value = newTexture
  }
}

const animateScene = () => {
  requestAnimationFrame(animateScene)

  mousePosition.x +=
    (targetMousePosition.x - mousePosition.x) * variables.easeFactor
  mousePosition.y +=
    (targetMousePosition.y - mousePosition.y) * variables.easeFactor

  uniforms.u_mouse.value.set(mousePosition.x, 1.0 - mousePosition.y)
  uniforms.u_prevMouse.value.set(prevPosition.x, 1.0 - prevPosition.y)

  renderer.render(scene, camera)
}

const handelMouseMove = (event: MouseEvent) => {
  variables.easeFactor = 0.1
  let rect = containerRef.value!.getBoundingClientRect()
  prevPosition = { ...targetMousePosition }

  targetMousePosition.x = (event.clientX - rect.left) / rect.width
  targetMousePosition.y = (event.clientY - rect.top) / rect.height
}

const handelMouseEnter = (event: MouseEvent) => {
  variables.easeFactor = 0.1
  let rect = containerRef.value!.getBoundingClientRect()

  mousePosition.x = targetMousePosition.x =
    (event.clientX - rect.left) / rect.width
  mousePosition.y = targetMousePosition.y =
    (event.clientY - rect.top) / rect.height
}

const handelMouseLeave = () => {
  variables.easeFactor = 0.1
  targetMousePosition = { ...prevPosition }
}

const onResize = () => {
  if (!containerRef.value) return

  const aspectRatio =
    containerRef.value.offsetWidth / containerRef.value.offsetHeight
  camera.left = -1
  camera.right = 1
  camera.top = 1 / aspectRatio
  camera.bottom = -1 / aspectRatio
  camera.updateProjectionMatrix()

  renderer.setSize(
    containerRef.value.offsetWidth,
    containerRef.value.offsetHeight
  )

  reloadTexture()
}

onMounted(async () => {
  initializeScene(
    createTextTexture("zajno", "OffBit Trial", null, "#ffffff", "700")
  )
  animateScene()

  if (!containerRef.value) return

  containerRef.value.addEventListener("mousemove", handelMouseMove)
  containerRef.value.addEventListener("mouseenter", handelMouseEnter)
  containerRef.value.addEventListener("mouseleave", handelMouseLeave)

  window.addEventListener("resize", onResize)
})
</script>

<style scoped lang="scss">
.anim-container {
  width: 100%;
  height: 100%;
}
</style>
