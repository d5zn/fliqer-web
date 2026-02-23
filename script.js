import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// --- Scene Setup ---
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5; // Boosted exposure

// --- Responsive Scene Helpers ---
// Для мобильной версии используем фиксированный масштаб, чтобы изменения были заметнее
function getMobileScale() {
    return 0.35; // базовый scale для мобилки
}

function updateSceneForViewport() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const isMobile = width < 768;

    // Wider FOV on мобильных, чтобы влезла вся сцена (особенно в Chrome DevTools)
    camera.fov = isMobile ? 58 : 45;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // Base scale (mobile helper или desktop = 1), затем доп. увеличение
    const baseScale = isMobile ? getMobileScale() : 1;
    const targetScale = isMobile ? baseScale * 1.6 : baseScale * 1.2; // мобилка заметно крупнее
    const cameraZ = isMobile ? 8 : 8; // на мобилке камеру тоже подтягиваем ближе

    const mobileYOffset = -0.55; // чуть выше (≈ +30px от текущего положения)

    if (typeof mesh !== 'undefined') {
        mesh.scale.setScalar(targetScale);
        mesh.position.y = isMobile ? mobileYOffset : 0;
    }
    if (typeof shardsGroup !== 'undefined') {
        shardsGroup.scale.setScalar(targetScale);
        shardsGroup.position.y = isMobile ? mobileYOffset : 0;
    }

    camera.position.z = cameraZ;
}

window.addEventListener('resize', updateSceneForViewport);

// --- Environment ---
// Critical for glossy materials to look real
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

// --- Lighting ---
// Key light (Moved to Top-Left, pushed forward)
const rectLight = new THREE.RectAreaLight(0xffffff, 1.25, 10, 10);
rectLight.position.set(-8, 8, 8); // Moved forward (z: 5 -> 8)
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);

// Rim light (White - Top-Right Back)
const spotLight = new THREE.SpotLight(0xffffff, 4.25);
spotLight.position.set(8, 5, -5);
spotLight.angle = 0.6;
spotLight.penumbra = 0.5;
scene.add(spotLight);

// Additional Rim Light (White - Bottom Left) - REMOVED
// const rimLight2 = new THREE.SpotLight(0xffffff, 0.22); 
// rimLight2.position.set(-5, -5, -5);
// rimLight2.lookAt(0, 0, 0);
// scene.add(rimLight2);

// Backlight (Strong Orange Rim) - REMOVED
// const backLight = new THREE.SpotLight(0xFF9B04, 2000); 
// backLight.position.set(0, 3, -2.5);
// backLight.lookAt(0, 0, 0);
// backLight.angle = 1.2;
// backLight.penumbra = 0.4;
// scene.add(backLight);

// Fill Light - REMOVED (to make bottom pitch black)
// const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.075); 
// scene.add(hemiLight);

// Ambient - REMOVED (to make bottom pitch black)
// const ambientLight = new THREE.AmbientLight(0xffffff, 0.0375); 
// scene.add(ambientLight);

// --- Glossy Liquid Sphere ---
// Reduced detail from 128 to 64 for performance
const geometry = new THREE.IcosahedronGeometry(1.7, 64);

// ... (Noise Texture generation remains the same) ...
function createNoiseTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    const imageData = context.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const val = Math.random() * 255;
        data[i] = val;     // r
        data[i + 1] = val;   // g
        data[i + 2] = val;   // b
        data[i + 3] = 255;   // a
    }

    context.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(10, 10);
    return texture;
}

const noiseTexture = createNoiseTexture();

