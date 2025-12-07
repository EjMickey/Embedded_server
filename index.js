require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

const { handleMeasurement } = require("./alarmCheck.js");

app.use(cors());
app.use(express.json());

let lastReading = null;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

function removeUndefined(obj) {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
}

app.post("/reading", async (req, res) => {
    try {
        const {
            station_id,
            password,
            humidityAir,
            humiditySoil,
            temperatureAir,
            pressureAir,
            sunlight
        } = req.body;

        if (!station_id || !password) {
            return res.status(400).json({ error: "Missing deviceId or password" });
        }

        const deviceDoc = await db.collection("stations").doc(station_id).get();
        if (!deviceDoc.exists) {
            return res.status(404).json({ error: "Device not found" });
        }

        const deviceData = deviceDoc.data();
        const passwordOK = await bcrypt.compare(password, deviceData.password_hash);

        if (!passwordOK) {
            return res.status(401).json({ error: "Invalid password" });
        }

        let reading = {
            station_id,
            humidityAir,
            humiditySoil,
            temperatureAir,
            pressureAir,
            sunlight,
            date: admin.firestore.FieldValue.serverTimestamp()
        };

        reading = removeUndefined(reading);
        lastReading = reading;

        let documentRef;
        let measurementId;

        try {
            documentRef = db.collection("measurements").doc();
            measurementId = documentRef.id;

        } catch (err) {
            console.error("Błąd przy kontakcie z bazą danych: " + err);
            return;
        }

        try {
            await documentRef.set(reading);
            console.log("Zapisano odczyt:", reading);
        } catch (err) {
            console.error("Błąd przy zapisie pomiaru do bazy: " + err);
        }

        try {
            await handleMeasurement(db, messaging, admin, measurementId, station_id, reading);
        } catch (err) {
            console.log("Błąd przy obsłudze alarmów: " + err);
        }

        return res.status(200).json({ ok: true, message: "Reading saved" });

    } catch (err) {
        console.error("Reading error:", err);
        res.status(500).json({ error: "Server error" });
    }
});

async function registerDevice(req, res) {
    try {
        console.log("Register device requested");
        const { station_id, password, name, ownerId } = req.body;

        if (!station_id || !password || !name || !ownerId) {
            console.log("Malformed request");
            return res.status(400).json({ error: "Malformed body" });
        }

        const docRef = db.collection("stations").doc(station_id);
        const doc = await docRef.get();

        if (doc.exists) {
            console.log("Device already exists");
            return res.status(400).json({ error: "Device already exists" });
        }

        const hash = await bcrypt.hash(password, 12);

        await docRef.set({
            name: name,
            owner_id: ownerId,
            password_hash: hash,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Created a device: " + doc);
        res.json({ ok: true, message: "Device registered successfully" });
    } catch (err) {
        console.error("Error registering device:", err);
        res.status(500).json({ error: "Server error" });
    }
}

app.post("/registerDevice", registerDevice);

app.get('/reading', (req, res) => {
    if (lastReading) {
        const humAir = lastReading.humidityAir !== undefined ? lastReading.humidityAir.toFixed(1) + " %" : "brak danych";
        const humSoil = lastReading.humiditySoil !== undefined ? lastReading.humiditySoil.toFixed(1) + " %" : "brak danych";
        const tempAir = lastReading.temperatureAir !== undefined ? lastReading.temperatureAir.toFixed(2) + " °C" : "brak danych";
        const press = lastReading.pressureAir !== undefined ? lastReading.pressureAir.toFixed(1) + " hPa" : "brak danych";
        const sun = lastReading.sunlight !== undefined ? lastReading.sunlight + " lx" : "brak danych";
        const date = lastReading.timestamp || "brak danych";

        res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Odczyty ESP32</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; padding: 30px; }
            h1 { color: #0077cc; }
            .reading { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 450px; }
            .item { margin: 8px 0; font-size: 1.1em; }
            .timestamp { color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <h1>Odczyty z ESP32</h1>
          <div class="reading">
            <div class="item"><b>Temperatura powietrza:</b> ${tempAir}</div>
            <div class="item"><b>Wilgotność powietrza:</b> ${humAir}</div>
            <div class="item"><b>Wilgotność gleby:</b> ${humSoil}</div>
            <div class="item"><b>Ciśnienie atmosferyczne:</b> ${press}</div>
            <div class="item"><b>Nasłonecznienie:</b> ${sun}</div>
            <div class="timestamp">Ostatnia aktualizacja: ${timestamp}</div>
          </div>
        </body>
      </html>
    `);
    } else {
        res.send(`
      <html>
        <head><meta charset="UTF-8"><title>Brak danych</title></head>
        <body><h2>System nie odebrał jeszcze żadnych odczytów!</h2></body>
      </html>
    `);
    }
});

app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
