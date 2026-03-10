import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import firebaseConfig from "./config.js";

// ---------------- FIREBASE ----------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// ---------------- AUTH ----------------

onAuthStateChanged(auth, (user) => {

    if (user) {

        document.getElementById("auth-wrapper").style.display = "none";
        document.getElementById("dashboard").style.display = "block";

        startVoiceRecognition();
        startVisualizer();
        startLocationMonitoring();

    } else {

        document.getElementById("auth-wrapper").style.display = "block";
        document.getElementById("dashboard").style.display = "none";

    }

});

window.handleSignIn = async () => {

    const email = document.getElementById("auth-email").value;
    const pass = document.getElementById("auth-password").value;

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert(err.message);
    }

};

window.handleSignUp = async () => {

    const email = document.getElementById("auth-email").value;
    const pass = document.getElementById("auth-password").value;

    try {
        await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        alert(err.message);
    }

};

window.toggleAuth = () => {

    const isLogin = document.getElementById("login-btn").style.display !== "none";

    document.getElementById("auth-title").innerText = isLogin ? "Create Account" : "Operator Login";
    document.getElementById("login-btn").style.display = isLogin ? "none" : "block";
    document.getElementById("signup-btn").style.display = isLogin ? "block" : "none";

};

window.handleLogout = () => signOut(auth);

///voice start
function startVoiceConversation() {

    console.log("Voice agent activated")

    recognition.onresult = async (event) => {

        const command =
            event.results[event.results.length - 1][0].transcript.toLowerCase()

        console.log("User:", command)

        const res = await fetch(
            "http://127.0.0.1:8000/voice/command?command=" + encodeURIComponent(command),
            { method: "POST" }
        )

        const data = await res.json()

        speak(data.response)

    }

}
// ---------------- SOS ----------------

window.triggerSOS = async () => {

    document.getElementById("sos-overlay").style.display = "flex";
    document.getElementById("file-id").innerText = "RECORDING_ACTIVE...";

    navigator.geolocation.getCurrentPosition(async (pos) => {

        try {

            await addDoc(collection(db, "emergency_alerts"), {

                trigger: "VOICE_RECOGNITION",
                phrase: "HELP HELP",
                location: {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                },

                timestamp: new Date()

            });

            document.getElementById("file-id").innerText = "ALERT_SENT_TO_RELATIVES";

        } catch (e) {

            console.error("Firebase Error", e);

        }

    });

};

window.closeSOS = () => {

    document.getElementById("sos-overlay").style.display = "none";

};


// ---------------- VOICE AI ----------------

let recognition;

function startVoiceRecognition() {

    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event) => {

        const command = event.results[event.results.length - 1][0].transcript.toLowerCase();

        console.log("Heard:", command);

        try {

            const res = await fetch(
                "http://127.0.0.1:8000/voice/command?command=" + encodeURIComponent(command),
                { method: "POST" }
            );

            const data = await res.json();

            speak(data.response);

        } catch (err) {

            console.error("Backend error:", err);

        }

    };

    recognition.onerror = (event) => {
        console.log("Speech error:", event.error);
    };

    recognition.onend = () => {
        recognition.start();
    };

    recognition.start();

}


// ---------------- SPEECH ----------------

function speak(text) {

    const speech = new SpeechSynthesisUtterance(text);

    speech.lang = "en-US";
    speech.rate = 1;

    speech.onend = () => {
        if (recognition) recognition.start();
    };

    window.speechSynthesis.speak(speech);

}


// ---------------- VISUALIZER ----------------

let audioCtx, analyser, dataArray, canvas, ctx;

function startVisualizer() {

    canvas = document.getElementById("visualizer");
    ctx = canvas.getContext("2d");

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {

            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();

            const source = audioCtx.createMediaStreamSource(stream);

            source.connect(analyser);

            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);

            drawWaves();

        })
        .catch(err => {
            console.log("Microphone unavailable, visualizer disabled");
        });

}

function drawWaves() {

    requestAnimationFrame(drawWaves);

    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00d2ff";

    ctx.beginPath();

    let x = 0;
    const sliceWidth = canvas.width / dataArray.length;

    for (let i = 0; i < dataArray.length; i++) {

        const v = dataArray[i] / 128;
        const y = v * canvas.height / 2;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);

        x += sliceWidth;

    }

    ctx.stroke();

}


// ---------------- LOCATION MONITORING ----------------

function startLocationMonitoring() {

    navigator.geolocation.watchPosition(

        position => {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            console.log("Location:", lat, lng);

            sendLocationToBackend(lat, lng);

        },

        error => console.log(error),

        { enableHighAccuracy: true }

    );

}


// ---------------- AGENT RESPONSE ----------------

function handleAgentResponse(data) {
    if (data.action === "start_voice_agent") {

        speak(data.message)

        startVoiceConversation()

    }
    console.log("Agent Response:", data);

    if (data.action === "ask_if_safe") speak(data.message);

    if (data.action === "danger_vehicle") {
        speak(data.message);
        triggerSOS();
    }

    if (data.action === "guide_user") speak(data.message);
    console.log("Agent Response:", data)
}


// ---------------- SEND LOCATION ----------------

async function sendLocationToBackend(lat, lng) {

    let stopped = false;

    if (window.lastLat) {

        const distance = Math.sqrt(
            Math.pow(lat - window.lastLat, 2) +
            Math.pow(lng - window.lastLng, 2)
        );

        if (distance < 0.00001) stopped = true;

    }

    window.lastLat = lat;
    window.lastLng = lng;

    const dangerScore = Math.random();

    try {

        const res = await fetch("http://127.0.0.1:8000/location/update", {

            method: "POST",
            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({
                lat,
                lng,
                stopped,
                danger_score: dangerScore
            })

        });

        const data = await res.json();

        handleAgentResponse(data);

    } catch {

        console.log("Offline mode");
        storeOfflineLocation(lat, lng);

    }

}


// ---------------- OFFLINE STORAGE ----------------

function storeOfflineLocation(lat, lng) {

    let history = JSON.parse(localStorage.getItem("offlineLocations")) || [];

    history.push({
        lat,
        lng,
        time: Date.now()
    });

    localStorage.setItem("offlineLocations", JSON.stringify(history));

}


// ---------------- FAKE CALL ----------------

window.startFakeCall = () => {

    const ring = document.getElementById("ringtone");

    ring.volume = 0;
    ring.play();

    alert("Call in 5s...");

    setTimeout(() => {

        document.getElementById("call-overlay").style.display = "flex";
        ring.volume = 1;

    }, 5000);

};

window.closeCall = () => {

    const ring = document.getElementById("ringtone");

    ring.pause();
    document.getElementById("call-overlay").style.display = "none";

};


// ---------------- ROUTE SIMULATION ----------------

window.simulateRoute = () => {

    const user = document.getElementById("userIcon");
    const path = document.getElementById("safe-path-line");

    document.getElementById("destPoint").style.display = "block";

    path.setAttribute("d", "M 200 400 L 450 300 L 700 100");
    path.style.strokeDashoffset = "0";

    user.style.transition = "4s linear";
    user.style.top = "20%";
    user.style.left = "70%";

};


// ---------------- CLOCK ----------------

setInterval(() => {

    document.getElementById("clock").innerText = new Date().toLocaleTimeString();

    document.getElementById("risk-percent").innerText =
        Math.floor(Math.random() * 10 + 15) + "%";

}, 1000);