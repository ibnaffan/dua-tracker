
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

// Initialize Firebase (Uncomment when you paste your config)
// firebase.initializeApp(firebaseConfig);
// const db = firebase.firestore();
// db.enablePersistence().catch(err => console.log("Offline mode error:", err));


// --- STATE VARIABLES ---
const TARGET = 1000000;

// Initialize grandTotal. If it's the very first time, set to 1100!
let grandTotal = parseInt(localStorage.getItem('dua_grandTotal'));
if (isNaN(grandTotal)) {
    grandTotal = 1100;
    localStorage.setItem('dua_grandTotal', grandTotal);
}

let dailyCount = 0;
let history = JSON.parse(localStorage.getItem('dua_history')) || [];

// --- NEW FUNCTION: Manual Add ---
function addManual() {
    const inputField = document.getElementById('manualInput');
    const manualAmount = parseInt(inputField.value);
    
    if (!isNaN(manualAmount) && manualAmount > 0) {
        dailyCount += manualAmount;
        grandTotal += manualAmount;
        localStorage.setItem('dua_grandTotal', grandTotal);
        inputField.value = ''; // Clear the box
        updateUI();
    }
}


// --- 3. CORE LOGIC ---
function updateUI() {
    // Math Calculations
    document.getElementById('grandTotal').innerText = grandTotal.toLocaleString();
    document.getElementById('leftToGo').innerText = (TARGET - grandTotal).toLocaleString();
    document.getElementById('hundreds').innerText = Math.floor(grandTotal / 100).toLocaleString();
    document.getElementById('thousands').innerText = Math.floor(grandTotal / 1000).toLocaleString();
    document.getElementById('dailyCount').innerText = dailyCount.toLocaleString();

    // Progress Bar Fill
    const percentage = (grandTotal / TARGET) * 100;
    document.getElementById('progressBar').style.width = `${percentage}%`;

    // Render History Log
    const logContainer = document.getElementById('historyLog');
    logContainer.innerHTML = '';
    history.slice().reverse().forEach(session => {
        const li = document.createElement('li');
        li.innerText = `> ${session.date}: +${session.count.toLocaleString()} recitations added.`;
        logContainer.appendChild(li);
    });
}

function recite() {
    dailyCount++;
    grandTotal++;
    
    // Save to local browser memory instantly so you don't lose it if you close the tab
    localStorage.setItem('dua_grandTotal', grandTotal);
    
    updateUI();
}

// --- THE SYNC QUEUE FOR GOOGLE SHEETS ---
let sheetsQueue = JSON.parse(localStorage.getItem('dua_sheetsQueue')) || [];
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyrVqUW7oBnr6Rh9XRGUvAIpcZesRXii213YB0fSfdFk-RsXnKHR0AJDE9nwfY6yJ6k4A/exec"; 

function saveSession() {
    if (dailyCount === 0) return; 

    const timestamp = new Date().toLocaleString();
    const newSession = {
        date: timestamp,
        count: dailyCount,
        grandTotal: grandTotal // Sending the total to the sheet too!
    };

    // 1. SAVE LOCALLY
    history.push(newSession);
    localStorage.setItem('dua_history', JSON.stringify(history));

    // 2. FIREBASE CLOUD SYNC (Handles its own offline mode)
    /*
    db.collection("dua_sessions").add(newSession)
      .then(() => console.log("Firebase synced!"))
      .catch(err => console.error("Firebase error:", err));
    */

    // 3. GOOGLE SHEETS SYNC (With custom offline queue)
    sheetsQueue.push(newSession);
    localStorage.setItem('dua_sheetsQueue', JSON.stringify(sheetsQueue));
    processSheetsQueue();

    // Reset daily counter
    dailyCount = 0;
    updateUI();
}

// Custom Offline-to-Online logic for Google Sheets
async function processSheetsQueue() {
    if (!navigator.onLine || sheetsQueue.length === 0) return; // Stop if offline or empty

    const sessionToSync = sheetsQueue[0]; // Get the oldest unsynced session

    try {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: JSON.stringify(sessionToSync)
        });
        
        // If successful, remove it from the queue and save the shorter queue
        sheetsQueue.shift(); 
        localStorage.setItem('dua_sheetsQueue', JSON.stringify(sheetsQueue));
        
        // If there are more in the queue, run it again!
        if (sheetsQueue.length > 0) processSheetsQueue(); 
        
    } catch (error) {
        console.log("Offline or Sheets Error. Will retry later.", error);
    }
}

// Listen for the internet coming back on, and trigger the queue!
window.addEventListener('online', processSheetsQueue);

// --- NEW FUNCTION: DOWNLOAD LOCAL CSV SPREADSHEET ---
function downloadCSV() {
    let csvContent = "data:text/csv;charset=utf-8,Date,Session Count,Grand Total\n";
    
    // Add history. You'd normally calculate the rolling total, but we'll keep it simple:
    history.forEach(row => {
        csvContent += `"${row.date}",${row.count},${row.grandTotal || ''}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dua_tracker_backup.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Initial Render
updateUI();