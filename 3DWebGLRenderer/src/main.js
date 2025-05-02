import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

// Create a second scene for wireframe view
const wireframeScene = new THREE.Scene();
wireframeScene.background = new THREE.Color(0xf0f0f0);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 3);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
wireframeScene.add(ambientLight.clone());

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
directionalLight.castShadow = true;
scene.add(directionalLight);
wireframeScene.add(directionalLight.clone());

// GLB Loader
const loader = new GLTFLoader();

// Animation mixer and actions
let mixer = null;
let currentModel = null;
let currentAction = null;
let isPlaying = true;
let animations = [];

// Environment presets configuration
const environmentPresets = {
    studio: {
        background: '#f0f0f0',
        ambientIntensity: 0.5,
        directionalIntensity: 1.0,
        directionalColor: '#ffffff',
        directionalPosition: { x: 5, y: 5, z: 5 }
    },
    sunset: {
        background: '#ff7e5f',
        ambientIntensity: 0.3,
        directionalIntensity: 0.8,
        directionalColor: '#ffb347',
        directionalPosition: { x: -5, y: 3, z: 5 }
    },
    night: {
        background: '#1a1a2e',
        ambientIntensity: 0.2,
        directionalIntensity: 0.6,
        directionalColor: '#4a90e2',
        directionalPosition: { x: 0, y: 10, z: 0 }
    },
    morning: {
        background: '#e6f3ff',
        ambientIntensity: 0.6,
        directionalIntensity: 1.2,
        directionalColor: '#ffd700',
        directionalPosition: { x: 5, y: 3, z: -5 }
    },
    dramatic: {
        background: '#2c3e50',
        ambientIntensity: 0.2,
        directionalIntensity: 1.5,
        directionalColor: '#ffffff',
        directionalPosition: { x: -8, y: 8, z: 8 }
    },
    warm: {
        background: '#fff5e6',
        ambientIntensity: 0.7,
        directionalIntensity: 0.9,
        directionalColor: '#ffb347',
        directionalPosition: { x: 5, y: 5, z: 5 }
    },
    cool: {
        background: '#e6f3ff',
        ambientIntensity: 0.6,
        directionalIntensity: 0.8,
        directionalColor: '#4a90e2',
        directionalPosition: { x: 5, y: 5, z: 5 }
    }
};

// Camera presets configuration
const cameraPresets = {
    front: {
        position: { x: 0, y: 1.6, z: 3 },
        target: { x: 0, y: 1, z: 0 }
    },
    back: {
        position: { x: 0, y: 1.6, z: -3 },
        target: { x: 0, y: 1, z: 0 }
    },
    left: {
        position: { x: -3, y: 1.6, z: 0 },
        target: { x: 0, y: 1, z: 0 }
    },
    right: {
        position: { x: 3, y: 1.6, z: 0 },
        target: { x: 0, y: 1, z: 0 }
    },
    top: {
        position: { x: 0, y: 5, z: 0 },
        target: { x: 0, y: 0, z: 0 }
    },
    bottom: {
        position: { x: 0, y: -5, z: 0 },
        target: { x: 0, y: 0, z: 0 }
    }
};

// Split view variables
let isSplitViewActive = false;
let splitPosition = 0.5;
let wireframeModel = null;

// Function to update split view
function updateSplitView() {
    if (!isSplitViewActive) {
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
        return;
    }

    const splitX = Math.floor(window.innerWidth * splitPosition);
    
    // Render solid view
    renderer.setViewport(0, 0, splitX, window.innerHeight);
    renderer.render(scene, camera);
    
    // Render wireframe view
    renderer.setViewport(splitX, 0, window.innerWidth - splitX, window.innerHeight);
    renderer.render(wireframeScene, camera);
}

// Function to create wireframe version of model
function createWireframeModel(model) {
    const wireframeModel = model.clone();
    wireframeModel.traverse((node) => {
        if (node.isMesh) {
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                wireframe: true,
                color: 0x000000
            });
            node.material = wireframeMaterial;
        }
    });
    return wireframeModel;
}