const material = new THREE.MeshPhysicalMaterial({
    color: 0x000000,
    roughness: 0.7,
    roughnessMap: noiseTexture,
    metalness: 0.5,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4,
    envMapIntensity: 0.5,
    bumpMap: noiseTexture,
    bumpScale: 0.01
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// --- Shards Setup (for fracture effect) ---
const shardsGroup = new THREE.Group();
scene.add(shardsGroup);

const shardGeometry = new THREE.IcosahedronGeometry(0.6, 32); // Increased detail for bump map
for (let i = 0; i < 7; i++) {
    const shard = new THREE.Mesh(shardGeometry, material); // Share material for transition

    // Randomize initial properties
    shard.userData = {
        baseScale: 0.5 + Math.random() * 0.5,
        targetPos: new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4
        ).normalize().multiplyScalar(2.5) // Push out to radius ~2.5
    };

    shard.scale.setScalar(0); // Start hidden
    shardsGroup.add(shard);
}

// ... (Particles setup remains similar, maybe reduce count if needed) ...
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 1000; // Reduced from 1400 to 1000

// ... (Rest of particle setup) ...
const posArray = new Float32Array(particlesCount * 3);
const scaleArray = new Float32Array(particlesCount);

for (let i = 0; i < particlesCount * 3; i += 3) {
    posArray[i] = (Math.random() - 0.5) * 30;
    posArray[i + 1] = (Math.random() - 0.5) * 30;
    posArray[i + 2] = (Math.random() - 0.5) * 20 - 5;

    scaleArray[i / 3] = Math.random();
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
particlesGeometry.setAttribute('aScale', new THREE.BufferAttribute(scaleArray, 1));

// ... (Particle Material) ...
function createCircleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');

    context.beginPath();
    context.arc(16, 16, 15, 0, 2 * Math.PI);
    context.fillStyle = 'white';
    context.fill();

    return new THREE.CanvasTexture(canvas);
}

const particlesMaterial = new THREE.PointsMaterial({
    size: 0.15,
    map: createCircleTexture(),
    color: 0xffffff,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    depthWrite: false
});

const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// Ensure scene matches initial viewport
updateSceneForViewport();

const originalParticlePositions = new Float32Array(posArray.length);
originalParticlePositions.set(posArray);

const noise3D = createNoise3D();
const originalPositions = geometry.attributes.position.array.slice();
const v3 = new THREE.Vector3();

// --- Interaction ---
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();

document.addEventListener('mousemove', (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// --- Drag & Drop Logic ---
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file');

if (dropZone && fileInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight(e) {
        dropZone.classList.add('drag-over');
    }

    function unhighlight(e) {
        dropZone.classList.remove('drag-over');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', function () {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const textSpan = dropZone.querySelector('.drop-zone-text');
            const subSpan = dropZone.querySelector('.drop-zone-sub');
            if (textSpan) textSpan.textContent = file.name;
            if (subSpan) subSpan.textContent = 'File attached';
            dropZone.style.borderColor = '#4CAF50'; // Green success border
        }
    }
}

// --- Scroll Interaction ---
let scrollSpeed = 0;
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastScrollY;
    scrollSpeed += delta * 0.0005;
    lastScrollY = currentScrollY;
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    mouse.lerp(targetMouse, 0.1);

    raycaster.setFromCamera(mouse, camera);
    const rayDir = raycaster.ray.direction;
    const rayOrigin = raycaster.ray.origin;

    particlesMesh.rotation.y = time * 0.0125;

    // --- Material Transition Logic ---
    // --- Material Transition Logic ---
    // RE-MAPPED for new section order: Reviews -> Process -> Advantages

    // 1. Explosion/Split (formerly tied to Advantages, now Reviews)
    const explosionSection = document.getElementById('features');
    let progress = 0;

    if (explosionSection) {
        const rect = explosionSection.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const start = windowHeight * 0.8;
        const end = windowHeight * 0.2;

        progress = (start - rect.top) / (start - end);
        progress = Math.max(0, Math.min(1, progress));

        // Target Properties (Titanium)
        const baseColor = new THREE.Color(0x000000);
        material.color.set(baseColor);
        material.metalness = 0.5;
        material.roughness = 0.7;
        material.clearcoat = 0.1;

        // --- Process Section Logic (Ring Formation) ---
        const processSection = document.getElementById('how');
        let processProgress = 0;

        if (processSection) {
            const pRect = processSection.getBoundingClientRect();
            const pStart = windowHeight * 0.8;
            const pEnd = windowHeight * 0.2;
            processProgress = (pStart - pRect.top) / (pStart - pEnd);
            processProgress = Math.max(0, Math.min(1, processProgress));
        }

        // --- Advantages Section Logic (Reassembly) ---
        // (Formerly Reviews logic)
        const reassemblySection = document.getElementById('pricing');
        let reassemblyProgress = 0;

        if (reassemblySection) {
            const rRect = reassemblySection.getBoundingClientRect();
            const rStart = windowHeight * 0.8;
            const rEnd = windowHeight * 0.2;
            reassemblyProgress = (rStart - rRect.top) / (rStart - rEnd);
            reassemblyProgress = Math.max(0, Math.min(1, reassemblyProgress));
        }

        // Scale down main sphere (Explosion/Split), then Scale UP (Reassembly)
        // Logic: 1 -> 0 (Split) -> 1 (Reassemble)

        let targetMainScale = 1;
        if (progress > 0) {
            targetMainScale = THREE.MathUtils.lerp(1, 0, progress);
        }
        if (reassemblyProgress > 0) {
            targetMainScale = THREE.MathUtils.lerp(0, 1, reassemblyProgress);
        }
        mesh.scale.setScalar(targetMainScale);

        // Debug logging
        if (Math.random() < 0.01) {
            console.log('Debug:', { progress, reassemblyProgress, targetMainScale, meshScale: mesh.scale.x });
        }


        // Scale up and move shards
        if (shardsGroup) {
            // Shard Scale: 0 -> 1 (Split) -> 0 (Reassemble)
            let shardScale = THREE.MathUtils.lerp(0, 1, progress);
            if (reassemblyProgress > 0) {
                shardScale = THREE.MathUtils.lerp(1, 0, reassemblyProgress);
            }

            shardsGroup.children.forEach((shard, i) => {
                shard.scale.setScalar(shardScale * shard.userData.baseScale);

                // 1. Calculate Exploded Position (Split)
                const explodedPos = shard.userData.targetPos;

                // 2. Calculate Ring Position (Process) - Horizontal (XZ plane)
                const angle = (i / 7) * Math.PI * 2;
                const radius = 2.5;
                const ringPos = new THREE.Vector3(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );

                // 3. Determine Final Target Position
                const currentTarget = new THREE.Vector3();

                if (reassemblyProgress > 0) {
                    // Transition: Ring -> Center (Reassemble)
                    currentTarget.lerpVectors(ringPos, new THREE.Vector3(0, 0, 0), reassemblyProgress);
                }
                else if (processProgress > 0) {
                    // Transition: Exploded -> Ring
                    currentTarget.lerpVectors(explodedPos, ringPos, processProgress);
                } else {
                    // Transition: Center -> Exploded
                    currentTarget.lerpVectors(new THREE.Vector3(0, 0, 0), explodedPos, progress);
                }

                shard.position.copy(currentTarget);

                // Rotate shards for dynamic effect
                shard.rotation.x += 0.01;
                shard.rotation.y += 0.01;
            });

            // Rotate the whole group
            shardsGroup.rotation.y += 0.005;

            // Tilt the group 45 degrees on X axis when in process section
            // Reset tilt when reassembling

            if (reassemblyProgress > 0) {
                shardsGroup.rotation.x = THREE.MathUtils.lerp(Math.PI / 4, 0, reassemblyProgress);
            } else {
                shardsGroup.rotation.x = THREE.MathUtils.lerp(0, Math.PI / 4, processProgress);
            }
        }

        // --- Review Cards Animation (Fan -> Grid) ---
        // REMOVED: Cards are now in a static grid layout
        const reviewCards = document.querySelectorAll('.review-card');
        if (reviewCards.length > 0) {
            reviewCards.forEach(card => {
                card.style.transform = ''; // Clear any JS-applied transforms
            });
        }
    }

    const particlePositions = particlesGeometry.attributes.position.array;

    for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;

        const floatX = Math.sin(time * 0.075 + originalParticlePositions[i3 + 1]) * 0.05;
        const floatY = Math.cos(time * 0.05 + originalParticlePositions[i3]) * 0.05;

        let px = particlePositions[i3];
        let py = particlePositions[i3 + 1];
        let pz = particlePositions[i3 + 2];

        // Simplified repulsion (removed heavy math if possible, but keeping basic logic)
        // ... (Keep existing repulsion logic but it's O(N) so it's okay for 1000 particles) ...
        const vOPx = px - rayOrigin.x;
        const vOPy = py - rayOrigin.y;
        const vOPz = pz - rayOrigin.z;
        const dot = vOPx * rayDir.x + vOPy * rayDir.y + vOPz * rayDir.z;
        const closestX = rayOrigin.x + rayDir.x * dot;
        const closestY = rayOrigin.y + rayDir.y * dot;
        const closestZ = rayOrigin.z + rayDir.z * dot;
        const dx = px - closestX;
        const dy = py - closestY;
        const dz = pz - closestZ;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < 4.0) {
            const dist = Math.sqrt(distSq);
            const force = (2.0 - dist) * 0.1;
            px += (dx / dist) * force;
            py += (dy / dist) * force;
            pz += (dz / dist) * force;
        }

        const ox = originalParticlePositions[i3] + floatX;
        const oy = originalParticlePositions[i3 + 1] + floatY;
        const oz = originalParticlePositions[i3 + 2];

        px += (ox - px) * 0.05;
        py += (oy - py) * 0.05;
        pz += (oz - pz) * 0.05;

        particlePositions[i3] = px;
        particlePositions[i3 + 1] = py;
        particlePositions[i3 + 2] = pz;
    }
    particlesGeometry.attributes.position.needsUpdate = true;

    scrollSpeed *= 0.95;
    mesh.rotation.y += 0.002 + scrollSpeed;
    mesh.rotation.z += 0.001;

    const positions = geometry.attributes.position.array;

    // Optimization: Update noise less frequently or use simpler noise?
    // For now, reducing vertex count (done above) is the biggest win.
    for (let i = 0; i < positions.length; i += 3) {
        v3.set(originalPositions[i], originalPositions[i + 1], originalPositions[i + 2]);
        const dir = v3.clone().normalize();
        const noise = noise3D(dir.x * 1.0 + time * 0.022, dir.y * 1.0 + time * 0.022, dir.z * 1.0);
        const displacement = 1 + noise * 0.2;
        v3.multiplyScalar(displacement);
        positions[i] = v3.x;
        positions[i + 1] = v3.y;
        positions[i + 2] = v3.z;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();

    // --- Footer Parallax (Canvas locks to 'addicted' text when centered) ---
    const footerBrand = document.querySelector('.footer-brand');
    if (footerBrand) {
        const bRect = footerBrand.getBoundingClientRect();
        const viewHeight = window.innerHeight;
        const brandCenter = bRect.top + bRect.height / 2;
        const screenCenter = viewHeight / 2;

        // Calculate difference between brand center and screen center
        const delta = brandCenter - screenCenter;

        // Smooth locking: use a threshold zone for gradual transition
        const threshold = 150; // Increased threshold for smoother transition

        if (Math.abs(delta) < threshold) {
            // When near center, gradually lock canvas to brand position
            // Use easing for smooth transition
            const progress = Math.abs(delta) / threshold;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
            const targetDelta = delta * (1 - easedProgress * 0.3); // Gradual lock
            canvas.style.transform = `translateY(${targetDelta}px)`;
        } else if (delta < 0) {
            // If brand is above center, lock canvas to it smoothly
            const lockAmount = Math.min(Math.abs(delta) / viewHeight, 1) * delta;
            canvas.style.transform = `translateY(${lockAmount}px)`;
        } else {
            // If brand is below center, smoothly reset canvas
            canvas.style.transform = 'none';
        }
    }

    renderer.render(scene, camera);
}

