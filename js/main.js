import {WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector3} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'

navigator.serviceWorker?.register('service-worker.js').then(reg => {
	reg.addEventListener('updatefound', () => {
		let newWorker = reg.installing
		newWorker?.addEventListener('statechange', () => {
			console.log('Update Installed. Restarting...')
			if (newWorker.state == 'activated') location.reload(true)
		})
	})
})

const UP = 12
const LEFT = 14
const RIGHT = 15
const DOWN = 13
const X = 2
const Y = 3
const A = 0
const B = 1
const RB = 5
const RT = 7
const LB = 4
const LT = 6
const MENU = 9
const WIND = 8

var audioAuthorized = false
var SEPlayeed = false
var musicOff = false
var touchControl = true

const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera(75, document.documentElement.clientWidth / document.documentElement.clientHeight, 1, 1000)
const loader = new GLTFLoader()
const vector = new Vector3()
const pointer = {x: 0, y: 0}
const objects = {}
const keysPressed = {}
var mouseDown
var gamepad
var bgm

camera.position.z = 10
scene.background = undefined
renderer. setClearColor(0xffffff, 0)
renderer.outputEncoding = sRGBEncoding
const ambientLight = new AmbientLight( 0xFFFFFF, 0.005 )
const dirLight = new DirectionalLight( 0xFFFFC8, 1.5 )
dirLight.position.set(10, 10, 0)

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
		objects[0].rotation.y = Math.PI
		objects[0].rotation.x = Math.PI / 6
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
		objects[1].position.y = 50
		objects[1].position.z = -75
		objects[1].scale.set(10, 10, 10)
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
	updateTouchButtons()
	updateGamepad()
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

function updateTouchButtons() {
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

function updateGamepad() {
	gamepad = navigator.getGamepads().find(el => el?.connected)
	if (gamepad) {
		document.querySelectorAll('footer')?.forEach(el => el.classList.add('hide'))
		document.querySelector('#menu-button-gamepad').classList.remove('off')
		document.querySelector('#menu-button-touch-on').classList.add('off')
		document.querySelector('#menu-button-touch-off').classList.add('off')
	} else if (!gamepad && touchControl) {
		document.querySelectorAll('footer')?.forEach(el => el.classList.remove('hide'))
	}
	if (!gamepad) {
		document.querySelector('#menu-button-gamepad').classList.add('off')
		document.querySelector('#menu-button-touch-off').classList.remove('off')
		return
	}
	if (gamepad.axes[0] <= -0.5 || gamepad.buttons[LEFT].pressed) mouseDown = 'left'
	else if (gamepad.axes[0] >= 0.5 || gamepad.buttons[RIGHT].pressed) mouseDown = 'right'
	else if (gamepad.axes[1] <= -0.5 || gamepad.buttons[UP].pressed) mouseDown = 'up'
	else if (gamepad.axes[1] >= 0.5 || gamepad.buttons[DOWN].pressed) mouseDown = 'down'
	else mouseDown = null
}

function initControls() {
	document.querySelector('#button-config').onclick = () => {
		document.querySelector('#menu-config').classList.toggle('opened')
	}

	document.querySelector('#menu-button-music-off').onclick = e => {
		e.preventDefault()
		musicOff = true
		bgm.pause()
		document.querySelector('#menu-button-music-off').classList.add('off')
		document.querySelector('#menu-button-music-on').classList.remove('off')
	}
	document.querySelector('#menu-button-music-on').onclick = e => {
		e.preventDefault()
		musicOff = false
		bgm.play()
		document.querySelector('#menu-button-music-on').classList.add('off')
		document.querySelector('#menu-button-music-off').classList.remove('off')
	}

	document.querySelector('#menu-button-touch-on').onclick = e => {
		e.preventDefault()
		touchControl = true
		document.querySelector('#menu-button-touch-on').classList.add('off')
		document.querySelector('#menu-button-touch-off').classList.remove('off')
		document.querySelectorAll('footer')?.forEach(el => el.classList.remove('hide'))
	}
	document.querySelector('#menu-button-touch-off').onclick = e => {
		e.preventDefault()
		touchControl = false
		document.querySelector('#menu-button-touch-off').classList.add('off')
		document.querySelector('#menu-button-touch-on').classList.remove('off')
		document.querySelectorAll('footer')?.forEach(el => el.classList.add('hide'))
	}

	document.querySelector('#button-left').onmousedown = () => mouseDown = 'left'
	document.querySelector('#button-left').onmouseup = () => mouseDown = null
	document.querySelector('#button-right').onmousedown = () => mouseDown = 'right'
	document.querySelector('#button-right').onmouseup = () => mouseDown = null
	document.querySelector('#button-up').onmousedown = () => mouseDown = 'up'
	document.querySelector('#button-up').onmouseup = () => mouseDown = null
	document.querySelector('#button-down').onmousedown = () => mouseDown = 'down'
	document.querySelector('#button-down').onmouseup = () => mouseDown = null

	document.querySelector('#button-fly').onmousedown = () => updateGamepad()

	document.querySelector('#button-left').ontouchstart = () => mouseDown = 'left'
	document.querySelector('#button-left').outouchend = () => mouseDown = null
	document.querySelector('#button-left').ontouchleave = () => mouseDown = null
	document.querySelector('#button-left').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-left').ontouchmove = () => mouseDown = null
	document.querySelector('#button-right').ontouchstart = () => mouseDown = 'right'
	document.querySelector('#button-right').outouchend = () => mouseDown = null
	document.querySelector('#button-right').ontouchleave = () => mouseDown = null
	document.querySelector('#button-right').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-right').ontouchmove = () => mouseDown = null
	document.querySelector('#button-up').ontouchstart = () => mouseDown = 'up'
	document.querySelector('#button-up').outouchend = () => mouseDown = null
	document.querySelector('#button-up').ontouchleave = () => mouseDown = null
	document.querySelector('#button-up').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-up').ontouchmove = () => mouseDown = null
	document.querySelector('#button-down').ontouchstart = () => mouseDown = 'down'
	document.querySelector('#button-down').outouchend = () => mouseDown = null
	document.querySelector('#button-down').ontouchleave = () => mouseDown = null
	document.querySelector('#button-down').ontouchcancel = () => mouseDown = null
	document.querySelector('#button-down').ontouchmove = () => mouseDown = null

	document.querySelector('#button-fly').onclick = () => updateGamepad()
}

window.addEventListener('deviceorientation', e => {
	console.log(e)
})

window.onresize = () => resizeScene()

document.body.appendChild(renderer.domElement)
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles', './js/particles.json')
	bgm = document.querySelector('#bgm')
	bgm.volume = 0.25
	initControls()
}
document.onclick = () => {
	audioAuthorized = true
	if (!isLocalhost()) bgm.play()
}

function isLocalhost() {
	return ['localhost', '127.0.0.1', '192.168.0.110'].includes(location.hostname)
}

animate()