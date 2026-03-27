import TelegramBot from "node-telegram-bot-api";
import { getDb, logAction } from "../db";
import { isAdmin, isSuperAdmin } from "../lib/admin";
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

  const isSuper = isSuperAdmin(telegramId);

  await bot.sendMessage(chatId, "⚙️ *Панель администратора*\nВыберите действие:", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "📊 Статистика", callback_data: "admin_stats" }],
        [{ text: "📢 Рассылка", callback_data: "admin_broadcast" }],
        [{ text: "⚙️ Настройки", callback_data: "admin_settings" }],
        ...(isSuper ? [[{ text: "👥 Управление админами", callback_data: "admin_admins" }]] : []),
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

    await bot.sendMessage(chatId, "⚙️ *Настройки*\nВыберите действие:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎁 Выдать подписку пользователю", callback_data: "admin_grant_sub" }],
          [{ text: "🚫 Отозвать подписку", callback_data: "admin_revoke_sub" }],
          [{ text: "🔮 Лимит бесплатных попыток", callback_data: "admin_free_limit" }],
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
  } else if (data === "admin_free_limit") {
    logAction(telegramId, "admin_free_limit_opened", {});
    logger.info({ telegramId }, "Admin opened free limit settings");

    await bot.sendMessage(
      chatId,
      "🔮 *Лимит бесплатных попыток*\n\nОтправьте число попыток для новых пользователей (например, `5`):",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_settings" }]],
        },
      }
    );
  } else if (data === "admin_admins") {
    if (!isSuperAdmin(telegramId)) {
      await bot.sendMessage(chatId, "⛔ Только для главного админа.");
      return;
    }

    logAction(telegramId, "admin_admins_opened", {});
    logger.info({ telegramId }, "Admin opened admins management");

    const db = getDb();
    const admins = db.prepare("SELECT telegram_id, is_super_admin, created_at FROM admins ORDER BY created_at").all() as { telegram_id: number; is_super_admin: number; created_at: string }[];

    let text = "👥 *Управление админами*\n\n";
    const keyboard: any[][] = [];

    for (const admin of admins) {
      const isSuper = admin.is_super_admin ? " 👑" : "";
      text += `• ${admin.telegram_id}${isSuper}\n`;
      if (admin.telegram_id !== telegramId) {
        keyboard.push([{ text: `❌ Удалить ${admin.telegram_id}`, callback_data: `admin_remove_${admin.telegram_id}` }]);
      }
    }

    keyboard.push([{ text: "➕ Добавить админа", callback_data: "admin_add" }]);
    keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } else if (data === "admin_add") {
    if (!isSuperAdmin(telegramId)) {
      await bot.sendMessage(chatId, "⛔ Только для главного админа.");
      return;
    }

    logAction(telegramId, "admin_add_initiated", {});
    await bot.sendMessage(
      chatId,
      "➕ *Добавить админа*\n\nОтправьте Telegram ID нового админа.\n\nКак узнать ID:\n1. Попросите человека написать боту @userinfobot\n2. Скопируйте его ID\n3. Отправьте мне",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_admins" }]],
        },
      }
    );
  } else if (data.startsWith("admin_remove_")) {
    if (!isSuperAdmin(telegramId)) {
      await bot.sendMessage(chatId, "⛔ Только для главного админа.");
      return;
    }

    const targetId = parseInt(data.replace("admin_remove_", ""));
    const db = getDb();
    db.prepare("DELETE FROM admins WHERE telegram_id = ?").run(targetId);

    logAction(telegramId, "admin_removed", { targetId });
    logger.info({ telegramId, targetId }, "Admin removed");

    await bot.answerCallbackQuery(query.id, { text: `✅ Админ ${targetId} удалён` });
    await bot.deleteMessage(chatId, query.message!.message_id);
    
    const admins = db.prepare("SELECT telegram_id, is_super_admin, created_at FROM admins ORDER BY created_at").all() as { telegram_id: number; is_super_admin: number; created_at: string }[];

    let text = "👥 *Управление админами*\n\n";
    const keyboard: any[][] = [];

    for (const admin of admins) {
      const isSuper = admin.is_super_admin ? " 👑" : "";
      text += `• ${admin.telegram_id}${isSuper}\n`;
      if (admin.telegram_id !== telegramId) {
        keyboard.push([{ text: `❌ Удалить ${admin.telegram_id}`, callback_data: `admin_remove_${admin.telegram_id}` }]);
      }
    }

    keyboard.push([{ text: "➕ Добавить админа", callback_data: "admin_add" }]);
    keyboard.push([{ text: "🔙 Назад", callback_data: "admin_back" }]);

    await bot.sendMessage(chatId, text, {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: keyboard },
    });
  } else if (data === "admin_back") {
    logAction(telegramId, "admin_menu_opened", {});
    await bot.sendMessage(chatId, "⚙️ *Панель администратора*\nВыберите действие:", {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📊 Статистика", callback_data: "admin_stats" }],
          [{ text: "📢 Рассылка", callback_data: "admin_broadcast" }],
          [{ text: "⚙️ Настройки", callback_data: "admin_settings" }],
          [{ text: "👥 Управление админами", callback_data: "admin_admins" }],
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

  // 1. Сначала проверяем команды с префиксами
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

  // 2. Проверяем число — если супер-админ, то это ID для добавления админа
  //    Если обычный админ — это лимит попыток
  if (/^\d+$/.test(text.trim())) {
    const value = parseInt(text.trim(), 10);
    const db = getDb();

    if (isSuperAdmin(telegramId)) {
      // Супер-админ: добавляем админа
      if (value === telegramId) {
        await bot.sendMessage(chatId, "❌ Вы уже админ.");
        return true;
      }

      db.prepare("INSERT OR IGNORE INTO admins (telegram_id) VALUES (?)").run(value);
      logAction(telegramId, "admin_added", { targetId: value });
      logger.info({ telegramId, targetId: value }, "Admin added");
      await bot.sendMessage(
        chatId,
        `✅ Админ добавлен: \`${value}\`\n\nНажмите "🔙 Назад" чтобы вернуться в список.`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🔙 Назад", callback_data: "admin_admins" }]],
          },
        }
      );
      return true;
    } else {
      // Обычный админ: меняем лимит попыток
      db.prepare("INSERT OR REPLACE INTO config (key, value) VALUES ('free_horoscopes_default', ?)").run(value);
      logAction(telegramId, "admin_free_limit_set", { newValue: value });
      logger.info({ telegramId, limit: value }, "Admin set free horoscopes limit");
      await bot.sendMessage(chatId, `✅ Лимит изменён: *${value}* попыток для новых пользователей`, { parse_mode: "Markdown" });
      return true;
    }
  }

  return false;
}
