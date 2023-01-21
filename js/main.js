import {WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector3} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'

if (!['localhost', '127.0.0.1'].includes(location.hostname)) {
	navigator.serviceWorker?.register('service-worker.js').then(reg => {
		reg.addEventListener('updatefound', () => {
			let newWorker = reg.installing
			newWorker?.addEventListener('statechange', () => {
				console.log('Update Installed. Restarting...')
				if (newWorker.state == 'activated') location.reload(true)
			})
		})
	})
}

const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera(95, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 1000)
const loader = new GLTFLoader()
const vector = new Vector3()
const pointer = {x: 0, y: 0}
const objects = {}
var mouseDown = false
var pointerObject

camera.position.z = 7.5
scene.background = undefined
renderer. setClearColor(0xffffff, 0)
renderer.outputEncoding = sRGBEncoding
const ambientLight = new AmbientLight( 0xffffff, 0.1 )
const dirLight = new DirectionalLight( 0xefefff, 2.5 )
dirLight.position.set(10, 10, 10)

scene.add( ambientLight )
scene.add( dirLight )

loader.load(`./models/spaceship.glb`,
	gltf => {
		objects[0] = gltf.scene
		const box = new Box3()
		box.setFromObject(objects[0])
		const center = box.getCenter(vector)
		objects[0].position.x += (objects[0].position.x - center.x)
		objects[0].position.y += (objects[0].position.y - center.y)
		objects[0].position.z += (objects[0].position.y - center.z)
		scene.add(objects[0])
		resizeScene()
	}, undefined, error => {
		console.log(error)
	}
)

loader.load(`./models/planet.glb`,
	gltf => {
		objects[1] = gltf.scene
		const box = new Box3()
		box.setFromObject(objects[1])
		const center = box.getCenter(vector)
		objects[1].position.x += (0 - center.x)
		objects[1].position.y += (5 - center.y)
		objects[1].position.z += (0 - center.z)
		scene.add(objects[1])
		resizeScene()
	}, undefined, error => {
		console.log(error)
	}
)

function resizeScene() {
	camera.aspect = document.documentElement.clientWidth / document.documentElement.clientHeight
	camera.updateProjectionMatrix()
	renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight)
}

function animate() {
	requestAnimationFrame(animate)
	if (objects[1]) objects[1].rotation.y += 0.001
	renderer.render(scene, camera)
}

/* window.onkeydown = e => {
	if (!object) return
	keysPressed[e.keyCode] = true
	if (keysPressed[65]) object.rotation.y -= 0.1 // A
	if (keysPressed[68]) object.rotation.y += 0.1 // D
	if (keysPressed[87]) object.rotation.x -= 0.1 // W
	if (keysPressed[83]) object.rotation.x += 0.1 // S
}
window.onkeyup = e => {
	keysPressed[e.keyCode] = false
} */

renderer.domElement.onmousedown = () => { mouseDown = true }
renderer.domElement.onmouseup = () => { mouseDown = false }
renderer.domElement.onmousemove = e => onMove(e)

renderer.domElement.ontouchstart = () => { mouseDown = true }
renderer.domElement.ontouchend = () => { mouseDown = false }
renderer.domElement.ontouchmove = e => onMove(e)

function onMove(e) {
	if (!mouseDown) return
	let deltaX = (e.pageX ?? e.touches[0].pageX) - pointer.x
	let deltaY = (e.pageY ?? e.touches[0].pageY) - pointer.y
	pointer.x = (e.pageX ?? e.touches[0].pageX)
	pointer.y = (e.pageY ?? e.touches[0].pageY)
	objects[0].rotation.y += Math.sign(deltaX) * 0.025
	objects[0].rotation.x += Math.sign(deltaY) * 0.025
}

window.onresize = () => resizeScene()

document.body.appendChild(renderer.domElement)
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles-js', './js/particles.json')
}
document.onclick = () => {
	if (!pointerObject) return
	alert('Clicou na nave!')
}
animate()