// Function to load GLB model
function loadModel(url) {
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.add('active');

    // Remove previous models if they exist
    if (currentModel) {
        scene.remove(currentModel);
        if (wireframeModel) {
            wireframeScene.remove(wireframeModel);
        }
        if (mixer) {
            mixer.stopAllAction();
            mixer = null;
        }
    }

    // Reset toggles
    document.getElementById('wireframe-toggle').classList.remove('active');
    document.getElementById('split-view-toggle').classList.remove('active');
    document.getElementById('split-view-controls').style.display = 'none';
    isSplitViewActive = false;

    loader.load(
        url,
        (gltf) => {
            const model = gltf.scene;
            model.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });

            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            // Scale the model if needed
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.multiplyScalar(scale);

            // Create wireframe version
            wireframeModel = createWireframeModel(model);
            wireframeScene.add(wireframeModel);

            // Setup animations
            if (gltf.animations && gltf.animations.length) {
                mixer = new THREE.AnimationMixer(model);
                animations = gltf.animations;
                
                // Update animation selector
                const animationSelect = document.getElementById('animation-select');
                animationSelect.innerHTML = '<option value="">Select Animation</option>';
                animations.forEach((anim, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = anim.name || `Animation ${index + 1}`;
                    animationSelect.appendChild(option);
                });
                
                // Show animation controls
                document.querySelector('.animation-controls').style.display = 'flex';
                
                // Play first animation by default
                if (animations.length > 0) {
                    playAnimation(0);
                }
            } else {
                // Hide animation controls if no animations
                document.querySelector('.animation-controls').style.display = 'none';
            }

            scene.add(model);
            currentModel = model;
            loadingElement.classList.remove('active');
        },
        (xhr) => {
            const percent = (xhr.loaded / xhr.total * 100).toFixed(0);
            loadingElement.textContent = `Loading model... ${percent}%`;
        },
        (error) => {
            console.error('An error happened:', error);
            loadingElement.textContent = 'Error loading model';
            loadingElement.classList.remove('active');
        }
    );
}

// Function to play animation
function playAnimation(index) {
    if (currentAction) {
        currentAction.stop();
    }
    
    if (animations[index]) {
        currentAction = mixer.clipAction(animations[index]);
        currentAction.play();
        isPlaying = true;
        updateAnimationButton();
    }
}

// Handle file input
const fileInput = document.getElementById('file-input');
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        loadModel(url);
    }
});

// Animation selector
const animationSelect = document.getElementById('animation-select');
animationSelect.addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (!isNaN(index)) {
        playAnimation(index);
    }
});

// Animation toggle functionality
const animationToggleBtn = document.getElementById('animation-toggle-btn');
animationToggleBtn.addEventListener('click', () => {
    if (currentAction) {
        if (isPlaying) {
            currentAction.paused = true;
            isPlaying = false;
        } else {
            currentAction.paused = false;
            isPlaying = true;
        }
        updateAnimationButton();
    }
});

function updateAnimationButton() {
    const btn = animationToggleBtn;
    if (isPlaying) {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4H10V20H6V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M14 4H18V20H14V4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Pause Animation
        `;
        btn.classList.remove('paused');
    } else {
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3L19 12L5 21V3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Play Animation
        `;
        btn.classList.add('paused');
    }
}

// Screenshot functionality
const screenshotBtn = document.getElementById('screenshot-btn');
screenshotBtn.addEventListener('click', () => {
    // Hide UI
    const uiContainer = document.querySelector('.ui-container');
    uiContainer.style.display = 'none';

    // Render the scene
    renderer.render(scene, camera);

    // Take screenshot
    const screenshot = renderer.domElement.toDataURL('image/png');

    // Create download link
    const link = document.createElement('a');
    link.href = screenshot;
    link.download = 'avatar-screenshot.png';
    link.click();

    // Show UI again
    uiContainer.style.display = 'flex';
});

// Lighting controls
function setupLightingControls() {
    // Ambient light intensity
    const ambientIntensityInput = document.getElementById('ambient-intensity');
    const ambientIntensityValue = document.getElementById('ambient-intensity-value');
    ambientIntensityInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        ambientLight.intensity = value;
        ambientIntensityValue.textContent = value.toFixed(1);
    });

    // Directional light intensity
    const directionalIntensityInput = document.getElementById('directional-intensity');
    const directionalIntensityValue = document.getElementById('directional-intensity-value');
    directionalIntensityInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        directionalLight.intensity = value;
        directionalIntensityValue.textContent = value.toFixed(1);
    });

    // Directional light color
    const directionalColorInput = document.getElementById('directional-color');
    directionalColorInput.addEventListener('input', (e) => {
        directionalLight.color.set(e.target.value);
    });

    // Directional light position
    const directionalXInput = document.getElementById('directional-x');
    const directionalXValue = document.getElementById('directional-x-value');
    directionalXInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        directionalLight.position.x = value;
        directionalXValue.textContent = value.toFixed(1);
    });

    const directionalYInput = document.getElementById('directional-y');
    const directionalYValue = document.getElementById('directional-y-value');
    directionalYInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        directionalLight.position.y = value;
        directionalYValue.textContent = value.toFixed(1);
    });

    const directionalZInput = document.getElementById('directional-z');
    const directionalZValue = document.getElementById('directional-z-value');
    directionalZInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        directionalLight.position.z = value;
        directionalZValue.textContent = value.toFixed(1);
    });
}

