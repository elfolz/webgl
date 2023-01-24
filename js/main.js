import {Clock, WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Vector3} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'
/* import Stats from './stats.module.js' */

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

const clock = new Clock()
/* const stats = new Stats() */
const renderer = new WebGLRenderer({antialias: true, alpha: true})
const camera = new PerspectiveCamera(75, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 100000)
const ambientLight = new AmbientLight( 0xFFFFFF, 0.005 )
const dirLight = new DirectionalLight( 0xFFFFC8, 1.5 )
const loader = new GLTFLoader()
const vector = new Vector3()
const scene = new Scene()
const audio = new Audio()
const audioContext = new AudioContext()
const audioGain = audioContext.createGain()
const destination = audioContext.createMediaStreamDestination()
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
var flyingAudio
var audioAuthorized = false
var touchControl = true
var bgmSource

audioGain.connect(audioContext.destination)
audioGain.gain.value = 0.25
audio.srcObject = destination.stream

scene.background = undefined
renderer.outputEncoding = sRGBEncoding
dirLight.position.set(10, 10, 0)
renderer. setClearColor(0xffffff, 0)
scene.add( ambientLight )
scene.add( dirLight )

var bgmBuffer
fetch('../audio/bgm.mp3')
.then(response => {
	response.arrayBuffer()
	.then(buffer => {
		audioContext.decodeAudioData(buffer)
		.then(audioData => {
			bgmBuffer = audioData
			if (audioAuthorized && !isLocalhost()) playBGM()
		})
	})
})
var seTurnBuffer
fetch('../audio/turn.mp3')
.then(response => {
	response.arrayBuffer()
	.then(buffer => {
		audioContext.decodeAudioData(buffer)
		.then(audioData => {
			seTurnBuffer = audioData
		})
	})
})
var seFlyBuffer
fetch('../audio/fly.mp3')
.then(response => {
	response.arrayBuffer()
	.then(buffer => {
		audioContext.decodeAudioData(buffer)
		.then(audioData => {
			seFlyBuffer = audioData
		})
	})
})

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
	/* stats.update() */
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
		playSE(seTurnBuffer)
	}
	lastDirection = rotate
}

function updateFly() {
	if (flying) {
		document.querySelector('#rays').classList.add('show')
		if (!flyingAudio) flyingAudio = playSE(seFlyBuffer, true)
	} else {
		document.querySelector('#rays').classList.remove('show')
		if (flyingAudio) {
			flyingAudio.stop()
			flyingAudio = undefined
		}
		return
	}

	let wDir = camera.getWorldDirection(vector)

	let xMov = (objects[0].rotation.y % Math.PI) * 0.1 / (Math.PI/4)
	let yMov = (objects[0].rotation.x % Math.PI) * 0.1 / (Math.PI/4)

	/* objects[0].position.x += xMov
	camera.position.x += xMov */

	objects[0].position.y += yMov
	camera.position.y += yMov

	let angle = Math.min(yMov*10000, document.documentElement.clientHeight)

	document.querySelector('#rays').style.setProperty('top', `calc(-100% - ${angle}px)`)

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
	if (keysPressed[65]) rotate = 'left'
	if (keysPressed[68]) rotate = 'right'
	if (keysPressed[87]) rotate = 'up'
	if (keysPressed[83]) rotate = 'down'
	if (rotate) document.querySelector(`#button-${rotate}`).classList.add('active')
}
window.onkeyup = e => {
	keysPressed[e.keyCode] = false
	let button
	if (e.keyCode == 32) {
		button = '#button-fly'
		flying = false
	}
	if (e.keyCode == 65) button = '#button-left'
	if (e.keyCode == 68) button = '#button-right'
	if (e.keyCode == 87) button = '#button-up'
	if (e.keyCode == 83) button = '#button-down'
	if (button) {
		document.querySelector(button).classList.remove('active')
		rotate = null
	}
}

