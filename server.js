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

МНОГОЕЗИЧНОСТ:
- Автоматично разпознавай езика на клиента.
- Отговаряй на същия език, на който клиентът пише.
- Ако клиентът смени езика, премини на новия език.
- Поддържай български, английски, италиански, немски, испански, френски и други езици.
- Разбирай и текст, написан на латиница вместо на кирилица.
- Например „Zdraveite iskam web sait“ означава „Здравейте, искам уеб сайт“.
- „web site“, „website“, „web sait“, „ueb sait“, „уеб сайт“ означават уебсайт.
- Не тълкувай „sait/site“ като часовник.

ТВОЯТА ЗАДАЧА:
Постепенно разбери:
- какво търси клиентът;
- какъв продукт или услуга му е необходим;
- името му;
- телефон или имейл.

ПРАВИЛА:
- Задавай само ЕДИН въпрос наведнъж.
- Не показвай списък с въпроси.
- Не измисляй цени.
- Не измисляй информация за бизнеса.
- Не задавай повторно въпрос, ако вече имаш отговора.
- Бъди естествен и кратък.
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

app.get("/api/leads", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Leads")
      .select("id, name, Contact, request, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Supabase read error:", error);
    res.status(500).json({ error: "Failed to load leads." });
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
        const { data: existing, error: existingError } = await supabase
          .from("Leads")
          .select("id")
          .eq("name", lead.name)
          .eq("Contact", lead.contact)
          .limit(1);

        if (existingError) {
          console.error("Supabase lookup error:", existingError);
        } else if (!existing?.length) {
          const { error: insertError } = await supabase
            .from("Leads")
            .insert({
              name: lead.name,
              Contact: lead.contact,
              request: lead.request || ""
            });

          if (insertError) {
            console.error("Supabase insert error:", insertError);
          }
        }
      }
    } catch (error) {
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
