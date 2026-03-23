import TelegramBot from "node-telegram-bot-api";
import { getDb, logAction } from "../db";
import { isAdmin } from "../lib/admin";
import { logger } from "../../lib/logger";

function getStats(): {
  totalUsers: number;
  activeSubscriptions: number;
  totalHoroscopes: number;
  todayHoroscopes: number;
  newUsersToday: number;
} {
  const db = getDb();

  const totalUsers = (db.prepare(`SELECT COUNT(*) as cnt FROM users`).get() as { cnt: number }).cnt;
  const activeSubscriptions = (db.prepare(
    `SELECT COUNT(*) as cnt FROM users WHERE has_subscription = 1`
  ).get() as { cnt: number }).cnt;
  const totalHoroscopes = (db.prepare(`SELECT COUNT(*) as cnt FROM horoscopes`).get() as { cnt: number }).cnt;
  const todayHoroscopes = (db.prepare(
    `SELECT COUNT(*) as cnt FROM horoscopes WHERE date(created_at) = date('now')`
  ).get() as { cnt: number }).cnt;
  const newUsersToday = (db.prepare(
    `SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')`
  ).get() as { cnt: number }).cnt;

  return { totalUsers, activeSubscriptions, totalHoroscopes, todayHoroscopes, newUsersToday };
}

export async function handleAdminCommand(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;

  if (!isAdmin(telegramId)) {
    logger.warn({ telegramId }, "Unauthorized /koryun attempt");
    logAction(telegramId, "admin_unauthorized", { command: "/koryun" }, "warn");
    return;
  }

  logAction(telegramId, "admin_menu_opened", {});
  logger.info({ telegramId }, "Admin opened /koryun menu");

  await bot.sendMessage(chatId, "⚙️ *Панель администратора*\nВыберите действие:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Статистика", callback_data: "admin_stats" }],
        [{ text: "📢 Рассылка", callback_data: "admin_broadcast" }],
        [{ text: "⚙️ Настройки", callback_data: "admin_settings" }],
      ],
    },
  });
}

export async function handleAdminCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const telegramId = query.from.id;
  const chatId = query.message!.chat.id;
  const data = query.data ?? "";

  if (!isAdmin(telegramId)) {
    logger.warn({ telegramId, data }, "Unauthorized admin callback attempt");
    logAction(telegramId, "admin_callback_unauthorized", { data }, "warn");
    await bot.answerCallbackQuery(query.id, { text: "⛔ Нет доступа" });
    return;
  }

  await bot.answerCallbackQuery(query.id);

  if (data === "admin_stats") {
    logAction(telegramId, "admin_stats_viewed", {});
    logger.info({ telegramId }, "Admin viewed stats");

    const stats = getStats();
    const text =
      `📊 *Статистика Звездочет*\n\n` +
      `👥 Всего пользователей: *${stats.totalUsers}*\n` +
      `🆕 Новых сегодня: *${stats.newUsersToday}*\n` +
      `💳 Активных подписок: *${stats.activeSubscriptions}*\n` +
      `🔮 Всего гороскопов: *${stats.totalHoroscopes}*\n` +
      `📅 Гороскопов сегодня: *${stats.todayHoroscopes}*`;

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_back" }]],
      },
    });
  } else if (data === "admin_broadcast") {
    logAction(telegramId, "admin_broadcast_initiated", {});
    logger.info({ telegramId }, "Admin initiated broadcast");

    await bot.sendMessage(
      chatId,
      "📢 *Рассылка*\n\nОтправьте сообщение для рассылки всем пользователям.\nНачните текст с `BROADCAST:` — например:\n`BROADCAST: Привет всем! 🌟`",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_back" }]],
        },
      }
    );
  } else if (data === "admin_settings") {
    logAction(telegramId, "admin_settings_opened", {});
    logger.info({ telegramId }, "Admin opened settings");

    await bot.sendMessage(chatId, "⚙️ *Настройки подписок*\nВыберите действие:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎁 Выдать подписку пользователю", callback_data: "admin_grant_sub" }],
          [{ text: "🚫 Отозвать подписку", callback_data: "admin_revoke_sub" }],
          [{ text: "🔙 Назад", callback_data: "admin_back" }],
        ],
      },
    });
  } else if (data === "admin_grant_sub") {
    logAction(telegramId, "admin_grant_sub_initiated", {});
    await bot.sendMessage(
      chatId,
      "🎁 *Выдать подписку*\n\nОтправьте команду в формате:\n`GRANT_SUB:<telegram_id>:<дни>`\n\nПример: `GRANT_SUB:123456789:30`",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_settings" }]],
        },
      }
    );
  } else if (data === "admin_revoke_sub") {
    logAction(telegramId, "admin_revoke_sub_initiated", {});
    await bot.sendMessage(
      chatId,
      "🚫 *Отозвать подписку*\n\nОтправьте команду в формате:\n`REVOKE_SUB:<telegram_id>`\n\nПример: `REVOKE_SUB:123456789`",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_settings" }]],
        },
      }
    );
  } else if (data === "admin_back") {
    logAction(telegramId, "admin_menu_opened", {});
    await bot.sendMessage(chatId, "⚙️ *Панель администратора*\nВыберите действие:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Статистика", callback_data: "admin_stats" }],
          [{ text: "📢 Рассылка", callback_data: "admin_broadcast" }],
          [{ text: "⚙️ Настройки", callback_data: "admin_settings" }],
        ],
      },
    });
  }
}

