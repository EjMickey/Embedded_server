const express = require('express');
const app = express();
const port = 3000;

// do parsowania JSON z ESP32
app.use(express.json());

let lastReading = null; // tu będziemy trzymać ostatni pomiar

// --- odbieranie danych z ESP32 ---
app.post('/reading', (req, res) => {
  console.log('Otrzymano dane:', req.body);
  lastReading = {
    temperature: req.body.temp,
    humidity: req.body.humidity,
    pressure: req.body.pressure,
    altitude: req.body.altitude,
    soil: req.body.soil,
    timestamp: new Date().toLocaleString()
  };
  res.status(200).send('Dane zapisane!');
});

// --- wyświetlanie danych w przeglądarce ---
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
          <h1>Odczyt z ESP32</h1>
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
        <body><h2>System nie odebrał jeszcze żadnych odczytów!</h2></body>
      </html>
    `);
  }
});

app.listen(port, () => {
  console.log(`Serwer działa na http://localhost:${port}/reading`);
});
