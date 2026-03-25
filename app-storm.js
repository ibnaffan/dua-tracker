// Paste your Firebase config here!
const firebaseConfig = {
  apiKey: "AIzaSyDbpRlCkuYrHN9Gd01VIw1uH9UuaJLPmAE",
  authDomain: "op-1-tracker.firebaseapp.com",
  projectId: "op-1-tracker",
  storageBucket: "op-1-tracker.firebasestorage.app",
  messagingSenderId: "692591271117",
  appId: "1:692591271117:web:fa2b1ccec5fdd22e541d84",
  measurementId: "G-N4E52W26LS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch(err => console.log("Offline mode error:", err));

// --- 2. STATE VARIABLES ---
let activeToken = localStorage.getItem('dua_activeToken') || null;
let userTarget = 1000000;
let grandTotal = 0;
let dailyCount = 0;
let history = [];
let sheetsQueue = [];
let isWeatherPlaying = false; 

// 🌟 ADVANCED 3D OCEAN VARIABLES
let scene, camera, renderer, oceanGeometry, oceanMesh, oceanWireframe, clock;
let splashParticles, splashGeometry, flashLight;

window.onload = () => {
    changeAudio();
    init3DOcean(); // Fire up the new Ocean Engine
    if (activeToken) { initializeUserData(activeToken); }
};

// --- 3. THE 3D CYBER-OCEAN ENGINE ---
function init3DOcean() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000510, 0.012); 

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 12, 50); 
    camera.lookAt(0, 5, -20);

    let ambient = new THREE.AmbientLight(0x222222);
    scene.add(ambient);

    flashLight = new THREE.PointLight(0x00FFFF, 0, 300);
    flashLight.position.set(0, 30, -40);
    scene.add(flashLight);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const container = document.getElementById("canvas-container");
    if (container) {
        container.innerHTML = ''; 
        container.appendChild(renderer.domElement);
    }

    // THE CHAOTIC OCEAN MESH
    oceanGeometry = new THREE.PlaneGeometry(400, 400, 120, 120);
    oceanGeometry.rotateX(-Math.PI / 2);

    let oceanMaterial = new THREE.MeshPhongMaterial({
        color: 0x000a14, // Stays dark blue forever!
        shininess: 150,
        specular: 0x00FFFF, 
        flatShading: true
    });
    oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
    
    let wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00FFFF, 
        wireframe: true,
        transparent: true,
        opacity: 0.1
    });
    oceanWireframe = new THREE.Mesh(oceanGeometry, wireframeMaterial);

    scene.add(oceanMesh);
    scene.add(oceanWireframe);

    // THE IMPACT SPLASH SYSTEM
    const particleCount = 2000;
    splashGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0; 
        positions[i * 3 + 1] = -100; 
        positions[i * 3 + 2] = 0; 
    }

    splashGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    let splashMaterial = new THREE.PointsMaterial({
        color: 0x00FFFF,
        size: 0.8,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    splashParticles = new THREE.Points(splashGeometry, splashMaterial);
    scene.add(splashParticles);

    clock = new THREE.Clock();
    animateOcean();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function triggerSplash(waveHeight) {
    const positions = splashGeometry.attributes.position.array;
    if (waveHeight > 15) {
        for (let i = 0; i < 300; i++) { 
            const index = Math.floor(Math.random() * (positions.length / 3)) * 3;
            positions[index] = (Math.random() - 0.5) * 60; 
            positions[index + 1] = 5 + Math.random() * 5;  
            positions[index + 2] = 40 + Math.random() * 10; 
        }
    }
}

function animateOcean() {
    requestAnimationFrame(animateOcean);

    const time = clock.getElapsedTime();
    const positions = oceanGeometry.attributes.position;
    let maxLocalWaveHeight = 0;

    const stormMultiplier = isWeatherPlaying ? 3.5 : 0.3; 
    const speedMultiplier = isWeatherPlaying ? 1.5 : 0.5;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);

        const wave1 = Math.sin(x * 0.02 + time * speedMultiplier) * Math.cos(z * 0.02 + time * speedMultiplier) * 4;
        const wave2 = Math.sin(x * 0.05 - time * speedMultiplier * 1.2) * Math.sin(z * 0.04 + time) * 2.5;
        const wave3 = Math.cos(x * 0.1 + z * 0.1 + time * speedMultiplier * 2) * 1.5;
        
        const finalHeight = (wave1 + wave2 + wave3) * stormMultiplier;
        positions.setY(i, finalHeight);

        if (z > 30 && z < 50) {
            if (finalHeight > maxLocalWaveHeight) maxLocalWaveHeight = finalHeight;
        }
    }

    oceanGeometry.attributes.position.needsUpdate = true;
    oceanGeometry.computeVertexNormals(); 

    oceanMesh.position.z += 0.15 * speedMultiplier;
    oceanWireframe.position.z += 0.15 * speedMultiplier;
    if (oceanMesh.position.z > 20) {
        oceanMesh.position.z = 0;
        oceanWireframe.position.z = 0;
    }

    const splashPos = splashGeometry.attributes.position.array;
    for (let i = 0; i < splashPos.length / 3; i++) {
        if (splashPos[i * 3 + 1] > -50) { 
            splashPos[i * 3] += (Math.random() - 0.5) * 0.5; 
            splashPos[i * 3 + 1] -= 0.3; 
            splashPos[i * 3 + 2] += 0.2; 
        }
    }
    splashGeometry.attributes.position.needsUpdate = true;

    if (isWeatherPlaying && Math.random() > 0.95) {
        triggerSplash(maxLocalWaveHeight);
    }

    if (isWeatherPlaying && Math.random() > 0.97) {
        flashLight.intensity = 15 + Math.random() * 20;
        flashLight.position.x = (Math.random() - 0.5) * 150;
        flashLight.position.z = -20 - Math.random() * 50;
    } else {
        flashLight.intensity = Math.max(0, flashLight.intensity - 1.5);
    }

    renderer.render(scene, camera);
}

