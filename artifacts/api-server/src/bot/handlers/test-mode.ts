import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, createUser } from "../services/user";
import { handleStart } from "./onboarding";
import { logAction, getDb } from "../db";
import { logger } from "../../lib/logger";
import { isAdmin } from "../lib/admin";

const TEST_USER_PREFIX = 999000;
let testCounter = 1;

export async function handleTestNew(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const adminId = msg.from!.id;

  if (!isAdmin(adminId)) {
    await bot.sendMessage(msg.chat.id, "❌ Доступ только для админов");
    return;
  }

  const testUserId = TEST_USER_PREFIX + testCounter++;
  const testUsername = `test_user_${testUserId}`;

  // Создаём тест-юзера
  createUser(testUserId, testUsername, "Тестовый Пользователь", undefined);
  logAction(adminId, "test_mode_created", { testUserId });

  // Имитируем сообщение /start от тест-юзера
  const fakeMsg = {
    ...msg,
    from: { id: testUserId, username: testUsername, first_name: "Тестовый Пользователь", is_bot: false },
    text: "/start",
    chat: { id: msg.chat.id, type: "private" }
  } as TelegramBot.Message;

  await bot.sendMessage(msg.chat.id, `🧪 Тест-режим активирован для юзера #${testUserId}\nПроходи онбординг, проверяй функции.\nДля удаления: /test_delete ${testUserId}`);

  // Запускаем онбординг от имени тест-юзера
  await handleStart(bot, fakeMsg);
}

export async function handleTestDelete(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  testUserId: number
): Promise<void> {
  const adminId = msg.from!.id;

  if (!isAdmin(adminId)) {
    await bot.sendMessage(msg.chat.id, "❌ Доступ только для админов");
    return;
  }

  if (testUserId < TEST_USER_PREFIX) {
    await bot.sendMessage(msg.chat.id, "❌ Можно удалять только тест-юзеров (ID >= 999000)");
    return;
  }

  // Удаляем через прямой SQL
  const db = getDb();
  db.prepare("DELETE FROM users WHERE telegram_id = ?").run(testUserId);
  db.prepare("DELETE FROM horoscopes WHERE user_id = ?").run(testUserId);
  db.prepare("DELETE FROM payments WHERE user_id = ?").run(testUserId);

  logAction(adminId, "test_mode_deleted", { testUserId });

  await bot.sendMessage(msg.chat.id, `✅ Тест-юзер #${testUserId} удалён`);
}