animate();

// --- Text Hover Effect (Optimized) ---
const headings = document.querySelectorAll('h1, h2');
let hoverChars = [];

// Initialize chars
// Initialize chars
headings.forEach(heading => {
    // Skip footer brand to avoid clipping issues with large italic text
    if (heading.classList.contains('footer-brand')) return;

    const textNodes = Array.from(heading.childNodes);
    const newContent = document.createDocumentFragment();

    textNodes.forEach(node => {
        if (node.nodeType === 3) {
            const text = node.textContent;
            for (let char of text) {
                if (char === ' ') {
                    newContent.appendChild(document.createTextNode(' '));
                } else {
                    const span = document.createElement('span');
                    span.textContent = char;
                    span.className = 'hover-char';
                    newContent.appendChild(span);
                }
            }
        } else {
            newContent.appendChild(node.cloneNode(true));
        }
    });

    heading.innerHTML = '';
    heading.appendChild(newContent);

    // Add new spans to the global array
    const spans = Array.from(heading.querySelectorAll('.hover-char'));

    // Store span + cached position
    spans.forEach(span => {
        hoverChars.push({
            element: span,
            rect: span.getBoundingClientRect() // Cache initial position
        });
    });
});

// Function to update gradient positions
function updateGradientPositions() {
    headings.forEach(heading => {
        const headingRect = heading.getBoundingClientRect();
        const spans = heading.querySelectorAll('.hover-char');

        spans.forEach(span => {
            const spanRect = span.getBoundingClientRect();
            const leftOffset = spanRect.left - headingRect.left;

            span.style.setProperty('--heading-width', `${headingRect.width}px`);
            span.style.setProperty('--char-left', `${leftOffset}px`);
        });
    });
}