// Initialize lighting controls
setupLightingControls();

// Background color controls
function setupBackgroundControls() {
    const bgColorInput = document.getElementById('bg-color');
    const presetColors = document.querySelectorAll('.preset-color');
    const environmentPreset = document.getElementById('environment-preset');

    // Handle color picker input
    bgColorInput.addEventListener('input', (e) => {
        scene.background = new THREE.Color(e.target.value);
    });

    // Handle preset color buttons
    presetColors.forEach(button => {
        button.addEventListener('click', () => {
            const color = button.dataset.color;
            scene.background = new THREE.Color(color);
            bgColorInput.value = color;
        });
    });

    // Handle environment presets
    environmentPreset.addEventListener('change', (e) => {
        const preset = environmentPresets[e.target.value];
        if (preset) {
            // Update background
            scene.background = new THREE.Color(preset.background);
            bgColorInput.value = preset.background;

            // Update ambient light
            ambientLight.intensity = preset.ambientIntensity;
            document.getElementById('ambient-intensity').value = preset.ambientIntensity;
            document.getElementById('ambient-intensity-value').textContent = preset.ambientIntensity.toFixed(1);

            // Update directional light
            directionalLight.intensity = preset.directionalIntensity;
            directionalLight.color.set(preset.directionalColor);
            directionalLight.position.set(
                preset.directionalPosition.x,
                preset.directionalPosition.y,
                preset.directionalPosition.z
            );

            // Update UI controls
            document.getElementById('directional-intensity').value = preset.directionalIntensity;
            document.getElementById('directional-intensity-value').textContent = preset.directionalIntensity.toFixed(1);
            document.getElementById('directional-color').value = preset.directionalColor;
            document.getElementById('directional-x').value = preset.directionalPosition.x;
            document.getElementById('directional-x-value').textContent = preset.directionalPosition.x.toFixed(1);
            document.getElementById('directional-y').value = preset.directionalPosition.y;
            document.getElementById('directional-y-value').textContent = preset.directionalPosition.y.toFixed(1);
            document.getElementById('directional-z').value = preset.directionalPosition.z;
            document.getElementById('directional-z-value').textContent = preset.directionalPosition.z.toFixed(1);
        }
    });
}

// Initialize background controls
setupBackgroundControls();

// Clock for animation timing
const clock = new THREE.Clock();

// Animation timeline elements
const animationTimeline = document.getElementById('animation-timeline');
const animationCurrentTime = document.getElementById('animation-current-time');
const animationTotalTime = document.getElementById('animation-total-time');
let isScrubbing = false;

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

// Update timeline on animation frame
function updateAnimationTimeline() {
    if (currentAction && currentAction._clip) {
        const duration = currentAction._clip.duration;
        const time = currentAction.time;
        if (!isScrubbing) {
            animationTimeline.max = duration;
            animationTimeline.value = time;
        }
        animationCurrentTime.textContent = formatTime(time);
        animationTotalTime.textContent = formatTime(duration);
    } else {
        animationTimeline.value = 0;
        animationCurrentTime.textContent = '0:00';
        animationTotalTime.textContent = '0:00';
    }
}

