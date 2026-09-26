const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("LeadPilot работи!");
});

app.post("/api/chat", (req, res) => {
  const message = req.body.message;

  res.json({
    reply: "Получих съобщението: " + message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`LeadPilot работи на порт ${PORT}`);
});
