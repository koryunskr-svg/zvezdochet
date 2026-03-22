import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, canGetHoroscope, decrementFreeHoroscopes } from "../services/user";
import { generateHoroscope } from "../services/ai";
import { getDb, logAction } from "../db";
import { logger } from "../../lib/logger";
import { sendMainMenu } from "./onboarding";

export async function handleGetHoroscope(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  logger.info({ telegramId }, "User requested horoscope");
  logAction(telegramId, "horoscope_requested", {});

  const user = findUserByTelegramId(telegramId);
  if (!user || !user.birth_date || !user.zodiac_sign) {
    await bot.sendMessage(chatId, "Сначала нужно настроить профиль. Отправьте /start");
    return;
  }

  if (!canGetHoroscope(user)) {
    logAction(telegramId, "horoscope_denied_no_access", { freeHoroscopes: user.free_horoscopes });
    await bot.sendMessage(
      chatId,
      `🔒 *Бесплатные гороскопы закончились*\n\n` +
        `У вас больше нет бесплатных гороскопов.\n\n` +
        `Оформите подписку, чтобы получать гороскопы каждый день!\n` +
        `Или пригласите друзей — за каждого вы получите *+3 гороскопа* бесплатно 🎁`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "💳 Оформить подписку", callback_data: "subscribe" }],
            [{ text: "👥 Пригласить друга", callback_data: "referral" }],
          ],
        },
      }
    );
    return;
  }

  await bot.sendMessage(chatId, "🔮 Звёзды говорят... Составляю ваш персональный гороскоп ✨");
  const typingInterval = setInterval(() => {
    bot.sendChatAction(chatId, "typing").catch(() => {});
  }, 4000);

  try {
    const horoscope = await generateHoroscope(
      telegramId,
      user.zodiac_sign,
      user.name ?? "Друг",
      user.birth_date,
      "daily"
    );

    clearInterval(typingInterval);

    const db = getDb();
    db.prepare(
      `INSERT INTO horoscopes (user_id, type, content, zodiac_sign) VALUES (?, 'daily', ?, ?)`
    ).run(user.id, horoscope, user.zodiac_sign);

    if (user.has_subscription === 0) {
      decrementFreeHoroscopes(user.id);
    }

    const remainingInfo =
      user.has_subscription === 1
        ? "\n\n*Статус: Подписка активна* ✅"
        : `\n\n_Осталось бесплатных гороскопов: ${Math.max(0, user.free_horoscopes - 1)}_`;

    await bot.sendMessage(chatId, `${horoscope}${remainingInfo}`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "💕 Гороскоп любви", callback_data: "horoscope_love" },
            { text: "💼 Карьерный", callback_data: "horoscope_career" },
          ],
          [{ text: "🏠 Главное меню", callback_data: "main_menu" }],
        ],
      },
    });

    logAction(telegramId, "horoscope_sent", { zodiacSign: user.zodiac_sign, type: "daily" });
  } catch (err) {
    clearInterval(typingInterval);
    logger.error({ err, telegramId }, "Failed to generate horoscope");
    logAction(telegramId, "horoscope_error", { error: String(err) }, "error");
    await bot.sendMessage(
      chatId,
      "😔 Не удалось получить гороскоп. Звёзды немного заняты, попробуйте через минуту."
    );
  }
}

export async function handleHoroscopeCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery,
  type: "love" | "career"
): Promise<void> {
  const telegramId = query.from.id;
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id, { text: "⏳ Составляю гороскоп..." });

  const user = findUserByTelegramId(telegramId);
  if (!user || !user.birth_date || !user.zodiac_sign) {
    await bot.sendMessage(chatId, "Профиль не найден. Отправьте /start");
    return;
  }

  if (!canGetHoroscope(user)) {
    await bot.sendMessage(chatId, "🔒 Бесплатные гороскопы закончились. Оформите подписку!");
    return;
  }

  const labelMap = { love: "гороскоп любви 💕", career: "карьерный гороскоп 💼" };
  await bot.sendMessage(chatId, `🔮 Составляю ${labelMap[type]}...`);

  try {
    const horoscope = await generateHoroscope(
      telegramId,
      user.zodiac_sign,
      user.name ?? "Друг",
      user.birth_date,
      type
    );

    const db = getDb();
    db.prepare(
      `INSERT INTO horoscopes (user_id, type, content, zodiac_sign) VALUES (?, ?, ?, ?)`
    ).run(user.id, type, horoscope, user.zodiac_sign);

    if (user.has_subscription === 0) {
      decrementFreeHoroscopes(user.id);
    }

    await bot.sendMessage(chatId, horoscope, { parse_mode: "Markdown" });
    logAction(telegramId, "horoscope_sent", { zodiacSign: user.zodiac_sign, type });
  } catch (err) {
    logger.error({ err, telegramId }, "Failed to generate horoscope (callback)");
    logAction(telegramId, "horoscope_error", { error: String(err), type }, "error");
    await bot.sendMessage(chatId, "😔 Не удалось получить гороскоп. Попробуйте позже.");
  }
}
