
const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();
let leads = [];
app.use(express.json());

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const systemPrompt = `
Ти си LeadPilot — професионален AI асистент за бизнес.

Разговаряй кратко, естествено и учтиво с потенциални клиенти.
Твоята задача е да разбереш какво търси клиентът и постепенно да събереш:
- какъв продукт или услуга търси;
- какво точно му е необходимо;
- приблизителен бюджет;
- име и начин за контакт.

Задавай само ЕДИН въпрос наведнъж.
Не показвай списъци с въпроси, таблици или дълги обяснения.
Не измисляй цени или конкретни услуги, ако клиентът не ги е поискал.
След всеки отговор продължи естествено с най-подходящия следващ въпрос.
`;

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:fastest",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      reply: "Възникна грешка при свързването с AI."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`LeadPilot работи на порт ${PORT}`);
});
