const express = require("express");
const path = require("path");
const OpenAI = require("openai");

const app = express();

app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const conversations = {};

const systemPrompt = `
Ти си LeadPilot — професионален AI асистент за бизнес.

Разговаряй кратко, естествено и учтиво.

- Отговаряй на езика на клиента.
- Разбирай български, английски, италиански, немски, испански и френски.
- Разбирай български, написан на латиница.
- Задавай само ЕД