// --- 4. AUDIO CONTROLS ---
function changeAudio() {
    const audioEl = document.getElementById('quranAudio');
    const selectEl = document.getElementById('reciterSelect');
    if (audioEl && selectEl) { audioEl.src = selectEl.value; }
}

function toggleWeather() {
    const audio = document.getElementById('weatherAudio');
    const btn = document.getElementById('weatherBtn');
    audio.volume = 0.3; 

    if (isWeatherPlaying) {
        audio.pause();
        btn.innerText = "🌧️ AMBIENT STORM: OFF";
        btn.style.color = "#888"; btn.style.borderColor = "#555";
        isWeatherPlaying = false;
    } else {
        audio.play().catch(e => console.log("Audio blocked. Interact with page first."));
        btn.innerText = "🌧️ AMBIENT STORM: ON";
        btn.style.color = "var(--theme-color)"; btn.style.borderColor = "var(--theme-color)";
        isWeatherPlaying = true;
    }
}

// --- 5. GATEKEEPER (LOGIN) ---
document.getElementById("tokenInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") { event.preventDefault(); verifyToken(); }
});

async function verifyToken() {
    const inputToken = document.getElementById('tokenInput').value.trim();
    if (!inputToken) return;

    if (inputToken === "admin-master") {
        localStorage.setItem('dua_activeToken', inputToken);
        initializeUserData(inputToken);
        return; 
    }

    try {
        const docRef = await db.collection("valid_tokens").doc(inputToken).get();
        if (docRef.exists) {
            localStorage.setItem('dua_activeToken', inputToken);
            initializeUserData(inputToken);
        } else {
            document.getElementById('loginError').innerText = "ACCESS DENIED: Invalid Token.";
            document.getElementById('loginError').style.display = 'block';
        }
    } catch (error) {
        if (localStorage.getItem('dua_grandTotal_' + inputToken)) {
            localStorage.setItem('dua_activeToken', inputToken);
            initializeUserData(inputToken);
        } else {
            document.getElementById('loginError').innerText = "NETWORK ERROR: Cannot verify while offline.";
            document.getElementById('loginError').style.display = 'block';
        }
    }
}

function initializeUserData(token) {
    activeToken = token;
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('currentUserDisplay').innerText = token;

    let savedTarget = parseInt(localStorage.getItem('dua_target_' + token));
    userTarget = isNaN(savedTarget) ? 1000000 : savedTarget;

    grandTotal = parseInt(localStorage.getItem('dua_grandTotal_' + token));
    if (isNaN(grandTotal)) {
        grandTotal = (token === "admin-master") ? 1100 : 0; 
        localStorage.setItem('dua_grandTotal_' + token, grandTotal);
    }
    
    history = JSON.parse(localStorage.getItem('dua_history_' + token)) || [];
    sheetsQueue = JSON.parse(localStorage.getItem('dua_sheetsQueue_' + token)) || [];
    updateUI();
}

function logout() { localStorage.removeItem('dua_activeToken'); location.reload(); }

// --- 6. DYNAMIC COLOR SHIFT (FIXED FOR OCEAN) ---
function updateThemeColors(percentage) {
    const root = document.documentElement;
    let currentHex = 0x00FFFF;

    if (percentage < 33) {
        root.style.setProperty('--theme-color', '#00FFFF');
        root.style.setProperty('--theme-glow', 'rgba(0, 255, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(0, 255, 255, 0.1)');
        currentHex = 0x00FFFF;
    } else if (percentage < 66) {
        root.style.setProperty('--theme-color', '#B026FF');
        root.style.setProperty('--theme-glow', 'rgba(176, 38, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(176, 38, 255, 0.1)');
        currentHex = 0xB026FF;
    } else {
        root.style.setProperty('--theme-color', '#FFD700');
        root.style.setProperty('--theme-glow', 'rgba(255, 215, 0, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(255, 215, 0, 0.1)');
        currentHex = 0xFFD700;
    }

    // 🌟 FIXED: We ONLY tint the wireframe, lights, and splashes. The deep ocean stays dark!
    if (oceanWireframe && oceanWireframe.material) {
        oceanWireframe.material.color.setHex(currentHex);
    }
    if (flashLight) flashLight.color.setHex(currentHex);
    if (splashParticles && splashParticles.material) {
        splashParticles.material.color.setHex(currentHex);
    }
}

