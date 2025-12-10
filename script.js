// Configuration
const MACHINE_ID = 'machine_1';
const WASH_TIME_MINUTES = 42;

// Select Elements
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const timerEl = document.getElementById('timer');
const statusEl = document.getElementById('status-display');

// Helper: Format seconds to MM:SS
function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// Helper: Update the screen (Red vs Green)
function updateUI(isBusy, secondsLeft = 0) {
    if (isBusy) {
        statusEl.textContent = 'BUSY';
        statusEl.style.backgroundColor = '#dc3545'; // Red
        timerEl.textContent = formatTime(secondsLeft);
        startBtn.disabled = true; // Stop people from clicking it twice
        startBtn.textContent = 'Machine Running...';
    } else {
        statusEl.textContent = 'FREE';
        statusEl.style.backgroundColor = '#198754'; // Green
        timerEl.textContent = '00:00';
        startBtn.disabled = false;
        startBtn.textContent = `Start Wash (${WASH_TIME_MINUTES}m)`;
    }
}

// ---------------------------------------------------------
// 1. LISTEN TO DATABASE (Read)
// ---------------------------------------------------------
// We wait 1 second to ensure Firebase connects first
setTimeout(() => {
    if (!window.db) return console.error("Waiting for Firebase...");

    const machineRef = window.ref(window.db, 'machines/' + MACHINE_ID);

    // This runs AUTOMATICALLY whenever the database changes
    window.onValue(machineRef, (snapshot) => {
        const data = snapshot.val();
        
        // If data exists and has an endTime...
        if (data && data.endTime) {
            startLocalCountdown(data.endTime);
        } else {
            // Machine is free
            stopLocalCountdown();
            updateUI(false);
        }
    });
}, 1000);

// ---------------------------------------------------------
// 2. WRITE TO DATABASE (Write)
// ---------------------------------------------------------

startBtn.addEventListener('click', () => {
    const now = Date.now();
    const endTime = now + (WASH_TIME_MINUTES * 60 * 1000); // Current time + 42 mins

    // Save "Busy" and the "End Time" to the cloud
    window.set(window.ref(window.db, 'machines/' + MACHINE_ID), {
        status: 'busy',
        endTime: endTime
    });
});

resetBtn.addEventListener('click', () => {
    // Wipe the data to make it free
    window.set(window.ref(window.db, 'machines/' + MACHINE_ID), null);
});

// ---------------------------------------------------------
// 3. COUNTDOWN LOGIC
// ---------------------------------------------------------
let intervalId = null;

function startLocalCountdown(endTime) {
    // clear any old timers first
    if (intervalId) clearInterval(intervalId);

    // Update immediately so we don't wait 1 second
    const now = Date.now();
    const secondsLeft = Math.floor((endTime - now) / 1000);
    updateUI(true, secondsLeft);

    // Start ticking
    intervalId = setInterval(() => {
        const currentNow = Date.now();
        const currentSecondsLeft = Math.floor((endTime - currentNow) / 1000);

        if (currentSecondsLeft <= 0) {
            // Time is up!
            clearInterval(intervalId);
            // Optional: Tell database it's finished
             window.set(window.ref(window.db, 'machines/' + MACHINE_ID), null);
        } else {
            updateUI(true, currentSecondsLeft);
        }
    }, 1000);
}

function stopLocalCountdown() {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
}