// Scrubbing logic
animationTimeline.addEventListener('input', (e) => {
    isScrubbing = true;
    if (currentAction && currentAction._clip) {
        const newTime = parseFloat(e.target.value);
        currentAction.time = newTime;
        animationCurrentTime.textContent = formatTime(newTime);
        // If paused, force the mixer to update the model to the new pose
        if (!isPlaying && mixer) {
            mixer.update(0); // force update at current time
        }
    }
});
animationTimeline.addEventListener('change', (e) => {
    isScrubbing = false;
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update animations
    if (mixer && isPlaying) {
        mixer.update(clock.getDelta());
        if (wireframeModel) {
            wireframeModel.rotation.copy(currentModel.rotation);
            wireframeModel.position.copy(currentModel.position);
            wireframeModel.scale.copy(currentModel.scale);
        }
    }
    
    controls.update();
    updateSplitView();
    updateAnimationTimeline();
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Panel management
function closeAllPanels() {
    const panels = [
        document.getElementById('camera-panel'),
        document.getElementById('transform-panel'),
        document.getElementById('helper-panel'),
        document.getElementById('material-panel'),
        document.getElementById('export-panel'),
        document.getElementById('guide-panel'),
        document.getElementById('bg-color-panel')
    ];
    const btns = [
        document.getElementById('camera-btn'),
        document.getElementById('transform-btn'),
        document.getElementById('helper-btn'),
        document.getElementById('material-btn'),
        document.getElementById('export-btn'),
        document.getElementById('guide-btn'),
        document.getElementById('bg-color-btn')
    ];
    const bgControls = document.querySelector('.bg-controls');

    panels.forEach(panel => {
        if (panel && panel.classList.contains('active')) {
            panel.classList.remove('active');
        }
    });
    btns.forEach(btn => {
        if (btn && btn.classList.contains('active')) {
            btn.classList.remove('active');
        }
    });
    if (bgControls) bgControls.style.display = 'flex';
}

// Camera controls setup
function setupCameraControls() {
    const cameraBtn = document.getElementById('camera-btn');
    const cameraPanel = document.getElementById('camera-panel');
    const closeBtn = document.getElementById('close-camera-panel');
    const presetButtons = document.querySelectorAll('.camera-preset-btn');
    const distanceInput = document.getElementById('camera-distance');
    const distanceValue = document.getElementById('camera-distance-value');
    const fovInput = document.getElementById('camera-fov');
    const fovValue = document.getElementById('camera-fov-value');
    const bgControls = document.querySelector('.bg-controls');

    // Toggle camera panel
    cameraBtn.addEventListener('click', () => {
        const isActive = cameraPanel.classList.contains('active');
        if (isActive) {
            closeAllPanels();
        } else {
            closeAllPanels();
            cameraPanel.classList.add('active');
            bgControls.style.display = 'none';
            cameraBtn.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        closeAllPanels();
    });

    // Handle camera presets
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const preset = cameraPresets[button.dataset.preset];
            if (preset) {
                // Remove active class from all buttons
                presetButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');

                // Animate camera movement
                const duration = 1000; // 1 second
                const startPosition = camera.position.clone();
                const startTarget = controls.target.clone();
                const startTime = Date.now();

                function animateCamera() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Ease in-out function
                    const easeProgress = progress < 0.5
                        ? 2 * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                    // Interpolate position
                    camera.position.lerpVectors(
                        startPosition,
                        new THREE.Vector3(preset.position.x, preset.position.y, preset.position.z),
                        easeProgress
                    );

                    // Interpolate target
                    controls.target.lerpVectors(
                        startTarget,
                        new THREE.Vector3(preset.target.x, preset.target.y, preset.target.z),
                        easeProgress
                    );

                    controls.update();

                    if (progress < 1) {
                        requestAnimationFrame(animateCamera);
                    }
                }

                animateCamera();
            }
        });
    });

    // Handle camera distance
    distanceInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        const direction = camera.position.clone().sub(controls.target).normalize();
        camera.position.copy(controls.target).add(direction.multiplyScalar(value));
        distanceValue.textContent = value.toFixed(1);
        controls.update();
    });

    // Handle field of view
    fovInput.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        camera.fov = value;
        camera.updateProjectionMatrix();
        fovValue.textContent = value;
    });
}

// Initialize camera controls
setupCameraControls();

// Initialize helpers
let gridHelper = null;
let axesHelper = null;
let measureHelper = null;

// Transform controls setup
function setupTransformControls() {
    const transformBtn = document.getElementById('transform-btn');
    const transformPanel = document.getElementById('transform-panel');
    const closeBtn = document.getElementById('close-transform-panel');
    const scaleInput = document.getElementById('scale');
    const scaleValue = document.getElementById('scale-value');
    const rotationXInput = document.getElementById('rotation-x');
    const rotationXValue = document.getElementById('rotation-x-value');
    const rotationYInput = document.getElementById('rotation-y');
    const rotationYValue = document.getElementById('rotation-y-value');
    const rotationZInput = document.getElementById('rotation-z');
    const rotationZValue = document.getElementById('rotation-z-value');
    const resetBtn = document.getElementById('reset-transform');
    const bgControls = document.querySelector('.bg-controls');

    // Toggle transform panel
    transformBtn.addEventListener('click', () => {
        const isActive = transformPanel.classList.contains('active');
        if (isActive) {
            closeAllPanels();
        } else {
            closeAllPanels();
            transformPanel.classList.add('active');
            bgControls.style.display = 'none';
            transformBtn.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        closeAllPanels();
    });

    // Handle scale
    scaleInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (currentModel) {
            currentModel.scale.set(value, value, value);
        }
        scaleValue.textContent = value.toFixed(1);
    });

    // Handle rotation
    function updateRotation() {
        if (currentModel) {
            currentModel.rotation.x = THREE.MathUtils.degToRad(parseFloat(rotationXInput.value));
            currentModel.rotation.y = THREE.MathUtils.degToRad(parseFloat(rotationYInput.value));
            currentModel.rotation.z = THREE.MathUtils.degToRad(parseFloat(rotationZInput.value));
        }
    }

    rotationXInput.addEventListener('input', (e) => {
        rotationXValue.textContent = e.target.value;
        updateRotation();
    });

    rotationYInput.addEventListener('input', (e) => {
        rotationYValue.textContent = e.target.value;
        updateRotation();
    });

    rotationZInput.addEventListener('input', (e) => {
        rotationZValue.textContent = e.target.value;
        updateRotation();
    });

    // Reset transform
    resetBtn.addEventListener('click', () => {
        if (currentModel) {
            // Reset scale
            currentModel.scale.set(1, 1, 1);
            scaleInput.value = 1;
            scaleValue.textContent = '1.0';

            // Reset rotation
            currentModel.rotation.set(0, 0, 0);
            rotationXInput.value = 0;
            rotationYInput.value = 0;
            rotationZInput.value = 0;
            rotationXValue.textContent = '0';
            rotationYValue.textContent = '0';
            rotationZValue.textContent = '0';
        }
    });
}

