import {WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector3} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'
import { OrbitControls } from './OrbitControls.js'
import { GUI } from './dat.gui.module.js'

navigator.serviceWorker?.register('service-worker.js').then(reg => {
	reg.addEventListener('updatefound', () => {
		let newWorker = reg.installing
		newWorker?.addEventListener('statechange', () => {
			console.log('Update Installed. Restarting...')
			if (newWorker.state == 'activated') location.reload(true)
		})
	})
})

const gui = new GUI()
const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 )
const loader = new GLTFLoader()
const controls = new OrbitControls(camera, renderer.domElement)
var object
var box

scene.background = undefined
gui.domElement.style.setProperty('display', 'none')
renderer. setClearColor(0xffffff, 0)
renderer.outputEncoding = sRGBEncoding
renderer.setSize(window.innerWidth, window.innerHeight)
const ambientLight = new AmbientLight( 0xffffff, 0.4 )
const dirLight = new DirectionalLight( 0xefefff, 1.5 )
dirLight.position.set( 10, 10, 10 )

scene.add( ambientLight )
scene.add( dirLight )

loader.load(`./spaceship.glb`,
	gltf => {
		object = gltf.scene

		box = new Box3().setFromObject(object)

		resizeScene()

		const cubeFolder = gui.addFolder('Object')
		cubeFolder.add(object.rotation, 'x', 0, Math.PI * 2)
		cubeFolder.add(object.rotation, 'y', 0, Math.PI * 2)
		cubeFolder.add(object.rotation, 'z', 0, Math.PI * 2)
		cubeFolder.open()
		const cameraFolder = gui.addFolder('Camera')
		cameraFolder.add(camera.position, 'z', 0, 10)
		cameraFolder.open()

		scene.add(object)

		animate()
	}, undefined, error => {
		console.log(error)
	}
)

function resizeScene() {
	if (!object) return

	const size = box.getSize(new Vector3()).length()
	const center = box.getCenter(new Vector3())

	camera.near = size / 100
	camera.far = size * 100
	camera.updateProjectionMatrix()
	camera.position.copy(center)
	camera.position.x += size / 2.0
	camera.position.y += size / 1.0
	camera.position.z += size / 2.0
	camera.lookAt(center)
	camera.updateProjectionMatrix()

	object.position.x += (object.position.x - center.x)
	object.position.y += (object.position.y - center.y)
	object.position.z += (object.position.z - center.z)
}

function animate() {
	requestAnimationFrame(animate)
	renderer.render(scene, camera)
}

window.onresize = () => {
	resizeScene()
	animate()
}

document.body.appendChild(renderer.domElement)

document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles-js', './js/particles.json')
}