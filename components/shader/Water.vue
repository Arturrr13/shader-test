<template>
  <div ref="containerRef" class="anim-container"></div>
</template>

<script setup lang="ts">
import * as THREE from "three"

const containerRef = ref<HTMLElement | null>(null)

const simulationVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const simulationFragmentShader = `
	uniform sampler2D u_textureA;
uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_time;
uniform int u_frame;

varying vec2 vUv;

const float delta = 1.4;

void main() {
	vec2 uv = vUv;
	if (u_frame == 0) {
		gl_FragColor = vec4(0.0);
		return;
	}

	vec4 data = texture2D(u_textureA, uv);
	float pressure = data.x;
	float pVel = data.y;

	vec2 texelSize = 1.0 / u_resolution;
	float p_right = texture2D(u_textureA, uv + vec2(texelSize.x, 0.0)).x;
	float p_left = texture2D(u_textureA, uv + vec2(-texelSize.x, 0.0)).x;
	float p_up = texture2D(u_textureA, uv + vec2(0.0, texelSize.y)).x;
	float p_down = texture2D(u_textureA, uv + vec2(0.0, -texelSize.y)).x;

	if (uv.x <= texelSize.x) p_left = p_right;
	if (uv.x >= 1.0 - texelSize.x) p_right = p_left;
	if (uv.y <= texelSize.y) p_down = p_up;
	if (uv.y >= 1.0 - texelSize.y) p_up = p_down;
	
	pVel += delta * (-2.0 * pressure + p_right + p_left) / 4.0;
	pVel += delta * (-2.0 * pressure + p_up + p_down) / 4.0;
	pressure += delta * pVel;
	pVel -= 0.005 * delta * pressure;
	pVel *= 1.0 - 0.002 * delta;
	pressure *= 0.999;

	vec2 mouseUV = u_mouse / u_resolution;

	if (u_mouse.x > 0.0) {
		float dist = distance(uv, mouseUV);
		if (dist <= 0.02) {
			pressure += 2.0 * (1.0 - dist / 0.02);
		}
	}

	gl_FragColor = vec4(pressure, pVel, (p_right - p_left) / 2.0, (p_up - p_down) / 2.0);
}
`

const rendererVertexShader = `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`

const rendererFragmentShader = `
	uniform sampler2D u_textureA;
	uniform sampler2D u_textureB;

	varying vec2 vUv;

	void main() {
		vec4 data = texture2D(u_textureA, vUv);
		vec2 distortion = 0.3 * data.zw;

		vec4 color = texture2D(u_textureB, vUv + distortion);
		vec3 normal = normalize(vec3(-data.z * 2.0, 0.5, -data.w * 2.0));
		vec3 lightDir = normalize(vec3(-3.0, 10.0, 3.0));
		float specular = pow(max(0.0, dot(normal, lightDir)), 60.0) * 1.5;

		gl_FragColor = color + vec4(specular);
	}
`

let width = 0,
  height = 0,
  renderer: THREE.WebGLRenderer
const scene = new THREE.Scene()
const simulationScene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

const initializeScene = () => {
  if (!containerRef.value) return

  width = containerRef.value.offsetWidth
  height = containerRef.value.offsetHeight
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(width, height)
  containerRef.value.appendChild(renderer.domElement)

  const mouse = new THREE.Vector2()
  let frame = 0
  const options = {
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    stencilBuffer: false,
    depthBuffer: false,
  }
  let rtA = new THREE.WebGLRenderTarget(width, height, options)
  let rtB = new THREE.WebGLRenderTarget(width, height, options)

  const simulationMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_mouse: { value: mouse },
      u_resolution: { value: new THREE.Vector2(width, height) },
      u_textureA: { value: null },
      u_time: { value: 0 },
      u_frame: { value: 0 },
    },
    vertexShader: simulationVertexShader,
    fragmentShader: simulationFragmentShader,
  })

  const rendererMaterial = new THREE.ShaderMaterial({
    uniforms: {
      u_textureA: { value: null },
      u_textureB: { value: null },
    },
    vertexShader: rendererVertexShader,
    fragmentShader: rendererFragmentShader,
  })

  const planeGeometry = new THREE.PlaneGeometry(2, 2)
  const simulationSceneQuad = new THREE.Mesh(planeGeometry, simulationMaterial)
  const rendererQuad = new THREE.Mesh(planeGeometry, rendererMaterial)
  simulationScene.add(simulationSceneQuad)
  scene.add(rendererQuad)

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { alpha: true })

  if (!context) return

  context.fillStyle = "#fb7427"
  context.fillRect(0, 0, width, height)

  const texture = new THREE.Texture(canvas)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.format = THREE.RGBAFormat

  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX
    mouse.y = height - e.clientY
  })

  renderer.domElement.addEventListener("mouseleave", () => {
    mouse.x = 0
    mouse.y = 0
  })

  const animate = () => {
    requestAnimationFrame(animate)

    simulationMaterial.uniforms.u_frame.value = frame++
    simulationMaterial.uniforms.u_time.value = performance.now() / 1000
    simulationMaterial.uniforms.u_textureA.value = rtA.texture
    renderer.setRenderTarget(rtB)
    renderer.render(simulationScene, camera)

    rendererMaterial.uniforms.u_textureA.value = rtB.texture
    // rendererMaterial.uniforms.u_textureB.value = rtA.texture
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)

    const temp = rtA
    rtA = rtB
    rtB = temp
  }

  animate()
}

onMounted(() => {
  initializeScene()
})
</script>

<style scoped lang="scss">
.anim-container {
  width: 100%;
  height: 100%;
  background: url(/1.png) center center / cover no-repeat;
}
</style>
