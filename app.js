
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
let isWeatherPlaying = false; // Tracks storm audio

window.onload = () => {
    changeAudio();
    if (activeToken) { initializeUserData(activeToken); }
};

// --- AUDIO CONTROLS ---
function changeAudio() {
    const audioEl = document.getElementById('quranAudio');
    const selectEl = document.getElementById('reciterSelect');
    if (audioEl && selectEl) { audioEl.src = selectEl.value; }
}

function toggleWeather() {
    const audio = document.getElementById('weatherAudio');
    const btn = document.getElementById('weatherBtn');
    if (isWeatherPlaying) {
        audio.pause();
        btn.innerText = "🌧️ AMBIENT STORM: OFF";
        btn.style.color = "#888"; btn.style.borderColor = "#555";
        isWeatherPlaying = false;
    } else {
        audio.play();
        btn.innerText = "🌧️ AMBIENT STORM: ON";
        btn.style.color = "var(--theme-color)"; btn.style.borderColor = "var(--theme-color)";
        isWeatherPlaying = true;
    }
}

// --- 3. GATEKEEPER (LOGIN) ---
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

// --- 4. DYNAMIC COLOR SHIFT ---
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
}

// --- 5. UI UPDATES & RESET ---
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
    const newTarget = prompt("Enter your new target number (e.g., 500000):", userTarget);
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
    if (confirm("⚠️ WARNING: Are you sure you want to completely reset your Grand Total back to 0?")) {
        grandTotal = 0;
        localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
        updateUI();
    }
}

// --- 6. CORE ACTIONS & PARTICLES ---
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
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
    }

    x += (Math.random() - 0.5) * 40;
    y += (Math.random() - 0.5) * 40;

    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
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

// --- 7. SAVING & SYNCING ---
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyrVqUW7oBnr6Rh9XRGUvAIpcZesRXii213YB0fSfdFk-RsXnKHR0AJDE9nwfY6yJ6k4A/exec";

function saveSession() {
    if (dailyCount === 0) return;

    const newSession = {
        token: activeToken, 
        date: new Date().toLocaleString(),
        count: dailyCount,
        grandTotal: grandTotal
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
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify(sessionToSync)
        });
        sheetsQueue.shift(); 
        localStorage.setItem('dua_sheetsQueue_' + activeToken, JSON.stringify(sheetsQueue));
        if (sheetsQueue.length > 0) processSheetsQueue(); 
    } catch (error) {
        console.log("Offline or Sheets URL missing. Queued for later.");
    }
}
window.addEventListener('online', processSheetsQueue);

// --- 8. CSV EXPORT ---
function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Date,Session Count,Grand Total\n";
    history.forEach(row => {
        csvContent += `"${row.date}",${row.count},${row.grandTotal || ''}\n`;
    });
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `dua_tracker_backup_${activeToken}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
