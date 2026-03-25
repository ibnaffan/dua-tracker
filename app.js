
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

Initialize Firebase (Uncomment when you paste your config)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.enablePersistence().catch(err => console.log("Offline mode error:", err));

// --- 2. MULTI-USER STATE ---
let activeToken = localStorage.getItem('dua_activeToken') || null;
const TARGET = 1000000;
let grandTotal = 0;
let dailyCount = 0;
let history = [];
let sheetsQueue = [];

// Check if already logged in on page load
window.onload = () => {
    if (activeToken) {
        initializeUserData(activeToken);
    }
};

// --- 3. THE GATEKEEPER LOGIC ---
async function verifyToken() {
    const inputToken = document.getElementById('tokenInput').value.trim();
    if (!inputToken) return;

    try {
        // Check Firebase to see if this token exists in the "valid_tokens" list
        const docRef = await db.collection("valid_tokens").doc(inputToken).get();
        
        if (docRef.exists) {
            // Token is valid! Save it and load their specific data
            localStorage.setItem('dua_activeToken', inputToken);
            initializeUserData(inputToken);
        } else {
            // Token does not exist
            document.getElementById('loginError').style.display = 'block';
        }
    } catch (error) {
        console.error("Authentication Error. You might be offline.", error);
        // Offline Fallback: If they previously logged in, let them in
        if (localStorage.getItem('dua_grandTotal_' + inputToken)) {
            localStorage.setItem('dua_activeToken', inputToken);
            initializeUserData(inputToken);
        } else {
            document.getElementById('loginError').innerText = "NETWORK ERROR: Cannot verify new token while offline.";
            document.getElementById('loginError').style.display = 'block';
        }
    }
}

function initializeUserData(token) {
    activeToken = token;
    
    // Hide login, show dashboard
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('currentUserDisplay').innerText = token;

    // Load THIS SPECIFIC USER'S data from local storage
    grandTotal = parseInt(localStorage.getItem('dua_grandTotal_' + token));
    if (isNaN(grandTotal)) {
        // If it's the admin token, start at 1100. If it's anyone else, start at 0.
        grandTotal = (token === "admin-master") ? 1100 : 0; 
        localStorage.setItem('dua_grandTotal_' + token, grandTotal);
    }
    
    history = JSON.parse(localStorage.getItem('dua_history_' + token)) || [];
    sheetsQueue = JSON.parse(localStorage.getItem('dua_sheetsQueue_' + token)) || [];
    
    updateUI();
}

function logout() {
    localStorage.removeItem('dua_activeToken');
    location.reload(); // Refresh the page to show login screen
}

// --- 4. DASHBOARD CORE LOGIC ---
function updateUI() {
    document.getElementById('grandTotal').innerText = grandTotal.toLocaleString();
    document.getElementById('leftToGo').innerText = (TARGET - grandTotal).toLocaleString();
    document.getElementById('hundreds').innerText = Math.floor(grandTotal / 100).toLocaleString();
    document.getElementById('thousands').innerText = Math.floor(grandTotal / 1000).toLocaleString();
    document.getElementById('dailyCount').innerText = dailyCount.toLocaleString();

    const percentage = (grandTotal / TARGET) * 100;
    document.getElementById('progressBar').style.width = `${percentage}%`;

    const logContainer = document.getElementById('historyLog');
    logContainer.innerHTML = '';
    history.slice().reverse().forEach(session => {
        const li = document.createElement('li');
        li.innerText = `> ${session.date}: +${session.count.toLocaleString()}`;
        logContainer.appendChild(li);
    });
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

// --- 5. CLOUD & SHEET SYNCING ---
const GOOGLE_SHEETS_URL = "PASTE_YOUR_WEB_APP_URL_HERE"; 

function saveSession() {
    if (dailyCount === 0) return;

    const timestamp = new Date().toLocaleString();
    const newSession = {
        token: activeToken, // <--- We now log WHO did the recitation!
        date: timestamp,
        count: dailyCount,
        grandTotal: grandTotal
    };

    // 1. Save Locally to THEIR specific history
    history.push(newSession);
    localStorage.setItem('dua_history_' + activeToken, JSON.stringify(history));

    // 2. FIREBASE SYNC: Save to a separate folder for this specific user!
    db.collection("users").doc(activeToken).collection("sessions").add(newSession)
      .catch(err => console.error("Firebase error:", err));

    // 3. GOOGLE SHEETS QUEUE
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
        console.log("Offline. Will retry later.");
    }
}
window.addEventListener('online', processSheetsQueue);