// Initial calculation
updateGradientPositions();

// Update cached positions on resize
window.addEventListener('resize', () => {
    // Update hover effect cache
    hoverChars.forEach(charObj => {
        charObj.rect = charObj.element.getBoundingClientRect();
    });

    // Update gradient positions
    updateGradientPositions();
});

// Throttled Mouse Move
let mouseX = 0, mouseY = 0;
let isTextHoverScheduled = false;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isTextHoverScheduled) {
        requestAnimationFrame(() => {
            const radius = 50;
            const maxBlur = 5;

            hoverChars.forEach(charObj => {
                // Use cached rect
                const rect = charObj.rect;
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Simple bounding box check first for speed
                if (Math.abs(mouseX - centerX) > radius || Math.abs(mouseY - centerY) > radius) {
                    if (charObj.element.style.filter !== 'blur(0px)') {
                        charObj.element.style.filter = 'blur(0px)';
                    }
                    return;
                }

                const dist = Math.hypot(mouseX - centerX, mouseY - centerY);

                if (dist < radius) {
                    const blurAmount = (1 - dist / radius) * maxBlur;
                    charObj.element.style.filter = `blur(${blurAmount}px)`;
                } else {
                    charObj.element.style.filter = 'blur(0px)';
                }
            });
            isTextHoverScheduled = false;
        });
        isTextHoverScheduled = true;
    }
});

