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

  lastReading = data;
  console.log("📡 Otrzymano dane:", data);
  res.status(200).send("Dane odebrane OK!");
});

app.get('/reading', (req, res) => {
  if (lastReading) {
    res.send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Odczyty ESP32</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f7f7f7;
              color: #222;
              padding: 30px;
            }
            h1 {
              color: #0077cc;
            }
            .reading {
              background: white;
              border-radius: 10px;
              padding: 20px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
              max-width: 400px;
            }
            .item {
              margin: 8px 0;
              font-size: 1.1em;
            }
            .timestamp {
              color: #666;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <h1>🌡️ Odczyt z ESP32</h1>
          <div class="reading">
            <div class="item"><b>Temperatura:</b> ${lastReading.temperature.toFixed(2)} °C</div>
            <div class="item"><b>Wilgotność:</b> ${lastReading.humidity.toFixed(1)} %</div>
            <div class="item"><b>Ciśnienie:</b> ${lastReading.pressure.toFixed(1)} hPa</div>
            <div class="item"><b>Wysokość:</b> ${lastReading.altitude.toFixed(1)} m</div>
            <div class="item"><b>Wilgotność gleby:</b> ${lastReading.soil}%</div>
            <div class="timestamp">Ostatnia aktualizacja: ${lastReading.timestamp}</div>
          </div>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head><meta charset="UTF-8"><title>Brak danych</title></head>
        <body><h2>🚫 System nie odebrał jeszcze żadnych odczytów!</h2></body>
      </html>
    `);
  }
});

app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
