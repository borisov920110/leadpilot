const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();

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
Твоята задача е да разговаряш учтиво с потенциални клиенти и да събираш информация за тях.

Задавай въпросите естествено, един по един:
1. Какъв продукт или услуга търси клиентът?
2. Какво точно му е необходимо?
3. Какъв е приблизителният му бюджет?
4. Как може бизнесът да се свърже с него?

Не задавай всички въпроси наведнъж.
Бъди кратък, любезен и професионален.
`;
    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:fastest",
      messages: [
        {
          
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
