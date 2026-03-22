import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId } from "../services/user";
import { createMockPayment } from "../services/payment";
import { logAction } from "../db";
import { logger } from "../../lib/logger";

export async function handleSubscription(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  logAction(telegramId, "subscription_page_viewed", {});

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "Профиль не найден. Отправьте /start");
    return;
  }

  const isActive = user.has_subscription === 1;
  const expiryText =
    isActive && user.subscription_expires
      ? `\n✅ Подписка активна до ${new Date(user.subscription_expires).toLocaleDateString("ru-RU")}`
      : isActive
      ? "\n✅ Подписка активна"
      : "\n❌ Подписка не активна";

  const text =
    `💳 *Подписка Астролог Premium*${expiryText}\n\n` +
    `С подпиской вы получаете:\n` +
    `• 🔮 Ежедневные гороскопы без ограничений\n` +
    `• 💕 Гороскопы любви и карьеры\n` +
    `• 📊 Подробная натальная карта\n` +
    `• 🌙 Лунный календарь\n\n` +
    `💰 *Стоимость: 299 руб/месяц*\n\n` +
    `_⚠️ Сейчас используется тестовый режим оплаты_`;

  const buttons = isActive
    ? [[{ text: "✅ Подписка уже активна", callback_data: "noop" }]]
    : [[{ text: "💳 Оплатить 299 руб (тест)", callback_data: "pay_mock" }]];

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: buttons },
  });
}

export async function handleMockPayment(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const telegramId = query.from.id;
  const chatId = query.message!.chat.id;

  await bot.answerCallbackQuery(query.id, { text: "⏳ Обрабатываем оплату..." });

  logger.info({ telegramId }, "Mock payment initiated");
  logAction(telegramId, "payment_initiated", { type: "mock" });

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "Профиль не найден. Отправьте /start");
    return;
  }

  await bot.sendMessage(chatId, "💳 Обрабатываем платёж...");

  try {
    const result = await createMockPayment(telegramId, user.id, 29900);

    await bot.sendMessage(chatId, result.message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔮 Получить гороскоп", callback_data: "get_horoscope" }],
          [{ text: "👤 Мой профиль", callback_data: "profile" }],
        ],
      },
    });
  } catch (err) {
    logger.error({ err, telegramId }, "Payment processing failed");
    logAction(telegramId, "payment_error", { error: String(err) }, "error");
    await bot.sendMessage(chatId, "❌ Произошла ошибка при обработке платежа. Попробуйте позже.");
  }
}
