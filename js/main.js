import {WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector3} from '/js/three.module.js'
import { GLTFLoader } from '/js/GLTFLoader.js'

navigator.serviceWorker?.register('service-worker.js').then(reg => {
	reg.addEventListener('updatefound', () => {
		let newWorker = reg.installing
		newWorker?.addEventListener('statechange', () => {
			console.log('Update Installed. Restarting...')
			if (newWorker.state == 'activated') location.reload(true)
		})
	})
})

var audioAuthorized = false
var SEPlayeed = false

const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera(95, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 1000)
const loader = new GLTFLoader()
const vector = new Vector3()
const pointer = {x: 0, y: 0}
const objects = {}
const keysPressed = {}
var mouseDown = null

camera.position.z = 7.5
scene.background = undefined
renderer. setClearColor(0xffffff, 0)
renderer.outputEncoding = sRGBEncoding
const ambientLight = new AmbientLight( 0xffffff, 0.015 )
const dirLight = new DirectionalLight( 0xefefff, 1.5 )
dirLight.position.set(10, 10, 10)

scene.add( ambientLight )
scene.add( dirLight )

loader.load(`/models/spaceship.glb`,
	gltf => {
		objects[0] = gltf.scene
		const box = new Box3()
		box.setFromObject(objects[0])
		const center = box.getCenter(vector)
		objects[0].position.x += (objects[0].position.x - center.x)
		objects[0].position.y += (objects[0].position.y - center.y)
		objects[0].position.z += (objects[0].position.y - center.z)
		objects[0].rotation.y = Math.PI
		objects[0].rotation.x = Math.PI / 6
		scene.add(objects[0])
		resizeScene()
	}, undefined, error => {
		console.log(error)
	}
)

loader.load(`/models/planet.glb`,
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
	if (mouseDown == 'left') objects[0].rotation.y -= 0.01
	if (mouseDown == 'right') objects[0].rotation.y += 0.01
	if (mouseDown == 'up') objects[0].rotation.x -= 0.01
	if (mouseDown == 'down') objects[0].rotation.x += 0.01
	if (audioAuthorized && mouseDown && !SEPlayeed) {
		document.querySelector('#se').play()
		SEPlayeed = true
	} else if (document.querySelector('#se').currentTime >= 0.1) {
		SEPlayeed = false
	}
}

window.onkeydown = e => {
	if (!objects[0]) return
	keysPressed[e.keyCode] = true
	if (keysPressed[65]) {
		document.querySelector('#button-left').classList.add('active')
		objects[0].rotation.y -= 0.1
	}
	if (keysPressed[68]) {
		document.querySelector('#button-right').classList.add('active')
		objects[0].rotation.y += 0.1
	}
	if (keysPressed[87]) {
		document.querySelector('#button-up').classList.add('active')
		objects[0].rotation.x -= 0.1
	}
	if (keysPressed[83]) {
		document.querySelector('#button-down').classList.add('active')
		objects[0].rotation.x += 0.1
	}
	if (audioAuthorized && !SEPlayeed && [65, 68, 87, 83].includes(e.keyCode)) {
		document.querySelector('#se').play()
		SEPlayeed = true
	}
}
window.onkeyup = e => {
	keysPressed[e.keyCode] = false
	if (e.keyCode == 65) document.querySelector('#button-left').classList.remove('active')
	if (e.keyCode == 68) document.querySelector('#button-right').classList.remove('active')
	if (e.keyCode == 87) document.querySelector('#button-up').classList.remove('active')
	if (e.keyCode == 83) document.querySelector('#button-down').classList.remove('active')
	if (document.querySelector('#se').currentTime >= 0.1) SEPlayeed = false
}

/* renderer.domElement.onmousedown = () => { mouseDown = true }
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
} */

function initControls() {
	document.querySelector('#button-left').onmousedown = () => mouseDown = 'left'
	document.querySelector('#button-left').onmouseup = () => mouseDown = null
	document.querySelector('#button-right').onmousedown = () => mouseDown = 'right'
	document.querySelector('#button-right').onmouseup = () => mouseDown = null
	document.querySelector('#button-up').onmousedown = () => mouseDown = 'up'
	document.querySelector('#button-up').onmouseup = () => mouseDown = null
	document.querySelector('#button-down').onmousedown = () => mouseDown = 'down'
	document.querySelector('#button-down').onmouseup = () => mouseDown = null

	document.querySelector('#button-fly').onmousedown = () => alert('Em breve!')

	document.querySelector('#button-left').ontouchstart = () => mouseDown = 'left'
	document.querySelector('#button-left').outouchend = () => mouseDown = null
	document.querySelector('#button-left').ontouchleave = () => mouseDown = null
	document.querySelector('#button-left').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-right').ontouchstart = () => mouseDown = 'right'
	document.querySelector('#button-right').outouchend = () => mouseDown = null
	document.querySelector('#button-right').ontouchleave = () => mouseDown = null
	document.querySelector('#button-right').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-up').ontouchstart = () => mouseDown = 'up'
	document.querySelector('#button-up').outouchend = () => mouseDown = null
	document.querySelector('#button-up').ontouchleave = () => mouseDown = null
	document.querySelector('#button-up').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-down').ontouchstart = () => mouseDown = 'down'
	document.querySelector('#button-down').outouchend = () => mouseDown = null
	document.querySelector('#button-down').ontouchleave = () => mouseDown = null
	document.querySelector('#button-down').ontouchcancel = () => mouseDown = null

	document.querySelector('#button-fly').ontouchstart = () => alert('Em breve!')
}

window.onresize = () => resizeScene()

document.body.appendChild(renderer.domElement)
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles-js', '/js/particles.json')
	initControls()
}
document.onclick = () => {
	audioAuthorized = true
	const bgm = document.querySelector('#bgm')
	bgm.volume = 0.25
	if (!isLocalhost()) bgm.play()
}

function isLocalhost() {
	return ['localhost', '127.0.0.1', '192.168.0.110'].includes(location.hostname)
}

animate()