// --- Scroll Reveal Animation ---
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, {
    threshold: 0.2,
    rootMargin: "0px 0px -300px 0px" // Increased negative margin (was -150px) to trigger even higher up
});

document.querySelectorAll('.section, .hero-content').forEach(el => {
    el.classList.add('reveal-on-scroll');
    revealObserver.observe(el);
});

// --- Nav Button Scroll Interaction (desktop "Work with us") ---
const heroBtn = document.querySelector('.hero .btn-primary');
const navBtn = document.querySelector('.nav-menu-desktop .nav-cta');

if (heroBtn && navBtn) {
    const formSection = document.getElementById('application-form');
    let isHeroVisible = true;
    let isFormVisible = false;

    const updateNavBtn = () => {
        // Button is filled if Hero is NOT visible AND Form is NOT visible
        if (!isHeroVisible && !isFormVisible) {
            navBtn.classList.add('filled');
        } else {
            navBtn.classList.remove('filled');
        }
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.target === heroBtn) {
                isHeroVisible = entry.isIntersecting;
            } else if (entry.target === formSection) {
                isFormVisible = entry.isIntersecting;
            }
        });
        updateNavBtn();
    }, {
        threshold: 0
    });

    observer.observe(heroBtn);
    if (formSection) {
        observer.observe(formSection);
    }
}

// --- Glass Card Glow Effect ---
// --- Glass Card Glow Effect ---
document.querySelectorAll('.glass-card, nav').forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// --- Resize ---
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
});

// --- Mobile Menu Toggle ---
function initMobileMenu() {
    const burgerBtn = document.querySelector('.burger-menu');
    const navMenu = document.querySelector('.nav-menu');
    if (!burgerBtn || !navMenu) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    function closeMenu() {
        burgerBtn.classList.remove('active');
        navMenu.classList.remove('active');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    }

    function toggleMenu() {
        burgerBtn.classList.toggle('active');
        navMenu.classList.toggle('active');
        backdrop.classList.toggle('active', navMenu.classList.contains('active'));
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    }

    burgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleMenu();
    });
    burgerBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleMenu();
    }, { passive: false });

    backdrop.addEventListener('click', closeMenu);
    backdrop.addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeMenu();
    }, { passive: false });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}
