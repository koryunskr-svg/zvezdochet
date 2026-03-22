import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, getUserStats, getHoroscoreHistory } from "../services/user";
import { logAction } from "../db";
import { logger } from "../../lib/logger";

export async function handleProfile(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  logger.info({ telegramId }, "User opened profile");
  logAction(telegramId, "profile_viewed", {});

  const user = findUserByTelegramId(telegramId);
  if (!user || !user.name) {
    await bot.sendMessage(chatId, "Профиль не найден. Отправьте /start для регистрации.");
    return;
  }

  const stats = getUserStats(telegramId);

  const subscriptionStatus =
    user.has_subscription === 1 && user.subscription_expires
      ? `✅ Активна до ${new Date(user.subscription_expires).toLocaleDateString("ru-RU")}`
      : user.has_subscription === 1
      ? "✅ Активна"
      : `❌ Нет подписки (осталось бесплатных: ${user.free_horoscopes})`;

  const profileText =
    `👤 *Личный кабинет*\n\n` +
    `📛 Имя: ${user.name}\n` +
    `🎂 Дата рождения: ${user.birth_date ? formatDate(user.birth_date) : "не указана"}\n` +
    `♾️ Знак зодиака: *${user.zodiac_sign ?? "не определён"}*\n\n` +
    `📊 *Статистика:*\n` +
    `• Гороскопов получено: ${stats.horoscopeCount}\n` +
    `• Рефералов приглашено: ${stats.referralCount}\n\n` +
    `💳 *Подписка:* ${subscriptionStatus}\n\n` +
    `🎨 Тема: ${user.theme === "dark" ? "🌙 Тёмная" : "☀️ Светлая"}`;

  await bot.sendMessage(chatId, profileText, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: user.theme === "dark" ? "☀️ Светлая тема" : "🌙 Тёмная тема", callback_data: `theme_${user.theme === "dark" ? "light" : "dark"}` },
        ],
        [{ text: "✏️ Изменить профиль", callback_data: "edit_profile" }],
        [{ text: "💳 Управление подпиской", callback_data: "subscribe" }],
      ],
    },
  });
}

export async function handleHistory(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  logAction(telegramId, "history_viewed", {});

  const history = getHoroscoreHistory(telegramId, 5);

  if (history.length === 0) {
    await bot.sendMessage(
      chatId,
      "📜 *История гороскопов пуста*\n\nПолучите свой первый гороскоп! 🔮",
      { parse_mode: "Markdown" }
    );
    return;
  }

  await bot.sendMessage(chatId, `📜 *Последние ${history.length} гороскопов:*`, { parse_mode: "Markdown" });

  for (const h of history) {
    const typeLabels: Record<string, string> = {
      daily: "Ежедневный",
      love: "Любовный",
      career: "Карьерный",
      weekly: "Недельный",
    };
    const date = new Date(h.created_at).toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric",
    });
    const preview = h.content.slice(0, 200) + (h.content.length > 200 ? "..." : "");

    await bot.sendMessage(
      chatId,
      `📅 *${typeLabels[h.type] ?? h.type}* — ${date}\n♾️ ${h.zodiac_sign}\n\n${preview}`,
      { parse_mode: "Markdown" }
    );
  }
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