// Helper tools setup
function setupHelperTools() {
    const helperBtn = document.getElementById('helper-btn');
    const helperPanel = document.getElementById('helper-panel');
    const closeBtn = document.getElementById('close-helper-panel');
    const gridToggle = document.getElementById('grid-toggle');
    const axesToggle = document.getElementById('axes-toggle');
    const splitViewToggle = document.getElementById('split-view-toggle');
    const wireframeToggle = document.getElementById('wireframe-toggle');
    const measureToggle = document.getElementById('measure-toggle');
    const splitViewControls = document.getElementById('split-view-controls');
    const splitPositionInput = document.getElementById('split-position');
    const splitPositionValue = document.getElementById('split-position-value');
    const bgControls = document.querySelector('.bg-controls');

    // Store original materials
    let originalMaterials = new Map();

    // Function to store original materials
    function storeOriginalMaterials(model) {
        originalMaterials.clear();
        model.traverse((node) => {
            if (node.isMesh) {
                originalMaterials.set(node, node.material.clone());
            }
        });
    }

    // Function to restore original materials
    function restoreOriginalMaterials() {
        originalMaterials.forEach((material, mesh) => {
            mesh.material = material;
        });
    }

    // Function to create wireframe material
    function createWireframeMaterial(originalMaterial) {
        const wireframeMaterial = originalMaterial.clone();
        wireframeMaterial.wireframe = true;
        wireframeMaterial.transparent = true;
        wireframeMaterial.opacity = 0.5;
        return wireframeMaterial;
    }

    // Toggle helper panel
    helperBtn.addEventListener('click', () => {
        const isActive = helperPanel.classList.contains('active');
        if (isActive) {
            closeAllPanels();
        } else {
            closeAllPanels();
            helperPanel.classList.add('active');
            bgControls.style.display = 'none';
            helperBtn.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        closeAllPanels();
    });

    // Grid helper
    gridToggle.addEventListener('click', () => {
        gridToggle.classList.toggle('active');
        if (gridToggle.classList.contains('active')) {
            if (!gridHelper) {
                gridHelper = new THREE.GridHelper(10, 10);
                scene.add(gridHelper);
            }
        } else {
            if (gridHelper) {
                scene.remove(gridHelper);
                gridHelper = null;
            }
        }
    });

    // Axes helper
    axesToggle.addEventListener('click', () => {
        axesToggle.classList.toggle('active');
        if (axesToggle.classList.contains('active')) {
            if (!axesHelper) {
                axesHelper = new THREE.AxesHelper(5);
                scene.add(axesHelper);
            }
        } else {
            if (axesHelper) {
                scene.remove(axesHelper);
                axesHelper = null;
            }
        }
    });

    // Wireframe toggle
    wireframeToggle.addEventListener('click', () => {
        wireframeToggle.classList.toggle('active');
        isSplitViewActive = false;
        splitViewControls.style.display = 'none';
        
        if (currentModel) {
            if (wireframeToggle.classList.contains('active')) {
                storeOriginalMaterials(currentModel);
                currentModel.traverse((node) => {
                    if (node.isMesh) {
                        node.material.wireframe = true;
                    }
                });
            } else {
                restoreOriginalMaterials();
            }
        }
    });

    // Measure tool
    measureToggle.addEventListener('click', () => {
        measureToggle.classList.toggle('active');
        if (measureToggle.classList.contains('active')) {
            if (!measureHelper) {
                measureHelper = new THREE.AxesHelper(1);
                measureHelper.visible = false;
                scene.add(measureHelper);
            }
        } else {
            if (measureHelper) {
                scene.remove(measureHelper);
                measureHelper = null;
            }
        }
    });

    // Split view toggle
    splitViewToggle.addEventListener('click', () => {
        splitViewToggle.classList.toggle('active');
        wireframeToggle.classList.remove('active');
        isSplitViewActive = splitViewToggle.classList.contains('active');
        splitViewControls.style.display = isSplitViewActive ? 'block' : 'none';
        
        if (!isSplitViewActive) {
            updateSplitView();
        }
    });

    // Split position control
    splitPositionInput.addEventListener('input', (e) => {
        splitPosition = parseInt(e.target.value) / 100;
        splitPositionValue.textContent = `${e.target.value}%`;
        updateSplitView();
    });
}

// Initialize transform controls
setupTransformControls();

// Initialize helper tools
setupHelperTools();

// Material presets configuration
const materialPresets = {
    chrome: {
        type: 'standard',
        color: '#ffffff',
        metalness: 1.0,
        roughness: 0.1,
        opacity: 1.0
    },
    glass: {
        type: 'standard',
        color: '#ffffff',
        metalness: 0.0,
        roughness: 0.0,
        opacity: 0.3
    },
    plastic: {
        type: 'standard',
        color: '#ffffff',
        metalness: 0.0,
        roughness: 0.5,
        opacity: 1.0
    },
    metal: {
        type: 'standard',
        color: '#888888',
        metalness: 0.8,
        roughness: 0.2,
        opacity: 1.0
    }
};

// Material Editor setup
function setupMaterialEditor() {
    const materialBtn = document.getElementById('material-btn');
    const materialPanel = document.getElementById('material-panel');
    const closeBtn = document.getElementById('close-material-panel');
    const materialType = document.getElementById('material-type');
    const materialColor = document.getElementById('material-color');
    const metalnessInput = document.getElementById('metalness');
    const metalnessValue = document.getElementById('metalness-value');
    const roughnessInput = document.getElementById('roughness');
    const roughnessValue = document.getElementById('roughness-value');
    const opacityInput = document.getElementById('opacity');
    const opacityValue = document.getElementById('opacity-value');
    const presetButtons = document.querySelectorAll('.preset-btn');
    const bgControls = document.querySelector('.bg-controls');

    // Toggle material panel
    materialBtn.addEventListener('click', () => {
        const isActive = materialPanel.classList.contains('active');
        if (isActive) {
            closeAllPanels();
        } else {
            closeAllPanels();
            materialPanel.classList.add('active');
            bgControls.style.display = 'none';
            materialBtn.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        closeAllPanels();
    });

    // Update material type
    materialType.addEventListener('change', (e) => {
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node.isMesh) {
                    const currentMaterial = node.material;
                    let newMaterial;

                    switch (e.target.value) {
                        case 'basic':
                            newMaterial = new THREE.MeshBasicMaterial();
                            break;
                        case 'phong':
                            newMaterial = new THREE.MeshPhongMaterial();
                            break;
                        case 'lambert':
                            newMaterial = new THREE.MeshLambertMaterial();
                            break;
                        default:
                            newMaterial = new THREE.MeshStandardMaterial();
                    }

                    // Copy common properties
                    if (currentMaterial.color && newMaterial.color) newMaterial.color.copy(currentMaterial.color);
                    if ('opacity' in currentMaterial) newMaterial.opacity = currentMaterial.opacity;
                    if ('transparent' in currentMaterial) newMaterial.transparent = currentMaterial.transparent;
                    if ('metalness' in newMaterial && 'metalness' in currentMaterial) newMaterial.metalness = currentMaterial.metalness;
                    if ('roughness' in newMaterial && 'roughness' in currentMaterial) newMaterial.roughness = currentMaterial.roughness;

                    // Copy texture maps if they exist
                    const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'bumpMap', 'alphaMap', 'envMap'];
                    maps.forEach(mapName => {
                        if (currentMaterial[mapName]) {
                            newMaterial[mapName] = currentMaterial[mapName];
                        }
                    });

                    // Copy emissive color if present
                    if (currentMaterial.emissive && newMaterial.emissive) {
                        newMaterial.emissive.copy(currentMaterial.emissive);
                    }

                    node.material = newMaterial;
                }
            });
        }
    });

    // Update material color
    materialColor.addEventListener('input', (e) => {
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node.isMesh) {
                    node.material.color.set(e.target.value);
                }
            });
        }
    });

    // Update metalness
    metalnessInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        metalnessValue.textContent = value.toFixed(2);
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node.isMesh && node.material.metalness !== undefined) {
                    node.material.metalness = value;
                }
            });
        }
    });

    // Update roughness
    roughnessInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        roughnessValue.textContent = value.toFixed(2);
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node.isMesh && node.material.roughness !== undefined) {
                    node.material.roughness = value;
                }
            });
        }
    });

    // Update opacity
    opacityInput.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        opacityValue.textContent = value.toFixed(2);
        if (currentModel) {
            currentModel.traverse((node) => {
                if (node.isMesh) {
                    node.material.opacity = value;
                    node.material.transparent = value < 1;
                }
            });
        }
    });

    // Apply material presets
    presetButtons.forEach(button => {
        button.addEventListener('click', () => {
            const preset = materialPresets[button.dataset.preset];
            if (preset && currentModel) {
                // Update UI
                materialType.value = preset.type;
                materialColor.value = preset.color;
                metalnessInput.value = preset.metalness;
                metalnessValue.textContent = preset.metalness.toFixed(2);
                roughnessInput.value = preset.roughness;
                roughnessValue.textContent = preset.roughness.toFixed(2);
                opacityInput.value = preset.opacity;
                opacityValue.textContent = preset.opacity.toFixed(2);

                // Apply to model
                currentModel.traverse((node) => {
                    if (node.isMesh) {
                        let material;
                        switch (preset.type) {
                            case 'basic':
                                material = new THREE.MeshBasicMaterial();
                                break;
                            case 'phong':
                                material = new THREE.MeshPhongMaterial();
                                break;
                            case 'lambert':
                                material = new THREE.MeshLambertMaterial();
                                break;
                            default:
                                material = new THREE.MeshStandardMaterial();
                        }

                        material.color.set(preset.color);
                        material.opacity = preset.opacity;
                        material.transparent = preset.opacity < 1;
                        if (material.metalness !== undefined) {
                            material.metalness = preset.metalness;
                            material.roughness = preset.roughness;
                        }

                        node.material = material;
                    }
                });
            }
        });
    });
}

