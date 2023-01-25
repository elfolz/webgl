import {Clock, WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Vector3, Raycaster} from './three.module.js'
import { GLTFLoader } from './gltfLoader.module.js'

navigator.serviceWorker?.register('service-worker.js')

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
const renderer = new WebGLRenderer({antialias: true, alpha: true})
const camera = new PerspectiveCamera(75, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 1000)
const ambientLight = new AmbientLight( 0xFFFFFF, 0.005 )
const dirLight = new DirectionalLight( 0xFFFFC8, 1.5 )
const loader = new GLTFLoader()
const vector = new Vector3()
const scene = new Scene()
const audio = new Audio()
const objects = {}
const keysPressed = {}

var frames = 0
var fpsLimit = 1 / 60
var touching = false
var rotate
var lastDirection
var gamepad
var gamepadVibrating = false
var floatY = 0
var revertFloat = false
var flying = false
var clockDelta = 0
var flyingAudio
var touchControl = !(localStorage.getItem('touch') == 'false')
var gyroscope = !isPC() && !(localStorage.getItem('gyroscope') == 'false')
var bgmSource
var lastFrameTime = performance.now()
var gyroscopeAuthorization = false
var audioAuthorized = false
var audioContext
var audioGain
var bgmBuffer
var seTurnBuffer
var seFlyBuffer
var dummyCamera

scene.background = undefined
renderer.outputEncoding = sRGBEncoding
dirLight.position.set(-10, 10, 0)
renderer. setClearColor(0xffffff, 0)
scene.add( ambientLight )
scene.add( dirLight )

loader.load(`./models/spaceship.glb`,
	gltf => {
		objects[0] = gltf.scene.children.find(el => el.name == 'SpaceShip')
		objects[0].vertices = getVertices(objects[0])
		dummyCamera = camera.clone()
		dummyCamera.position.set(0, objects[0].position.y+6, objects[0].position.z-10)
		dummyCamera.lookAt(0, 6, 0)
		objects[0].add(dummyCamera)
		scene.add(objects[0])
	}, undefined, error => {
		console.log(error)
	}
)

