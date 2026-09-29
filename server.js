const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();

app.use(express.json());

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN
});

const conversations = {};

const systemPrompt = `
Ти си LeadPilot — професионален AI асистент за бизнес.

Разговаряй кратко, естествено и учтиво.

- Отговаряй на езика на клиента.
- Разбирай български, английски, италиански, немски, испански и френски.
- Разбирай български, написан на латиница.
- Задавай само ЕДИН въпрос наведнъж.
- Не измисляй информация.
- Не измисляй цени.
- Не задавай повторно въпрос, ако вече имаш отговора.

Постепенно разбери:
- какво търси клиентът;
- какъв продукт или услуга му е необходим;
- името му;
- телефон или имейл.
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

async function saveLead(lead) {
  if (!lead.name || !lead.contact) {
    return;
  }

  const url = `${process.env.SUPABASE_URL}/rest/v1/Leads`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      name: lead.name,
      Contact: lead.contact,
      request: lead.request || ""
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Supabase insert error:", errorText);
    return;
  }

  console.log("Lead saved successfully:", lead.name);
}

app.get("/api/leads", async (req, res) => {
  try {
    const url =
      `${process.env.SUPABASE_URL}/rest/v1/Leads` +
      "?select=id,name,Contact,request,created_at&order=created_at.desc";

    const response = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Supabase read error:", data);
      return res.status(500).json({ error: data });
    }

    res.json(data);
  } catch (error) {
    console.error("Supabase read error:", error);
    res.status(500).json({
      error: "Failed to load leads."
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;
    const sessionId = req.body.sessionId || "default";

    if (!message) {
      return res.status(400).json({
        reply: "Моля, напишете съобщение."
      });
    }

    if (!conversations[sessionId]) {
      conversations[sessionId] = [];
    }

    conversations[sessionId].push({
      role: "user",
      content: message
    });

    const response = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:fastest",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversations[sessionId]
      ]
    });

    const reply = response.choices[0].message.content;

    conversations[sessionId].push({
      role: "assistant",
      content: reply
    });

    const extraction = await client.chat.completions.create({
      model: "openai/gpt-oss-120b:fastest",
      messages: [
        {
          role: "system",
          content: `
Извлечи информация за потенциален клиент от разговора.

Върни САМО валиден JSON:

{
  "name": "",
  "contact": "",
  "request": ""
}

Ако информацията липсва, остави полето празно.
Не измисляй информация.
`
        },
        {
          role: "user",
          content: JSON.stringify(conversations[sessionId])
        }
      ]
    });

    try {
      let extracted = extraction.choices[0].message.content.trim();

      extracted = extracted
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const lead = JSON.parse(extracted);

      await saveLead(lead);
    } catch (error) {
      console.error("Lead extraction error:", error);
    }

    res.json({
      reply
    });
  } catch (error) {
    console.error("Chat error:", error);

    res.status(500).json({
      reply: "Възникна грешка при свързването с AI."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`LeadPilot работи на порт ${PORT}`);
});
