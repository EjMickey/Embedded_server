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

app.get("/reading", (req, res) => {
  if (lastReading) {
    res.send(`
      <h2>Ostatni odczyt z ESP32</h2>
      <pre>${JSON.stringify(lastReading, null, 2)}</pre>
    `);
  } else {
    res.send("System nie odebrał jeszcze żadnych odczytów!");
  }
});

app.listen(PORT, () => console.log(`Serwer działa na porcie ${PORT}`));
