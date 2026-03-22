import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, getUserStats } from "../services/user";
import { logAction } from "../db";
import { logger } from "../../lib/logger";

export async function handleReferral(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  logger.info({ telegramId }, "User opened referral program");
  logAction(telegramId, "referral_viewed", {});

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    await bot.sendMessage(chatId, "Профиль не найден. Отправьте /start");
    return;
  }

  const stats = getUserStats(telegramId);
  const botUsername = (await bot.getMe()).username;
  const refLink = `https://t.me/${botUsername}?start=${user.referral_code}`;

  const text =
    `👥 *Реферальная программа*\n\n` +
    `Приглашайте друзей и получайте бесплатные гороскопы!\n\n` +
    `🎁 *За каждого приглашённого:*\n` +
    `• Вы получаете +3 бесплатных гороскопа\n` +
    `• Ваш друг также получает бонус при регистрации\n\n` +
    `📊 *Ваша статистика:*\n` +
    `• Приглашено друзей: ${stats.referralCount}\n` +
    `• Осталось бесплатных гороскопов: ${user.free_horoscopes}\n\n` +
    `🔗 *Ваша ссылка:*\n\`${refLink}\``;

  await bot.sendMessage(chatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📤 Поделиться ссылкой",
            url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent("Привет! Хочу поделиться крутым астрологом 🔮 Получи персональный гороскоп!")}`,
          },
        ],
        [{ text: "📋 Скопировать ссылку", callback_data: "copy_referral" }],
      ],
    },
  });
}