loader.load(`./models/planet.glb`,
	gltf => {
		objects[1] = gltf.scene.children[0]
		objects[1].position.y = 100
		objects[1].position.z = 250
		objects[1].scale.set(50, 50, 50)
		objects[1].vertices = getVertices(objects[1])
		scene.add(objects[1])
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
	if (document.hidden) return
	if (fpsLimit) clockDelta += clock.getDelta()
	if (fpsLimit && clockDelta < fpsLimit) return
	renderer.render(scene, camera)
	updateFPSCounter()
	updateObjectsAnimations()
	updateCameraPosition()
	updateRotation()
	updateGamepad()
	updateFly()
	if (fpsLimit) clockDelta = clockDelta % fpsLimit
}

function updateFPSCounter() {
	frames++
	if (performance.now() < lastFrameTime + 1000) return
	let fps = Math.round(( frames * 1000 ) / ( performance.now() - lastFrameTime ))
	if (!Number.isNaN(fps)) {
		let ctx = document.querySelector('#fps').getContext('2d')
		ctx.font = 'bold 20px sans-serif'
		ctx.textAlign = 'end'
		ctx.fillStyle = 'rgba(255,255,255,0.25)'
		ctx.clearRect(0, 0, 80, 20)
		ctx.fillText(`${fps} FPS`, 80, 20)
	}
	lastFrameTime = performance.now()
	frames = 0
}

function updateObjectsAnimations() {
	/* if (objects[0]) {
		if (revertFloat) {
			if (floatY <= -0.0025) revertFloat = false
			else floatY -= 0.00001
		} else {
			if (floatY >= 0.0025) revertFloat = true
			else floatY += 0.00001
		}
		if (floatY > 0.0025) floatY = 0.0025
		if (floatY < -0.0025) floatY = -0.0025
		objects[0].translateY(floatY)
	} */
	if (objects[1]) objects[1].rotation.y += 0.001
}

function updateGamepad() {
	gamepad = navigator.getGamepads().find(el => el?.connected)
	if (gamepad) {
		if (!audioAuthorized && gamepad.buttons.some(el => el.pressed)) initAudio()
		document.querySelectorAll('footer')?.forEach(el => el.classList.add('hide'))
		document.querySelector('#menu-button-gamepad').classList.remove('off')
		document.querySelector('#menu-button-touch-on').classList.add('off')
		document.querySelector('#menu-button-touch-off').classList.add('off')
	} else if (!gamepad && touchControl) {
		document.querySelectorAll('footer')?.forEach(el => el.classList.remove('hide'))
	}
	if (!gamepad) {
		if (touchControl) {
			document.querySelector('#menu-button-gamepad').classList.add('off')
			document.querySelector('#menu-button-touch-off').classList.remove('off')
		}
		return
	}
	if (gamepad.axes[0] <= -0.5 || gamepad.buttons[LEFT].pressed) rotate = 'left'
	else if (gamepad.axes[0] >= 0.5 || gamepad.buttons[RIGHT].pressed) rotate = 'right'
	else if (gamepad.axes[1] <= -0.5 || gamepad.buttons[UP].pressed) rotate = 'up'
	else if (gamepad.axes[1] >= 0.5 || gamepad.buttons[DOWN].pressed) rotate = 'down'
	else rotate = null
	flying = gamepad.buttons[A].pressed || gamepad.buttons[B].pressed || gamepad.buttons[X].pressed || gamepad.buttons[Y].pressed
	if (flying && !gamepadVibrating) vibrateGamepad()
}

function updateRotation() {
	if (!objects[0]) return
	if (rotate == 'left') objects[0].rotation.y += 0.025
	if (rotate == 'right') objects[0].rotation.y -= 0.025
	if (rotate == 'up') objects[0].rotation.x -= 0.025
	if (rotate == 'down') objects[0].rotation.x += 0.025
	if (rotate && lastDirection != rotate) {
		if (audioAuthorized) playSE(seTurnBuffer)
	}
	lastDirection = rotate
}

function updateCameraPosition() {
	if (!objects[0]) return
	let target = objects[0].clone()
	dummyCamera.getWorldPosition(target.position)
	dummyCamera.getWorldQuaternion(target.quaternion)
	camera.position.lerp(target.position, 0.25)
	camera.quaternion.slerp(target.quaternion, 0.25)
}

function vibrateGamepad() {
	if (!gamepad) return
	gamepadVibrating = true
	gamepad.vibrationActuator.playEffect(gamepad.vibrationActuator.type, {
		startDelay: 0,
		duration: 0.1,
		weakMagnitude: 0.1,
		strongMagnitude: 0.25,
	})
	.then(() => {
		if (flying) vibrateGamepad()
	})
	.finally(() => {
		if (!flying) gamepadVibrating = false
	})
}

var lastVibration = 0
function updateFly() {
	if (flying) {
		if (collide(objects[0], objects[1])) {
			document.querySelector('#rays').classList.remove('show')
			if (flyingAudio) flyingAudio.stop()
			flyingAudio = undefined
			return
		} else {
			document.querySelector('#rays').classList.add('show')
			if (!flyingAudio) flyingAudio = playSE(seFlyBuffer, true)
		}
	} else {
		document.querySelector('#rays').classList.remove('show')
		if (flyingAudio) {
			flyingAudio.stop()
			flyingAudio = undefined
		}
		return
	}
	let dir = camera.getWorldDirection(objects[0].clone().position)
	objects[0].position.add(dir.multiplyScalar(0.5))
	if (!isPC() && !gamepad && performance.now() > lastVibration + 100) {
		try {navigator.vibrate(50)} catch(e){}
		lastVibration = performance.now()
	}
}

function getVertices(obj) {
	let vertices = []
	if (obj.geometry) {
		vertices= [...vertices, obj.geometry.attributes.position]
	} else {
		for (let i in obj.children) {
			vertices= [...vertices, ...getVertices(obj.children[i])]
		}
	}
	return vertices
}
function colisionCheck(a, b) {
	return a.vertices.some((el, i) => {
		let localVertex = new Vector3().fromBufferAttribute(el, i).clone()
		let globalVertex = localVertex.applyMatrix4(a.matrix)
		let directionVector = globalVertex.sub(a.position)
		let ray = new Raycaster(a.position, directionVector.normalize())
		let collisionResults = ray.intersectObjects([b])
		return collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()
	})
}
function collide(a, b) {
	let collide = colisionCheck(a, b)
	if (collide) return true
	collide = colisionCheck(b, a)
	if (collide) return true
	collide = a.position.z==b.position.z&&a.position.x==b.position.x&&a.position.y==b.position.y
	return collide
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
	document.querySelector('#button-config').onclick = e => {
		e.stopPropagation()
		document.querySelector('#menu-config').classList.toggle('opened')
	}
	document.querySelector('#menu-button-music-off').onclick = e => {
		e.stopPropagation()
		localStorage.setItem('bgm', 'false')
		document.querySelector('#menu-button-music-off').classList.add('off')
		document.querySelector('#menu-button-music-on').classList.remove('off')
		if (bgmSource) bgmSource.stop()
	}
	document.querySelector('#menu-button-music-on').onclick = e => {
		e.stopPropagation()
		localStorage.setItem('bgm', 'true')
		document.querySelector('#menu-button-music-on').classList.add('off')
		document.querySelector('#menu-button-music-off').classList.remove('off')
		playBGM()
	}
	document.querySelector('#menu-button-touch-off').onclick = e => {
		e.stopPropagation()
		touchControl = false
		localStorage.setItem('touch', 'false')
		document.querySelector('#menu-button-touch-off').classList.add('off')
		document.querySelector('#menu-button-touch-on').classList.remove('off')
		document.querySelectorAll('footer')?.forEach(el => el.classList.add('hide'))
	}
	document.querySelector('#menu-button-touch-on').onclick = e => {
		e.stopPropagation()
		touchControl = true
		localStorage.setItem('touch', 'true')
		document.querySelector('#menu-button-touch-on').classList.add('off')
		document.querySelector('#menu-button-touch-off').classList.remove('off')
		document.querySelectorAll('footer')?.forEach(el => el.classList.remove('hide'))
	}

	if (isPC()) {
		document.querySelector('#menu-button-gyro-on').classList.add('off')
		document.querySelector('#menu-button-gyro-off').classList.add('off')
	}
	document.querySelector('#menu-button-gyro-off').onclick = e => {
		e.stopPropagation()
		gyroscope = false
		rotate = null
		localStorage.setItem('gyroscope', 'false')
		document.querySelector('#menu-button-gyro-off').classList.add('off')
		document.querySelector('#menu-button-gyro-on').classList.remove('off')
	}
	document.querySelector('#menu-button-gyro-on').onclick = e => {
		e.stopPropagation()
		gyroscope = true
		localStorage.setItem('gyroscope', 'true')
		document.querySelector('#menu-button-gyro-on').classList.add('off')
		document.querySelector('#menu-button-gyro-off').classList.remove('off')
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

	document.querySelector('#button-left').ontouchstart = () => {rotate = 'left'; touching = true}
	document.querySelector('#button-left').ontouchend = () => {rotate = null; touching = false}
	document.querySelector('#button-right').ontouchstart = () => {rotate = 'right'; touching = true}
	document.querySelector('#button-right').ontouchend = () => {rotate = null; touching = false}
	document.querySelector('#button-up').ontouchstart = () => {rotate = 'up'; touching = true}
	document.querySelector('#button-up').ontouchend = () => {rotate = null; touching = false}
	document.querySelector('#button-down').ontouchstart = () => {rotate = 'down'; touching = true}
	document.querySelector('#button-down').ontouchend = () => {rotate = null; touching = false}
	document.querySelector('#button-fly').ontouchstart = () => flying = true
	document.querySelector('#button-fly').ontouchend = () => flying = false
}

function listenToDeviceOrientation() {
	var oldRotate
	window.ondeviceorientation = e => {
		if (!gyroscope || touching) return
		if (e.beta >= -1 && e.beta <= 1 && e.gamma >= -1 && e.gamma <= 1) {
			rotate = null
		} else if (screen?.orientation?.angle >= 270 || orientation < 0) {
			if (e.gamma < 20) rotate = 'up'
			else if (e.gamma > 40) rotate = 'down'
			else if (e.beta > 10) rotate = 'left'
			else if (e.beta < -10) rotate = 'right'
			else rotate = null
		} else if (screen?.orientation?.angle >= 90 || orientation > 0) {
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
}

function requestOrientationPermission() {
	if (typeof DeviceOrientationEvent['requestPermission'] === 'function') {
		DeviceOrientationEvent['requestPermission']()
		.then(response => {
			if (response == 'granted') {
				listenToDeviceOrientation()
			} else if (response == 'denied') {
				document.querySelector('#menu-button-gyro-on').classList.add('off')
				document.querySelector('#menu-button-gyro-off').classList.add('off')
			}
			gyroscopeAuthorization = true
		})
		.catch(error => {})
	} else if (DeviceOrientationEvent) {
		listenToDeviceOrientation()
		gyroscopeAuthorization = true
	}
}

function initAudio() {
	audioContext = new AudioContext()
	audioGain = audioContext.createGain()
	const destination = audioContext.createMediaStreamDestination()
	audioGain.connect(audioContext.destination)
	audioGain.gain.value = 0.25
	audio.srcObject = destination.stream
	audio.play()
	fetch('../audio/bgm.mp3')
	.then(response => {
		response.arrayBuffer()
		.then(buffer => {
			audioContext.decodeAudioData(buffer)
			.then(audioData => {
				bgmBuffer = audioData
				playBGM()
			})
		})
	})
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
	audioAuthorized = true
}

window.onresize = () => resizeScene()
window.oncontextmenu = () => {return isLocalhost()}

document.body.appendChild(renderer.domElement)

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	initControls()
	particlesJS.load('particles', './js/particles.json')
	document.querySelector('header').style.removeProperty('display')
	document.querySelector('#rays').style.removeProperty('display')
	document.querySelectorAll('footer').forEach(el => el.style.removeProperty('display'))
	if (localStorage.getItem('bgm') == 'false') {
		document.querySelector('#menu-button-music-on').classList.remove('off')
		document.querySelector('#menu-button-music-off').classList.add('off')
	}
	if (localStorage.getItem('touch') == 'false') {
		document.querySelector('#menu-button-touch-on').classList.remove('off')
		document.querySelector('#menu-button-touch-off').classList.add('off')
		document.querySelectorAll('footer')?.forEach(el => el.classList.add('hide'))
	}
	if (isPC()) {
		document.querySelector('#icon-rocket').style.setProperty('display', 'none')
		document.querySelectorAll('footer:first-of-type section button').forEach(el => {
			el.querySelector('svg').style.setProperty('display', 'none')
		})
	} else {
		if (localStorage.getItem('gyroscope') == 'false') {
			document.querySelector('#menu-button-gyro-on').classList.remove('off')
			document.querySelector('#menu-button-gyro-off').classList.add('off')
		}
		document.querySelector('#icon-spacebar').style.setProperty('display', 'none')
		document.querySelectorAll('footer:first-of-type section button').forEach(el => {
			el.querySelector('label').style.setProperty('display', 'none')
		})
	}
}
document.onclick = () => {
	document.querySelector('#menu-config').classList.remove('opened')
	if (!isPC() && !gyroscopeAuthorization) requestOrientationPermission()
	if (!audioAuthorized) initAudio()
}
document.onvisibilitychange = () => {
	if (document.hidden) {
		rotate = null
		flying = false
		touching = false
		if (audioGain) audioGain.gain.value = 0
		document.querySelectorAll('footer section button').forEach(el => {
			el.classList.remove('active')
		})
	} else {
		if (audioGain) audioGain.gain.value = 0.25
	}
}

function playBGM() {
	if (!audioContext || !bgmBuffer || localStorage.getItem('bgm') == 'false') return
	bgmSource = audioContext.createBufferSource()
	bgmSource.buffer = bgmBuffer
	bgmSource.loop = true
	bgmSource.connect(audioGain)
	bgmSource.start(0)
	bgmSource.onended = () => {
		bgmSource.disconnect()
		bgmSource = undefined
	}
}

function playSE(buffer, loop=false) {
	if (!audioContext || !buffer) return
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

resizeScene()
animate()