// --- Drum Pad Sounds (Web Audio API) ---
// Можно отключить звуки / интерактивность в блоке услуг, выставив этот флаг в false
const ENABLE_SERVICE_SOUNDS = true;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playDrumSound(index) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const t = audioCtx.currentTime;

    switch (index) {
        case 0: // Kick (Deep, Punchy) - Q
            const kickOsc = audioCtx.createOscillator();
            const kickGain = audioCtx.createGain();
            kickOsc.frequency.setValueAtTime(120, t);
            kickOsc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
            kickGain.gain.setValueAtTime(1, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
            kickOsc.connect(kickGain);
            kickGain.connect(audioCtx.destination);
            kickOsc.start(t);
            kickOsc.stop(t + 0.5);
            break;

        case 1: // Snare (Crisp, Tight) - W
            const snareNoise = audioCtx.createBufferSource();
            const snareBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.2, audioCtx.sampleRate);
            const snareData = snareBuffer.getChannelData(0);
            for (let i = 0; i < snareBuffer.length; i++) snareData[i] = Math.random() * 2 - 1;
            snareNoise.buffer = snareBuffer;
            const snareFilter = audioCtx.createBiquadFilter();
            snareFilter.type = 'highpass';
            snareFilter.frequency.value = 1500;
            const snareGain = audioCtx.createGain();
            snareGain.gain.setValueAtTime(0.8, t);
            snareGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            snareNoise.connect(snareFilter);
            snareFilter.connect(snareGain);
            snareGain.connect(audioCtx.destination);
            snareNoise.start(t);

            const snareOsc = audioCtx.createOscillator();
            snareOsc.type = 'triangle';
            const snareOscGain = audioCtx.createGain();
            snareOsc.frequency.setValueAtTime(200, t);
            snareOscGain.gain.setValueAtTime(0.4, t);
            snareOscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            snareOsc.connect(snareOscGain);
            snareOscGain.connect(audioCtx.destination);
            snareOsc.start(t);
            snareOsc.stop(t + 0.1);
            break;

        case 2: // Hi-Hat (Short, Closed) - E
            const hatBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.05, audioCtx.sampleRate);
            const hatData = hatBuffer.getChannelData(0);
            for (let i = 0; i < hatBuffer.length; i++) hatData[i] = Math.random() * 2 - 1;
            const hatNoise = audioCtx.createBufferSource();
            hatNoise.buffer = hatBuffer;
            const hatFilter = audioCtx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.value = 8000;
            const hatGain = audioCtx.createGain();
            hatGain.gain.setValueAtTime(0.4, t);
            hatGain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            hatNoise.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(audioCtx.destination);
            hatNoise.start(t);
            break;

        case 3: // Bass (Deep Sine) - Branding (A)
            const bassOsc = audioCtx.createOscillator();
            const bassGain = audioCtx.createGain();
            bassOsc.type = 'sine';
            bassOsc.frequency.setValueAtTime(60, t);
            bassOsc.frequency.exponentialRampToValueAtTime(40, t + 0.4);

            bassGain.gain.setValueAtTime(0.8, t);
            bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

            bassOsc.connect(bassGain);
            bassGain.connect(audioCtx.destination);
            bassOsc.start(t);
            bassOsc.stop(t + 0.4);
            break;

        case 4: // Open Hat (Longer, Metallic) - Automation (S)
            const openHatBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate);
            const openHatData = openHatBuffer.getChannelData(0);
            for (let i = 0; i < openHatBuffer.length; i++) openHatData[i] = Math.random() * 2 - 1;
            const openHatNoise = audioCtx.createBufferSource();
            openHatNoise.buffer = openHatBuffer;
            const openHatFilter = audioCtx.createBiquadFilter();
            openHatFilter.type = 'highpass';
            openHatFilter.frequency.value = 6000;
            const openHatGain = audioCtx.createGain();
            openHatGain.gain.setValueAtTime(0.4, t);
            openHatGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
            openHatNoise.connect(openHatFilter);
            openHatFilter.connect(openHatGain);
            openHatGain.connect(audioCtx.destination);
            openHatNoise.start(t);
            break;

        case 5: // Pluck (Scott Storch Style) - Consulting (D)
            const pluckOsc = audioCtx.createOscillator();
            const pluckGain = audioCtx.createGain();
            pluckOsc.type = 'sawtooth';
            pluckOsc.frequency.setValueAtTime(440, t); // A4

            const pluckFilter = audioCtx.createBiquadFilter();
            pluckFilter.type = 'lowpass';
            pluckFilter.frequency.setValueAtTime(2000, t);
            pluckFilter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

            pluckGain.gain.setValueAtTime(0.3, t);
            pluckGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

            pluckOsc.connect(pluckFilter);
            pluckFilter.connect(pluckGain);
            pluckGain.connect(audioCtx.destination);
            pluckOsc.start(t);
            pluckOsc.stop(t + 0.3);
            break;
    }
}

