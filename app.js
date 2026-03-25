
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

// --- 1. STATE VARIABLES ---
let activeToken = localStorage.getItem('dua_activeToken') || null;
let userTarget = 1000000;
let grandTotal = 0;
let dailyCount = 0;
let history = [];
let sheetsQueue = [];

// --- 2. INITIALIZATION ---
window.onload = () => {
    changeAudio(); // Load the default audio stream
    if (activeToken) {
        initializeUserData(activeToken);
    }
};

function changeAudio() {
    const audioEl = document.getElementById('quranAudio');
    const selectEl = document.getElementById('reciterSelect');
    if (audioEl && selectEl) {
        audioEl.src = selectEl.value;
    }
}

// --- 3. GATEKEEPER (LOGIN) ---
async function verifyToken() {
    const inputToken = document.getElementById('tokenInput').value.trim();
    if (!inputToken) return;

    // The hidden backdoor! Valid tokens:
    if (inputToken === "admin-master" || inputToken === "guest-01") {
        localStorage.setItem('dua_activeToken', inputToken);
        initializeUserData(inputToken);
        return; 
    }

    // NEW: Generic error so others don't know the master token
    const errorEl = document.getElementById('loginError');
    errorEl.innerText = "ACCESS DENIED: Invalid Token.";
    errorEl.style.display = 'block';
}

function initializeUserData(token) {
    activeToken = token;
    
    // Hide login screen, reveal dashboard
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('currentUserDisplay').innerText = token;

    // Load User Target
    let savedTarget = parseInt(localStorage.getItem('dua_target_' + token));
    userTarget = isNaN(savedTarget) ? 1000000 : savedTarget;

    // Load Grand Total
    grandTotal = parseInt(localStorage.getItem('dua_grandTotal_' + token));
    if (isNaN(grandTotal)) {
        grandTotal = (token === "admin-master") ? 1100 : 0; 
        localStorage.setItem('dua_grandTotal_' + token, grandTotal);
    }
    
    history = JSON.parse(localStorage.getItem('dua_history_' + token)) || [];
    sheetsQueue = JSON.parse(localStorage.getItem('dua_sheetsQueue_' + token)) || [];
    
    updateUI();
}

function logout() {
    localStorage.removeItem('dua_activeToken');
    location.reload(); 
}

// --- 4. DYNAMIC COLOR SHIFT ENGINE ---
function updateThemeColors(percentage) {
    const root = document.documentElement;
    
    if (percentage < 33) {
        // Neon Cyan
        root.style.setProperty('--theme-color', '#00FFFF');
        root.style.setProperty('--theme-glow', 'rgba(0, 255, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(0, 255, 255, 0.1)');
    } else if (percentage < 66) {
        // Neon Purple
        root.style.setProperty('--theme-color', '#B026FF');
        root.style.setProperty('--theme-glow', 'rgba(176, 38, 255, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(176, 38, 255, 0.1)');
    } else {
        // Neon Gold
        root.style.setProperty('--theme-color', '#FFD700');
        root.style.setProperty('--theme-glow', 'rgba(255, 215, 0, 0.5)');
        root.style.setProperty('--theme-bg', 'rgba(255, 215, 0, 0.1)');
    }
}

// --- 5. DASHBOARD UI UPDATES ---
function updateUI() {
    document.getElementById('targetDisplay').innerText = userTarget.toLocaleString();
    document.getElementById('grandTotal').innerText = grandTotal.toLocaleString();
    
    // Ensure "Left to Go" doesn't go negative
    const remaining = Math.max(0, userTarget - grandTotal);
    document.getElementById('leftToGo').innerText = remaining.toLocaleString();
    document.getElementById('dailyCount').innerText = dailyCount.toLocaleString();

    // Math for SVG Speedometer & Colors
    let percentage = (grandTotal / userTarget) * 100;
    if (percentage > 100) percentage = 100; 

    updateThemeColors(percentage);

    // Speedometer Fill Math
    const speedFill = document.getElementById('speedFill');
    if (speedFill) {
        const strokeOffset = 283 - (percentage / 100) * 283;
        speedFill.style.strokeDashoffset = strokeOffset;
    }

    // Render History
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

// --- 6. CORE ACTIONS ---
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

function recite() {
    dailyCount++;
    grandTotal++;
    localStorage.setItem('dua_grandTotal_' + activeToken, grandTotal);
    updateUI();
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
