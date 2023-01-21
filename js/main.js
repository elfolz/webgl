import {WebGLRenderer, Scene, PerspectiveCamera, sRGBEncoding, AmbientLight, DirectionalLight, Box3, Vector2, Vector3, Raycaster} from './three.module.js'
import { GLTFLoader } from './GLTFLoader.js'
import { OrbitControls } from './OrbitControls.js'
import { GUI } from './dat.gui.module.js'

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

const gui = new GUI()
const renderer = new WebGLRenderer({antialias: true, alpha: true})
const scene = new Scene()
const camera = new PerspectiveCamera(95, document.documentElement.clientWidth / document.documentElement.clientHeight, 0.1, 1000)
const loader = new GLTFLoader()
const controls = new OrbitControls(camera, renderer.domElement)
const box = new Box3()
const vector = new Vector3()
const raycaster = new Raycaster()
const pointer = new Vector2()
var object
var pointerObject

scene.background = undefined
gui.domElement.style.setProperty('display', 'none')
renderer. setClearColor(0xffffff, 0)
renderer.outputEncoding = sRGBEncoding
const ambientLight = new AmbientLight( 0xffffff, 0.5 )
const dirLight = new DirectionalLight( 0xefefff, 1.5 )
dirLight.position.set(10, 10, 10)

scene.add( ambientLight )
scene.add( dirLight )

loader.load(`./spaceship.glb`,
	gltf => {
		object = gltf.scene

		box.setFromObject(object)

		const objectFolder = gui.addFolder('Object')
		objectFolder.add(object.rotation, 'x', 0, Math.PI * 2)
		objectFolder.add(object.rotation, 'y', 0, Math.PI * 2)
		objectFolder.add(object.rotation, 'z', 0, Math.PI * 2)
		objectFolder.open()
		const cameraFolder = gui.addFolder('Camera')
		cameraFolder.add(camera.position, 'z', 0, 0)
		cameraFolder.open()
		
		const size = box.getSize(vector).length()
		const center = box.getCenter(vector)

		camera.near = size / 100
		camera.far = size * 100
		camera.position.x += size / 2.0
		camera.position.y += size / 2.0
		camera.position.z += size / 2.0
		camera.lookAt(center)
		camera.min

		object.position.x += (object.position.x - center.x)
		object.position.y += (object.position.y - center.y)
		object.position.z += (object.position.z - center.z)

		scene.add(object)

		resizeScene()
	}, undefined, error => {
		console.log(error)
	}
)

function resizeScene() {
	camera.aspect = document.documentElement.clientWidth / document.documentElement.clientHeight
	camera.updateProjectionMatrix()
	renderer.setSize(document.documentElement.clientWidth, document.documentElement.clientHeight)
	animate()
}

function animate() {
	requestAnimationFrame(animate)
	controls.update()
	raycaster.setFromCamera(pointer, camera)
	handleSpaceshipPointer(raycaster.intersectObjects(scene.children))
	renderer.render(scene, camera)
}

function handleSpaceshipPointer(intersects) {
	if (intersects?.length) {
		let spaceship = getSpaceship(intersects[0].object)
		if (spaceship) {
			document.documentElement.style.setProperty('cursor', 'pointer')
			pointerObject = spaceship
		} else {
			document.documentElement.style.setProperty('cursor', null)
			pointerObject = undefined
		}
	} else {
		document.documentElement.style.setProperty('cursor', null)
		pointerObject = undefined
	}
	function getSpaceship(object) {
		if (object?.name == 'SpaceShip') return object
		else if (object.parent) return getSpaceship(object.parent)
		else return null
	}
}

window.onresize = () => resizeScene()

document.body.appendChild(renderer.domElement)
document.onreadystatechange = () => {
	if (document.readyState != 'complete') return
	particlesJS.load('particles-js', './js/particles.json')
}
document.onmousemove = e => {
	pointer.x = ( e.clientX / window.innerWidth ) * 2 - 1
	pointer.y = - ( e.clientY / window.innerHeight ) * 2 + 1
}
/* document.onclick = () => {
	if (!pointerObject) return
	alert('Clicou na nave!')
} */