import OpenAI from "openai";
import { logger } from "../../lib/logger";
import { logAction } from "../db";

if (!process.env.HYDRAAI_API_KEY) {
  throw new Error("HYDRAAI_API_KEY is required but not set in environment");
}

const client = new OpenAI({
  apiKey: process.env.HYDRAAI_API_KEY,
  baseURL: "https://api.hydraai.ru/v1/",
});

const MODEL = process.env.HYDRAAI_MODEL_NAME ?? "gpt-4o-mini";

const ZODIAC_DESCRIPTIONS: Record<string, string> = {
  "Овен":       "Овен (21 марта – 19 апреля) — огненный знак, символ смелости и инициативы",
  "Телец":      "Телец (20 апреля – 20 мая) — земной знак, символ стабильности и упорства",
  "Близнецы":   "Близнецы (21 мая – 20 июня) — воздушный знак, символ общительности и любопытства",
  "Рак":        "Рак (21 июня – 22 июля) — водный знак, символ интуиции и заботы",
  "Лев":        "Лев (23 июля – 22 августа) — огненный знак, символ власти и великодушия",
  "Дева":       "Дева (23 августа – 22 сентября) — земной знак, символ аналитики и совершенства",
  "Весы":       "Весы (23 сентября – 22 октября) — воздушный знак, символ гармонии и справедливости",
  "Скорпион":   "Скорпион (23 октября – 21 ноября) — водный знак, символ трансформации и глубины",
  "Стрелец":    "Стрелец (22 ноября – 21 декабря) — огненный знак, символ свободы и философии",
  "Козерог":    "Козерог (22 декабря – 19 января) — земной знак, символ амбиций и дисциплины",
  "Водолей":    "Водолей (20 января – 18 февраля) — воздушный знак, символ оригинальности и гуманизма",
  "Рыбы":       "Рыбы (19 февраля – 20 марта) — водный знак, символ чуткости и духовности",
};

export function getZodiacSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return "Овен";
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return "Телец";
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return "Близнецы";
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return "Рак";
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return "Лев";
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return "Дева";
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return "Весы";
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return "Скорпион";
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return "Стрелец";
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return "Козерог";
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return "Водолей";
  return "Рыбы";
}

export async function generateHoroscope(
  telegramId: number,
  zodiacSign: string,
  name: string,
  birthDate: string,
  type: "daily" | "weekly" | "love" | "career" = "daily"
): Promise<string> {
  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });

  const typeLabels: Record<string, string> = {
    daily:   "ежедневный",
    weekly:  "недельный",
    love:    "гороскоп любви",
    career:  "карьерный гороскоп",
  };

  const zodiacDesc = ZODIAC_DESCRIPTIONS[zodiacSign] ?? zodiacSign;

  const systemPrompt = `Ты — мудрый астролог с 30-летним опытом. Ты составляешь персональные гороскопы на основе даты рождения и знака зодиака. 
Твои прогнозы: конкретные, вдохновляющие, с практическими советами. Не используй клише. 
Пиши живо, тепло, с лёгкой мистикой. Используй эмодзи умеренно. Отвечай только на русском языке.`;

  const userPrompt = `Составь ${typeLabels[type]} гороскоп для ${name}.
Знак зодиака: ${zodiacDesc}.
Дата рождения: ${birthDate}.
Дата прогноза: ${today}.

Структура ответа:
✨ Краткий главный посыл дня (1-2 предложения)
🌟 Общая энергетика
💫 Любовь и отношения
💼 Работа и финансы  
🔮 Совет дня

Объём: 200-300 слов. Обращайся к ${name} по имени несколько раз.`;

  logger.info({ telegramId, zodiacSign, type, model: MODEL }, "Generating horoscope via HydraAI");
  logAction(telegramId, "ai_request_start", { zodiacSign, type, model: MODEL });

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 600,
    temperature: 0.85,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from HydraAI");
  }

  logger.info({ telegramId, zodiacSign, tokens: response.usage?.total_tokens }, "Horoscope generated successfully");
  logAction(telegramId, "ai_request_success", { zodiacSign, type, tokens: response.usage?.total_tokens });

  return content;
}