// --- Visibility Check for Sounds ---
let isServicesVisible = false;
const servicesSection = document.getElementById('services');

if (servicesSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isServicesVisible = entry.isIntersecting;
        });
    }, { threshold: 0.2 }); // 20% visibility required
    observer.observe(servicesSection);
}

// Helper to check if sound should play
function canPlaySound() {
    const isPopupOpen = document.getElementById('popup-overlay')?.classList.contains('active');
    return isServicesVisible && !isPopupOpen;
}

if (ENABLE_SERVICE_SOUNDS) {
    document.querySelectorAll('.service-icon-wrapper').forEach((wrapper, index) => {
        wrapper.addEventListener('mousedown', () => {
            if (canPlaySound()) {
                playDrumSound(index);
            }
        });
    });

    // --- Keyboard Binding (Q, W, E, A, S, D) ---
    const keyMap = {
        'q': 0,
        'w': 1,
        'e': 2,
        'a': 3,
        's': 4,
        'd': 5
    };

    document.addEventListener('keydown', (e) => {
        if (e.repeat) return; // Prevent repeat on hold

        if (keyMap.hasOwnProperty(e.key.toLowerCase())) {
            const index = keyMap[e.key.toLowerCase()];
            const wrappers = document.querySelectorAll('.service-icon-wrapper');

            if (wrappers[index] && canPlaySound()) {
                playDrumSound(index);
                wrappers[index].classList.add('active-key');
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (keyMap.hasOwnProperty(e.key.toLowerCase())) {
            const index = keyMap[e.key.toLowerCase()];
            const wrappers = document.querySelectorAll('.service-icon-wrapper');

            if (wrappers[index]) {
                wrappers[index].classList.remove('active-key');
            }
        }
    });
}


// --- Popup Form Logic ---
const popupOverlay = document.getElementById('popup-overlay');
const popupCloseBtn = document.getElementById('popup-close');
const workWithUsBtns = document.querySelectorAll('.nav-cta, .footer-cta, #hero-btn'); // Select nav, footer, and hero buttons
const popupForm = document.getElementById('project-form');

// Open Popup
workWithUsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent anchor navigation
        popupOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    });
});

// Close Popup Function
const closePopup = () => {
    popupOverlay.classList.remove('active');
    document.body.style.overflow = '';
};

// Close on Button Click
if (popupCloseBtn) {
    popupCloseBtn.addEventListener('click', closePopup);
}

// Close on Overlay Click (Outside content)
if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
}

// Close on ESC Key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popupOverlay.classList.contains('active')) {
        closePopup();
    }
});

// Popup Drag & Drop
const popupDropZone = document.getElementById('popup-drop-zone');
const popupFileInput = document.getElementById('popup-file');

if (popupDropZone && popupFileInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, () => {
            popupDropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        popupDropZone.addEventListener(eventName, () => {
            popupDropZone.classList.remove('drag-over');
        }, false);
    });

    popupDropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handlePopupFiles(files);
    }, false);

    popupDropZone.addEventListener('click', () => {
        popupFileInput.click();
    });

    popupFileInput.addEventListener('change', function () {
        handlePopupFiles(this.files);
    });

    function handlePopupFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            const textSpan = popupDropZone.querySelector('.drop-zone-text');
            const subSpan = popupDropZone.querySelector('.drop-zone-sub');
            const mobileButton = document.getElementById('mobile-file-button');

            if (textSpan) textSpan.textContent = file.name;
            if (subSpan) subSpan.textContent = 'File attached';

            popupDropZone.style.borderColor = '#FF9B04';
            popupDropZone.style.background = 'rgba(255, 155, 4, 0.1)';

            // Обновляем текст кнопки на мобилке
            if (mobileButton) {
                const buttonSpan = mobileButton.querySelector('span');
                if (buttonSpan) buttonSpan.textContent = file.name;
                mobileButton.style.borderColor = '#FF9B04';
                mobileButton.style.background = 'rgba(255, 155, 4, 0.1)';
            }
        }
    }
}

// Form Submission
// --- Resend API Configuration ---
// API endpoint for sending emails via Resend
const API_ENDPOINT = '/api/send-email';

