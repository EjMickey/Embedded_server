require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let lastReading = null;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function removeUndefined(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}


app.post("/reading", async (req, res) => {
  try {
    const { deviceId, password, temperature, humidity, pressure, altitude, soil } = req.body;

    if (!deviceId || !password) {
      return res.status(400).json({ error: "Missing deviceId or password" });
    }

    const deviceDoc = await db.collection("devices").doc(deviceId).get();
    if (!deviceDoc.exists) {
      return res.status(404).json({ error: "Device not found" });
    }

    const deviceData = deviceDoc.data();

    const passwordOK = await bcrypt.compare(password, deviceData.passwordHash);
    if (!passwordOK) {
      return res.status(401).json({ error: "Invalid password" });
    }

    let reading = {
      temperature,
      humidity,
      pressure,
      altitude,
      soil,
      timestamp: new Date().toISOString()
    };

    reading = removeUndefined(reading);

    lastReading = reading;

    const timestampId = Date.now().toString();
    await db
      .collection("readings")
      .doc(deviceId)
      .collection("entries")
      .doc(timestampId)
      .set(reading);

    console.log("Zapisano odczyt:", reading);

    return res.status(200).json({ ok: true, message: "Reading saved" });

  } catch (err) {
    console.error("Reading error:", err);
    res.status(500).json({ error: "Server error" });
  }
  data.timestamp = new Date().toLocaleString();
  lastReading = data;
  console.log("Otrzymano dane:", data);
  res.status(200).send("Dane odebrane OK!");
});



async function registerDevice(req, res) {
  try {
    const { deviceId, password } = req.body;

    if (!deviceId || !password) {
      return res.status(400).json({ error: "Missing deviceId or password" });
    }

    const docRef = db.collection("devices").doc(deviceId);
    const doc = await docRef.get();

    if (doc.exists) {
      return res.status(400).json({ error: "Device already exists" });
    }

    const hash = await bcrypt.hash(password, 12);

    await docRef.set({
      passwordHash: hash,
      createdAt: new Date().toISOString()
    });

    res.json({ ok: true, message: "Device registered successfully" });
  } catch (err) {
    console.error("Error registering device:", err);
    res.status(500).json({ error: "Server error" });
  }
}

app.post("/registerDevice", registerDevice);

app.get('/reading', (req, res) => {
  if (lastReading) {
    const temperature = lastReading.temperature !== undefined ? lastReading.temperature.toFixed(2) + " °C" : "brak danych";
    const humidity = lastReading.humidity !== undefined ? lastReading.humidity.toFixed(1) + " %" : "brak danych";
    const pressure = lastReading.pressure !== undefined ? lastReading.pressure.toFixed(1) + " hPa" : "brak danych";
    const altitude = lastReading.altitude !== undefined ? lastReading.altitude.toFixed(1) + " m" : "brak danych";
    const soil = lastReading.soil !== undefined ? lastReading.soil + "%" : "brak danych";
    const timestamp = lastReading.timestamp || "brak danych";

    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Odczyty ESP32</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f7f7f7; color: #222; padding: 30px; }
            h1 { color: #0077cc; }
            .reading { background: white; border-radius: 10px; padding: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 400px; }
            .item { margin: 8px 0; font-size: 1.1em; }
            .timestamp { color: #666; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <h1>Odczyt z ESP32</h1>
          <div class="reading">
            <div class="item"><b>Temperatura:</b> ${temperature}</div>
            <div class="item"><b>Wilgotność:</b> ${humidity}</div>
            <div class="item"><b>Ciśnienie:</b> ${pressure}</div>
            <div class="item"><b>Wysokość:</b> ${altitude}</div>
            <div class="item"><b>Wilgotność gleby:</b> ${soil}</div>
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