// Export Options setup
function setupExportOptions() {
    const exportBtn = document.getElementById('export-btn');
    const exportPanel = document.getElementById('export-panel');
    const closeBtn = document.getElementById('close-export-panel');
    const bgControls = document.querySelector('.bg-controls');

    // Toggle export panel
    exportBtn.addEventListener('click', () => {
        const isActive = exportPanel.classList.contains('active');
        if (isActive) {
            closeAllPanels();
        } else {
            closeAllPanels();
            exportPanel.classList.add('active');
            bgControls.style.display = 'none';
            exportBtn.classList.add('active');
        }
    });

    closeBtn.addEventListener('click', () => {
        closeAllPanels();
    });

    // Screenshot functions
    function takeScreenshot(width, height) {
        // Store original size
        const originalWidth = renderer.domElement.width;
        const originalHeight = renderer.domElement.height;

        // Set new size
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        // Hide UI
        const uiElements = document.querySelectorAll('.ui-container, .bg-controls, .material-panel, .export-panel, .camera-panel, .transform-panel, .helper-panel');
        uiElements.forEach(el => el.style.display = 'none');

        // Render
        renderer.render(scene, camera);

        // Take screenshot
        const screenshot = renderer.domElement.toDataURL('image/png');

        // Create download link
        const link = document.createElement('a');
        link.href = screenshot;
        link.download = `screenshot-${width}x${height}.png`;
        link.click();

        // Restore original size
        renderer.setSize(originalWidth, originalHeight);
        camera.aspect = originalWidth / originalHeight;
        camera.updateProjectionMatrix();

        // Show UI
        uiElements.forEach(el => el.style.display = '');
    }

    // Screenshot buttons
    document.getElementById('screenshot-hd').addEventListener('click', () => {
        takeScreenshot(1920, 1080);
    });

    document.getElementById('screenshot-4k').addEventListener('click', () => {
        takeScreenshot(3840, 2160);
    });

    // New custom size screenshot UI
    document.getElementById('screenshot-custom-ui').addEventListener('click', () => {
        const width = parseInt(document.getElementById('custom-screenshot-width').value);
        const height = parseInt(document.getElementById('custom-screenshot-height').value);
        if (width > 0 && height > 0) {
            takeScreenshot(width, height);
        } else {
            alert('Please enter valid width and height.');
        }
    });

    // Export model functions
    document.getElementById('export-glb').addEventListener('click', () => {
        if (currentModel) {
            const exporter = new GLTFExporter();
            const includeAnimation = document.getElementById('export-with-animation').checked;
            const options = {
                binary: true,
                animations: includeAnimation ? animations : []
            };
            
            exporter.parse(scene, function(gltf) {
                const blob = new Blob([gltf], { type: 'application/octet-stream' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'model.glb';
                link.click();
                URL.revokeObjectURL(link.href);
            }, function(error) {
                console.error('An error occurred during GLB export:', error);
                alert('Error exporting GLB file. Please try again.');
            }, options);
        }
    });

    document.getElementById('export-obj').addEventListener('click', () => {
        if (currentModel) {
            const exporter = new OBJExporter();
            // OBJ format doesn't support animations, so we just export the geometry
            const result = exporter.parse(currentModel);
            const blob = new Blob([result], { type: 'text/plain' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'model.obj';
            link.click();
            URL.revokeObjectURL(link.href);
        }
    });

    // Save scene state
    document.getElementById('save-camera').addEventListener('click', () => {
        const cameraState = {
            position: camera.position.toArray(),
            target: controls.target.toArray(),
            fov: camera.fov
        };
        const blob = new Blob([JSON.stringify(cameraState, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'camera-state.json';
        link.click();
    });

    document.getElementById('save-materials').addEventListener('click', () => {
        if (currentModel) {
            const materials = [];
            currentModel.traverse((node) => {
                if (node.isMesh) {
                    materials.push({
                        uuid: node.uuid,
                        type: node.material.type,
                        color: node.material.color.getHexString(),
                        metalness: node.material.metalness,
                        roughness: node.material.roughness,
                        opacity: node.material.opacity
                    });
                }
            });
            const blob = new Blob([JSON.stringify(materials, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'materials.json';
            link.click();
        }
    });

    document.getElementById('save-scene').addEventListener('click', () => {
        if (currentModel) {
            const sceneState = {
                camera: {
                    position: camera.position.toArray(),
                    target: controls.target.toArray(),
                    fov: camera.fov
                },
                model: {
                    position: currentModel.position.toArray(),
                    rotation: currentModel.rotation.toArray(),
                    scale: currentModel.scale.toArray()
                },
                materials: []
            };

            currentModel.traverse((node) => {
                if (node.isMesh) {
                    sceneState.materials.push({
                        uuid: node.uuid,
                        type: node.material.type,
                        color: node.material.color.getHexString(),
                        metalness: node.material.metalness,
                        roughness: node.material.roughness,
                        opacity: node.material.opacity
                    });
                }
            });

            const blob = new Blob([JSON.stringify(sceneState, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'scene-state.json';
            link.click();
        }
    });

    // Import Camera Position
    document.getElementById('import-camera').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data.position && data.target && data.fov) {
                        camera.position.fromArray(data.position);
                        controls.target.fromArray(data.target);
                        camera.fov = data.fov;
                        camera.updateProjectionMatrix();
                        controls.update();
                        alert('Camera position imported!');
                    } else {
                        alert('Invalid camera state file.');
                    }
                } catch (err) {
                    alert('Failed to import camera position.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });

    // Import Full Scene
    document.getElementById('import-scene').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    // Camera
                    if (data.camera && data.camera.position && data.camera.target && data.camera.fov) {
                        camera.position.fromArray(data.camera.position);
                        controls.target.fromArray(data.camera.target);
                        camera.fov = data.camera.fov;
                        camera.updateProjectionMatrix();
                        controls.update();
                    }
                    // Model transform
                    if (data.model && currentModel) {
                        if (data.model.position) currentModel.position.fromArray(data.model.position);
                        if (data.model.rotation) currentModel.rotation.fromArray(data.model.rotation);
                        if (data.model.scale) currentModel.scale.fromArray(data.model.scale);
                    }
                    // Materials
                    if (data.materials && currentModel) {
                        currentModel.traverse((node) => {
                            if (node.isMesh) {
                                const matData = data.materials.find(m => m.uuid === node.uuid);
                                if (matData) {
                                    node.material.color.set(`#${matData.color}`);
                                    if (node.material.metalness !== undefined && matData.metalness !== undefined) node.material.metalness = matData.metalness;
                                    if (node.material.roughness !== undefined && matData.roughness !== undefined) node.material.roughness = matData.roughness;
                                    if (matData.opacity !== undefined) {
                                        node.material.opacity = matData.opacity;
                                        node.material.transparent = matData.opacity < 1;
                                    }
                                }
                            }
                        });
                    }
                    alert('Full scene imported!');
                } catch (err) {
                    alert('Failed to import scene.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

// Initialize material editor and export options
setupMaterialEditor();
setupExportOptions();

// Guide panel functionality
const guideBtn = document.getElementById('guide-btn');
const guidePanel = document.getElementById('guide-panel');
const closeGuidePanel = document.getElementById('close-guide-panel');

guideBtn.addEventListener('click', () => {
    guidePanel.classList.toggle('active');
    guideBtn.classList.toggle('active');
});

closeGuidePanel.addEventListener('click', () => {
    guidePanel.classList.remove('active');
    guideBtn.classList.remove('active');
});

// Background color panel functionality
const bgColorBtn = document.getElementById('bg-color-btn');
const bgColorPanel = document.getElementById('bg-color-panel');
const closeBgColorPanel = document.getElementById('close-bg-color-panel');

bgColorBtn.addEventListener('click', () => {
    bgColorPanel.classList.toggle('active');
    bgColorBtn.classList.toggle('active');
});

closeBgColorPanel.addEventListener('click', () => {
    bgColorPanel.classList.remove('active');
    bgColorBtn.classList.remove('active');
});

// Start animation loop
animate(); 