// Helper function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            // Remove data URL prefix (data:image/png;base64,)
            const base64 = reader.result.split(',')[1];
            resolve({ data: base64, name: file.name, type: file.type });
        };
        reader.onerror = error => reject(error);
    });
}

if (popupForm) {
    popupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = popupForm.querySelector('button[type="submit"]');
        const originalText = btn ? btn.textContent : 'Send Request';

        if (btn) {
            btn.textContent = 'Sending...';
            btn.disabled = true;
        }

        try {
            // Get form data
            const formData = {
                projectType: document.getElementById('project-type').value,
                companyName: document.getElementById('company-name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value,
            };

            // Handle attachment if present
            const fileInput = document.getElementById('popup-file');
            let attachment = null;

            if (fileInput && fileInput.files && fileInput.files.length > 0) {
                try {
                    attachment = await fileToBase64(fileInput.files[0]);
                } catch (error) {
                    console.warn('Failed to process attachment:', error);
                }
            }

            // Send to API
            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    ...(attachment && { attachment }),
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to send email');
            }

            // Success
            if (btn) {
                btn.textContent = 'Sent!';
                btn.style.background = '#4CAF50';
                btn.style.borderColor = '#4CAF50';
            }

            setTimeout(() => {
                closePopup();
                // Reset form after delay
                setTimeout(() => {
                    popupForm.reset();
                    if (btn) {
                        btn.textContent = originalText;
                        btn.style.background = '';
                        btn.style.borderColor = '';
                        btn.disabled = false;
                    }

                    if (popupDropZone) {
                        const textSpan = popupDropZone.querySelector('.drop-zone-text');
                        const subSpan = popupDropZone.querySelector('.drop-zone-sub');
                        if (textSpan) textSpan.textContent = 'Drag & drop files';
                        if (subSpan) subSpan.textContent = 'or click to browse';
                        popupDropZone.style.borderColor = '';
                        popupDropZone.style.background = '';
                    }

                    // Сбрасываем кнопку на мобилке
                    const mobileButton = document.getElementById('mobile-file-button');
                    if (mobileButton) {
                        const buttonSpan = mobileButton.querySelector('span');
                        if (buttonSpan) buttonSpan.textContent = 'Attach file';
                        mobileButton.style.borderColor = '';
                        mobileButton.style.background = '';
                    }

                    // Reset file input
                    if (fileInput) {
                        fileInput.value = '';
                    }
                }, 500);
            }, 1500);
        } catch (error) {
            // Error
            console.error('Email sending error:', error);
            if (btn) {
                btn.textContent = 'Error';
                btn.style.background = '#ff4444';
                btn.style.borderColor = '#ff4444';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                    btn.style.borderColor = '';
                    btn.disabled = false;
                }, 3000);
            }

            alert('Failed to send message. Please try again later.');
        }
    });
}

// --- Multi-language Support ---
const translations = {
    en: {
        'nav.cases': 'Cases',
        'nav.service': 'Service',
        'nav.agency': 'Agency',
        'nav.contact': 'Contact',
        'nav.cta': 'Work with us',
        'hero.badge': 'Creative Design & Develop Agency',
        'hero.title': 'We breathe life into<br>digital products',
        'hero.subtitle': 'We build immersive web experiences and scalable design systems for ambitious brands',
        'hero.cta_start': 'Start a project',
        'hero.cta_view': 'View our work'
    },
    ru: {
        'nav.cases': 'Кейсы',
        'nav.service': 'Услуги',
        'nav.agency': 'Агентство',
        'nav.contact': 'Контакты',
        'nav.cta': 'Работать с нами',
        'hero.badge': 'Креативное агентство дизайна и разработки',
        'hero.title': 'Вдыхаем жизнь в<br>цифровые продукты',
        'hero.subtitle': 'Создаем захватывающие веб-интерфейсы и масштабируемые дизайн-системы для амбициозных брендов',
        'hero.cta_start': 'Начать проект',
        'hero.cta_view': 'Смотреть работы'
    }
};

function setLanguage(lang) {
    // Save preference
    localStorage.setItem('landing_preferred_language', lang);
    document.documentElement.lang = lang;

    // Update texts
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    // Update active state on buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Initialize language switcher
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const lang = e.target.getAttribute('data-lang');
        setLanguage(lang);
    });
});

// Load preferred language or default to 'en'
const userLang = localStorage.getItem('landing_preferred_language') || 'en';
setLanguage(userLang);
