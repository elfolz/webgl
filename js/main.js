import {Clock, WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector3} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'
import Stats from './stats.module.js'

if (!isLocalhost()) {
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
var touchControl = true

const clock = new Clock()
const stats = new Stats()
const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera(75, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 100000)
const loader = new GLTFLoader()
const vector = new Vector3()
const objects = {}
const keysPressed = {}
var rotate
var lastDirection
var gamepad
var floatY = 0
var revertFloat = false
var flying = false
var clockDelta = 0
var fpsLimit = 1 / 60

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
		objects[0].position.y = -3
		objects[0].position.z = -10
		objects[0].rotation.y = Math.PI
		scene.add(objects[0])
		resizeScene()
	}, undefined, error => {
		console.log(error)
	}
)

loader.load(`./models/planet.glb`,
	gltf => {
		objects[1] = gltf.scene
		objects[1].position.y = 100
		objects[1].position.z = -250
		objects[1].scale.set(50, 50, 50)
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
	clockDelta += clock.getDelta()
	if (document.hidden) return
	if (clockDelta < fpsLimit) return
	renderer.render(scene, camera)
	updateObjectsAnimations()
	updateRotation()
	updateGamepad()
	updateFly()
	stats.update()
	clockDelta = clockDelta % fpsLimit
}

function updateObjectsAnimations() {
	if (objects[0]) {
		if (revertFloat) {
			if (floatY <= -0.0025) revertFloat = false
			else floatY -= 0.00001
		} else {
			if (floatY >= 0.0025) revertFloat = true
			else floatY += 0.00001
		}
		floatY = Math.min(floatY, 0.0025)
		objects[0].translateY(floatY)
	}
	if (objects[1]) objects[1].rotation.y += 0.001
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
	if (gamepad.axes[0] <= -0.5 || gamepad.buttons[LEFT].pressed) rotate = 'left'
	else if (gamepad.axes[0] >= 0.5 || gamepad.buttons[RIGHT].pressed) rotate = 'right'
	else if (gamepad.axes[1] <= -0.5 || gamepad.buttons[UP].pressed) rotate = 'up'
	else if (gamepad.axes[1] >= 0.5 || gamepad.buttons[DOWN].pressed) rotate = 'down'
	else rotate = null
	flying = gamepad.buttons[A].pressed
}

function updateRotation() {
	if (rotate == 'left') objects[0].rotation.y -= 0.01
	if (rotate == 'right') objects[0].rotation.y += 0.01
	if (rotate == 'up') objects[0].rotation.x -= 0.01
	if (rotate == 'down') objects[0].rotation.x += 0.01
	if (audioAuthorized && rotate && lastDirection != rotate) {
		document.querySelector('#se').play()
	}
	lastDirection = rotate
}

function updateFly() {

	let music = document.querySelector('#fly')

	if (flying) {
		document.querySelector('#rays').classList.add('show')
		if (music.currentTime <= 0) music.play()
	} else {
		document.querySelector('#rays').classList.remove('show')
		music.pause()
		music.currentTime = 0
		return
	}

	let wDir = camera.getWorldDirection(vector)

	let xMov = (objects[0].rotation.y % Math.PI) * 0.1 / (Math.PI/4)
	let yMov = (objects[0].rotation.x % Math.PI) * 0.1 / (Math.PI/4)

	/* objects[0].position.x += xMov
	camera.position.x += xMov */

	objects[0].position.y += yMov
	camera.position.y += yMov

	objects[0].position.z += 0.1 * wDir.z
	camera.position.z += 0.1 * wDir.z

}

window.onkeydown = e => {
	if (!objects[0]) return
	keysPressed[e.keyCode] = true
	if (keysPressed[32]) {
		document.querySelector('#button-fly').classList.add('active')
		flying = true
	}
	if (keysPressed[65]) {
		document.querySelector('#button-left').classList.add('active')
		rotate = 'left'
	}
	if (keysPressed[68]) {
		document.querySelector('#button-right').classList.add('active')
		rotate = 'right'
	}
	if (keysPressed[87]) {
		document.querySelector('#button-up').classList.add('active')
		rotate = 'up'
	}
	if (keysPressed[83]) {
		document.querySelector('#button-down').classList.add('active')
		rotate = 'down'
	}
}
window.onkeyup = e => {
	keysPressed[e.keyCode] = false
	if (e.keyCode == 32) {
		document.querySelector('#button-fly').classList.remove('active')
		flying = false
	}
	if (e.keyCode == 65) {
		document.querySelector('#button-left').classList.remove('active')
		rotate = null
	}
	if (e.keyCode == 68) {
		document.querySelector('#button-right').classList.remove('active')
		rotate = null
	}
	if (e.keyCode == 87) {
		document.querySelector('#button-up').classList.remove('active')
		rotate = null
	}
	if (e.keyCode == 83) {
		document.querySelector('#button-down').classList.remove('active')
		rotate = null
	}
}

function initControls() {
	document.querySelector('#button-config').onclick = () => {
		document.querySelector('#menu-config').classList.toggle('opened')
	}
	document.querySelector('#menu-button-music-off').onclick = e => {
		e.preventDefault()
		document.querySelector('#bgm').pause()
		document.querySelector('#menu-button-music-off').classList.add('off')
		document.querySelector('#menu-button-music-on').classList.remove('off')
	}
	document.querySelector('#menu-button-music-on').onclick = e => {
		e.preventDefault()
		document.querySelector('#bgm').play()
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
	document.querySelector('#button-left').onmousedown = () => rotate = 'left'
	document.querySelector('#button-left').onmouseup = () => rotate = null
	document.querySelector('#button-right').onmousedown = () => rotate = 'right'
	document.querySelector('#button-right').onmouseup = () => rotate = null
	document.querySelector('#button-up').onmousedown = () => rotate = 'up'
	document.querySelector('#button-up').onmouseup = () => rotate = null
	document.querySelector('#button-down').onmousedown = () => rotate = 'down'
	document.querySelector('#button-down').onmouseup = () => rotate = null

	document.querySelector('#button-fly').onmousedown = () => flying = true
	document.querySelector('#button-fly').onmouseup = () => flying = false

	document.querySelector('#button-left').ontouchstart = () => rotate = 'left'
	document.querySelector('#button-left').ontouchend = () => rotate = null
	document.querySelector('#button-left').ontouchleave = () => rotate = null
	document.querySelector('#button-left').ontouchcancel = () => rotate = null
	document.querySelector('#button-left').ontouchmove = () => rotate = null
	document.querySelector('#button-right').ontouchstart = () => rotate = 'right'
	document.querySelector('#button-right').ontouchend = () => rotate = null
	document.querySelector('#button-right').ontouchleave = () => rotate = null
	document.querySelector('#button-right').ontouchcancel = () => rotate = null
	document.querySelector('#button-right').ontouchmove = () => rotate = null
	document.querySelector('#button-up').ontouchstart = () => rotate = 'up'
	document.querySelector('#button-up').ontouchend = () => rotate = null
	document.querySelector('#button-up').ontouchleave = () => rotate = null
	document.querySelector('#button-up').ontouchcancel = () => rotate = null
	document.querySelector('#button-up').ontouchmove = () => rotate = null
	document.querySelector('#button-down').ontouchstart = () => rotate = 'down'
	document.querySelector('#button-down').ontouchend = () => rotate = null
	document.querySelector('#button-down').ontouchleave = () => rotate = null
	document.querySelector('#button-down').ontouchcancel = () => rotate = null
	document.querySelector('#button-down').ontouchmove = () => rotate = null

	document.querySelector('#button-fly').ontouchstart = () => flying = true
	document.querySelector('#button-fly').ontouchend = () => flying = false
	document.querySelector('#button-fly').ontouchleave = () => flying = false
	document.querySelector('#button-fly').ontouchcancel = () => flying = false
	document.querySelector('#button-fly').ontouchmove = () => flying = false
}

/* window.addEventListener('deviceorientation', e => {
	console.log(e)
}) */

window.onresize = () => resizeScene()
window.oncontextmenu = () => {return isLocalhost()}

document.body.appendChild(renderer.domElement)
document.body.appendChild(stats.dom)
stats.begin()

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles', './js/particles.json')
	document.querySelector('#bgm').volume = 0.25
	initControls()
}
document.onclick = () => {
	if (!audioAuthorized) {
		if (!isLocalhost()) document.querySelector('#bgm').play()
		audioAuthorized = true
	}
}

function isLocalhost() {
	return ['localhost', '127.0.0.1', '192.168.0.110'].includes(location.hostname)
}

animate()