function initControls() {
	document.querySelector('#button-config').onclick = () => {
		document.querySelector('#menu-config').classList.toggle('opened')
	}
	document.querySelector('#menu-button-music-off').onclick = e => {
		e.preventDefault()
		if (bgmSource) bgmSource.stop()
		document.querySelector('#menu-button-music-off').classList.add('off')
		document.querySelector('#menu-button-music-on').classList.remove('off')
	}
	document.querySelector('#menu-button-music-on').onclick = e => {
		e.preventDefault()
		playBGM()
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
	document.querySelector('#button-right').ontouchstart = () => rotate = 'right'
	document.querySelector('#button-right').ontouchend = () => rotate = null
	document.querySelector('#button-up').ontouchstart = () => rotate = 'up'
	document.querySelector('#button-up').ontouchend = () => rotate = null
	document.querySelector('#button-down').ontouchstart = () => rotate = 'down'
	document.querySelector('#button-down').ontouchend = () => rotate = null
	document.querySelector('#button-fly').ontouchstart = () => flying = true
	document.querySelector('#button-fly').ontouchend = () => flying = false
}

var oldRotate
window.ondeviceorientation = e => {
	if (screen.orientation.angle >= 270) {
		if (e.gamma < 20) rotate = 'up'
		else if (e.gamma > 40) rotate = 'down'
		else if (e.beta > 10) rotate = 'left'
		else if (e.beta < -10) rotate = 'right'
		else rotate = null
	} else if (screen.orientation.angle >= 90) {
		if (e.gamma > -40) rotate = 'up'
		else if (e.gamma < -60) rotate = 'down'
		else if (e.beta < -10) rotate = 'left'
		else if (e.beta > 10) rotate = 'right'
		else rotate = null
	} else {
		if (e.beta < 20) rotate = 'up'
		else if (e.beta > 70) rotate = 'down'
		else if (e.gamma < -20) rotate = 'left'
		else if (e.gamma > 20) rotate = 'right'
		else rotate = null
	}
	if (rotate) {
		document.querySelector(`#button-${rotate}`).classList.add('active')
		if (oldRotate && oldRotate != rotate) document.querySelector(`#button-${oldRotate}`).classList.remove('active')
		oldRotate = rotate
	} else if (oldRotate) {
		document.querySelector(`#button-${oldRotate}`).classList.remove('active')
		oldRotate = undefined
	}
}
window.onresize = () => resizeScene()
window.oncontextmenu = () => {return isLocalhost()}

document.body.appendChild(renderer.domElement)
/* document.body.appendChild(stats.dom)
stats.begin() */

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	initControls()
	particlesJS.load('particles', './js/particles.json')
	document.querySelector('header').style.removeProperty('display')
	document.querySelector('#rays').style.removeProperty('display')
	document.querySelectorAll('footer').forEach(el => el.style.removeProperty('display'))
	if (isPC()) {
		document.querySelector('#icon-rocket').style.setProperty('display', 'none')
		document.querySelectorAll('footer:first-of-type section button').forEach(el => {
			el.querySelector('svg').style.setProperty('display', 'none')
		})
	} else {
		document.querySelector('#icon-spacebar').style.setProperty('display', 'none')
		document.querySelectorAll('footer:first-of-type section button').forEach(el => {
			el.querySelector('label').style.setProperty('display', 'none')
		})
	}
}
document.onclick = () => {
	if (!audioAuthorized) {
		if (bgmBuffer && !isLocalhost()) playBGM()
		audio.play()
		audioAuthorized = true
	}
}

function playBGM(startTime=0) {
	if (!bgmBuffer) return
	bgmSource = audioContext.createBufferSource()
	bgmSource.buffer = bgmBuffer
	bgmSource.loop = true
	bgmSource.connect(audioGain)
	bgmSource.start(startTime)
	bgmSource.onended = () => {
		bgmSource.disconnect()
		bgmSource = undefined
	}
}

function playSE(buffer, loop=false) {
	if (!buffer) return
	let src = audioContext.createBufferSource()
	src.buffer = buffer
	src.loop = loop
	src.connect(audioContext.destination)
	src.start(0)
	src.onended = () => src.disconnect()
	return src
}

function isLocalhost() {
	return ['localhost', '127.0.0.1', '192.168.0.110'].includes(location.hostname)
}

function isPC() {
	return /(windows|macintosh)/i.test(navigator.userAgent)
}

animate()