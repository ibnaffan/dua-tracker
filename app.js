
// Paste your Firebase config here from Step 2!
const firebaseConfig = {
  apiKey: "AIzaSyDbpRlCkuYrHN9Gd01VIw1uH9UuaJLPmAE",
  authDomain: "op-1-tracker.firebaseapp.com",
  projectId: "op-1-tracker",
  storageBucket: "op-1-tracker.firebasestorage.app",
  messagingSenderId: "692591271117",
  appId: "1:692591271117:web:fa2b1ccec5fdd22e541d84",
  measurementId: "G-N4E52W26LS"
};

//Initialize Firebase (Uncomment when you paste your config)
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

// 🌟 THREE.JS CLOUD VARIABLES
let scene, camera, renderer, cloudParticles = [], flashLight;

window.onload = () => {
    changeAudio();
    init3DClouds(); // Start 3D Engine
    if (activeToken) { initializeUserData(activeToken); }
};

// --- 3. 🌟 ULTRA-REAL 3D CLOUD ENGINE ---
function createCloudTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

function init3DClouds() {
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 1; camera.rotation.x = 1.16; camera.rotation.y = -0.12; camera.rotation.z = 0.27;

    let ambient = new THREE.AmbientLight(0x555555);
    scene.add(ambient);

    // Lightning flash for thunderstorm!
    flashLight = new THREE.PointLight(0x00FFFF, 30, 500, 1.7);
    flashLight.position.set(200,300,100);
    scene.add(flashLight);

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById("canvas-container").appendChild(renderer.domElement);

    let cloudGeo = new THREE.PlaneGeometry(500,500);
    let cloudMaterial = new THREE.MeshLambertMaterial({
        map: createCloudTexture(), transparent: true, opacity: 0.15,
        color: 0x00FFFF, blending: THREE.AdditiveBlending
    });

    for(let p=0; p<40; p++) {
        let cloud = new THREE.Mesh(cloudGeo, cloudMaterial);
        cloud.position.set(Math.random()*800 -400, 500, Math.random()*500 - 450);
        cloud.rotation.x = 1.16; cloud.rotation.y = -0.12; cloud.rotation.z = Math.random()*360;
        cloudParticles.push(cloud);
        scene.add(cloud);
    }
    animateClouds();
}

function animateClouds() {
    cloudParticles.forEach(p => { p.rotation.z -= 0.0015; }); // Slowly rotate 3D fog
    
    // Sync lightning flashes to thunderstorm button!
    if (isWeatherPlaying && Math.random() > 0.96 || flashLight.power > 100) {
        if(flashLight.power < 100) flashLight.position.set(Math.random()*400, 300 + Math.random()*200, 100);
        flashLight.power = 50 + Math.random() * 500;
    } else {
        flashLight.power = 0; // Turn off lightning if storm is off
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animateClouds);
}

// --- 4. AUDIO CONTROLS (BGM Config) ---
function changeAudio() {
    const audioEl = document.getElementById('quranAudio');
    const selectEl = document.getElementById('reciterSelect');
    if (audioEl && selectEl) { audioEl.src = selectEl.value; }
}

function toggleWeather() {
    const audio = document.getElementById('weatherAudio');
    const btn = document.getElementById('weatherBtn');
    
    audio.volume = 0.3; // 🌟 SET TO 30% SO YOU CAN HEAR RECITATION!

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

// --- 6. DYNAMIC COLOR SHIFT ---
function updateThemeColors(percentage) {
    const root = document.documentElement;
    if (percentage < 33) {
        root.style.setProperty('--theme-color', '#00FFFF');
        root.style.setProperty('--theme-glow', 'rgba(0, 255, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(0, 255, 255, 0.1)');
    } else if (percentage < 66) {
        root.style.setProperty('--theme-color', '#B026FF');
        root.style.setProperty('--theme-glow', 'rgba(176, 38, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(176, 38, 255, 0.1)');
    } else {
        root.style.setProperty('--theme-color', '#FFD700');
        root.style.setProperty('--theme-glow', 'rgba(255, 215, 0, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(255, 215, 0, 0.1)');
    }
    
    // Update Cloud color to match theme!
    if (scene) {
        let currentHex = percentage < 33 ? 0x00FFFF : percentage < 66 ? 0xB026FF : 0xFFD700;
        scene.children.forEach(child => {
            if (child.material && child.material.color) child.material.color.setHex(currentHex);
        });
        flashLight.color.setHex(currentHex);
    }
}

// --- 7. UI UPDATES & FIXED RESET ---
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

// 🌟 FIXED RESET BUTTON LOGIC 
function resetTotal() {
    if (confirm("⚠️ WARNING: Are you sure you want to completely reset your Grand Total to 0?")) {
        grandTotal = 0; 
        dailyCount = 0; 
        localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
        updateUI(); 
    }
}

// --- 8. CORE ACTIONS & PARTICLES ---
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