export async function handleAdminMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<boolean> {
  const telegramId = msg.from!.id;
  const chatId = msg.chat.id;
  const text = msg.text ?? "";

  if (!isAdmin(telegramId)) return false;

  if (text.startsWith("BROADCAST:")) {
    const broadcastText = text.slice("BROADCAST:".length).trim();
    if (!broadcastText) {
      await bot.sendMessage(chatId, "❌ Текст рассылки не может быть пустым.");
      return true;
    }

    const db = getDb();
    const users = db.prepare(`SELECT telegram_id FROM users WHERE telegram_id IS NOT NULL`).all() as { telegram_id: number }[];

    logAction(telegramId, "admin_broadcast_sent", { text: broadcastText, recipientCount: users.length });
    logger.info({ telegramId, recipientCount: users.length, broadcastText }, "Admin broadcast started");

    await bot.sendMessage(chatId, `📢 Начинаю рассылку *${users.length}* пользователям...`, { parse_mode: "Markdown" });

    let success = 0;
    let failed = 0;
    for (const user of users) {
      try {
        await bot.sendMessage(user.telegram_id, broadcastText);
        success++;
      } catch {
        failed++;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    logAction(telegramId, "admin_broadcast_completed", { success, failed });
    logger.info({ telegramId, success, failed }, "Admin broadcast completed");

    await bot.sendMessage(
      chatId,
      `✅ Рассылка завершена\n✔️ Успешно: ${success}\n❌ Ошибок: ${failed}`
    );
    return true;
  }

  if (text.startsWith("GRANT_SUB:")) {
    const parts = text.slice("GRANT_SUB:".length).trim().split(":");
    const targetId = parseInt(parts[0]);
    const days = parseInt(parts[1] ?? "30");

    if (isNaN(targetId) || isNaN(days)) {
      await bot.sendMessage(chatId, "❌ Неверный формат. Используйте: `GRANT_SUB:<id>:<дни>`", { parse_mode: "Markdown" });
      return true;
    }

    const db = getDb();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    db.prepare(
      `UPDATE users SET has_subscription = 1, subscription_expires = ?, updated_at = datetime('now') WHERE telegram_id = ?`
    ).run(expiresAt.toISOString(), targetId);

    logAction(telegramId, "admin_grant_subscription", { targetId, days, expiresAt: expiresAt.toISOString() });
    logger.info({ telegramId, targetId, days }, "Admin granted subscription");

    await bot.sendMessage(chatId, `✅ Подписка на *${days}* дней выдана пользователю \`${targetId}\``, { parse_mode: "Markdown" });
    return true;
  }

  if (text.startsWith("REVOKE_SUB:")) {
    const targetId = parseInt(text.slice("REVOKE_SUB:".length).trim());

    if (isNaN(targetId)) {
      await bot.sendMessage(chatId, "❌ Неверный формат. Используйте: `REVOKE_SUB:<id>`", { parse_mode: "Markdown" });
      return true;
    }

    const db = getDb();
    db.prepare(
      `UPDATE users SET has_subscription = 0, subscription_expires = NULL, updated_at = datetime('now') WHERE telegram_id = ?`
    ).run(targetId);

    logAction(telegramId, "admin_revoke_subscription", { targetId });
    logger.info({ telegramId, targetId }, "Admin revoked subscription");

    await bot.sendMessage(chatId, `✅ Подписка отозвана у пользователя \`${targetId}\``, { parse_mode: "Markdown" });
    return true;
  }

  return false;
}
