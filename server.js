const express = require("express");
const path = require("path");
const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");
const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
app.use(express.json());

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN
});


let conversations = {};

const systemPrompt = `
Ти си LeadPilot — професионален AI асистент за бизнес.

Разговаряй кратко, естествено и учтиво с потенциални клиенти.

Твоята задача е постепенно да разбереш:
- какво търси клиентът;
- какво точно му е необходимо;
- име;
- телефон или имейл.

Задавай само ЕДИН въпрос наведнъж.
Не показвай списъци с въпроси.
Не измисляй цени.
Не задавай един и същ въпрос повторно, ако вече имаш отговора.
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

app.get("/api/leads", async (req, res) => {
    const { data, error } = await supabase
    .from("Leads")
    .select("id, name, Contact, request, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const sessionId = req.body.sessionId || "default";

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

Върни САМО валиден JSON във формата:
{
  "name": "",
  "contact": "",
  "request": ""
}

Ако дадена информация липсва, остави полето празно.
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
      const lead = JSON.parse(
        extraction.choices[0].message.content
      );

      if (lead.name && lead.contact) {
        
          
            
            
        

        if (!existing?.length) {
  const { error } = await supabase.from("Leads").insert({
    name: lead.name,
    Contact: lead.contact,
    request: lead.request || ""
  });

  if (error) {
    console.error("Supabase insert error:", error);
  }
        }
      console.error("Lead extraction error:", error);
    }

    res.json({
      reply
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
