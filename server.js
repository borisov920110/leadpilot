const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();

app.use(express.json());

const client = new OpenAI({
  baseURL: "https://router.huggingface.co/v1",
  apiKey: process.env.HF_TOKEN
});

let conversations = {};

const systemPrompt = `
Ти си LeadPilot — професионален AI асистент за бизнес.

Разговаряй кратко, естествено и учтиво с потенциални клиенти.

- Отговаряй на езика на клиента.
- Разбирай български, английски, италиански, немски, испански и френски.
- Разбирай български, написан на латиница.
- Задавай само ЕДИН въпрос наведнъж.
- Не измисляй цени или информация.
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
  if (!lead.name || !lead.contact) return;

  const url = `${process.env.SUPABASE_URL}/rest/v1/Leads`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": process.env.SUPABASE_SECRET_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    body: JSON.stringify({
      name: lead.name,
      Contact: lead.contact,
      request: lead.request || ""
    })
  });

  if (!