// --- 7. UI UPDATES & RESET ---
function updateUI() {
    document.getElementById('targetDisplay').innerText = userTarget.toLocaleString();
    document.getElementById('grandTotal').innerText = grandTotal.toLocaleString();
    
    const remaining = Math.max(0, userTarget - grandTotal);
    document.getElementById('leftToGo').innerText = remaining.toLocaleString();
    document.getElementById('dailyCount').innerText = dailyCount.toLocaleString();

    let percentage = (grandTotal / userTarget) * 100;
    if (percentage > 100) percentage = 100; 

    updateThemeColors(percentage);

    const speedFill = document.getElementById('speedFill');
    if (speedFill) { speedFill.style.strokeDashoffset = 283 - (percentage / 100) * 283; }

    const logContainer = document.getElementById('historyLog');
    if (logContainer) {
        logContainer.innerHTML = '';
        history.slice().reverse().forEach(session => {
            const li = document.createElement('li');
            li.innerText = `> ${session.date}: +${session.count.toLocaleString()}`;
            logContainer.appendChild(li);
        });
    }
}

function editTarget() {
    const newTarget = prompt("Enter your new target number:", userTarget);
    if (newTarget !== null) {
        const parsed = parseInt(newTarget);
        if (!isNaN(parsed) && parsed > 0) {
            userTarget = parsed;
            localStorage.setItem('dua_target_' + activeToken, userTarget);
            updateUI();
        }
    }
}

function resetTotal() {
    if (confirm("⚠️ WARNING: Are you sure you want to completely reset your Grand Total to 0?")) {
        grandTotal = 0; 
        dailyCount = 0; 
        localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
        updateUI(); 
    }
}

// --- 8. CORE ACTIONS & BUTTON PARTICLES ---
function recite(event) {
    dailyCount++;
    grandTotal++;
    localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
    updateUI();
    createParticle(event);
}

function createParticle(e) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.innerText = '+1';
    let x, y;
    if (e && (e.clientX || (e.touches && e.touches.length > 0))) {
        x = e.clientX || e.touches[0].clientX;
        y = e.clientY || e.touches[0].clientY;
    } else {
        const btn = document.getElementById('reciteBtn');
        const rect = btn.getBoundingClientRect();
        x = rect.left + rect.width / 2; y = rect.top + rect.height / 2;
    }
    x += (Math.random() - 0.5) * 40; y += (Math.random() - 0.5) * 40;
    particle.style.left = `${x}px`; particle.style.top = `${y}px`;
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
}

function addManual() {
    const inputField = document.getElementById('manualInput');
    const manualAmount = parseInt(inputField.value);
    if (!isNaN(manualAmount) && manualAmount > 0) {
        dailyCount += manualAmount;
        grandTotal += manualAmount;
        localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
        inputField.value = '';
        updateUI();
    }
}

// --- 9. SAVING & SYNCING ---
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyrVqUW7oBnr6Rh9XRGUvAIpcZesRXii213YB0fSfdFk-RsXnKHR0AJDE9nwfY6yJ6k4A/exec";

function saveSession() {
    if (dailyCount === 0) return;
    const newSession = {
        token: activeToken, date: new Date().toLocaleString(),
        count: dailyCount, grandTotal: grandTotal
    };
    history.push(newSession);
    localStorage.setItem('dua_history_' + activeToken, JSON.stringify(history));
    sheetsQueue.push(newSession);
    localStorage.setItem('dua_sheetsQueue_' + activeToken, JSON.stringify(sheetsQueue));
    processSheetsQueue();
    dailyCount = 0;
    updateUI();
}

async function processSheetsQueue() {
    if (!navigator.onLine || sheetsQueue.length === 0) return;
    const sessionToSync = sheetsQueue[0];
    try {
        await fetch(GOOGLE_SHEETS_URL, { method: 'POST', body: JSON.stringify(sessionToSync) });
        sheetsQueue.shift(); 
        localStorage.setItem('dua_sheetsQueue_' + activeToken, JSON.stringify(sheetsQueue));
        if (sheetsQueue.length > 0) processSheetsQueue(); 
    } catch (error) {
        console.log("Offline or Sheets URL missing. Queued for later.");
    }
}
window.addEventListener('online', processSheetsQueue);

// --- 10. CSV EXPORT ---
function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Date,Session Count,Grand Total\n";
    history.forEach(row => { csvContent += `"${row.date}",${row.count},${row.grandTotal || ''}\n`; });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `dua_tracker_backup_${activeToken}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
