import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let lastReading = null;

app.post("/reading", (req, res) => {
  const data = req.body;
  if (!data || Object.keys(data).length === 0) {
    return res.status(400).send("Brak danych w żądaniu!");
  }
  data.timestamp = new Date().toLocaleString();
  lastReading = data;
  console.log("Otrzymano dane:", data);
  res.status(200).send("Dane odebrane OK!");
});

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
