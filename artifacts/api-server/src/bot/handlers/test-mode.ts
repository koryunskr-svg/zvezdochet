import { startTestSession, endTestSession, getTestUserForAdmin, isAdminInTestMode } from "../lib/test-session";
import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, createUser } from "../services/user";
import { handleStart, setOnboardingState } from "./onboarding";
import { logAction, getDb } from "../db";
import { logger } from "../../lib/logger";
import { clearAdminState } from "./admin";
import { isAdmin } from "../lib/admin";

const exitTestInlineKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: "🔙 Выйти из тест-режима", callback_data: "exit_test_mode" }]]
  }
};

const TEST_USER_PREFIX = 999000;
let testCounter = 1;

export async function handleTestNew(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const adminId = msg.from!.id;
  clearAdminState(adminId);

  if (!isAdmin(adminId)) {
    await bot.sendMessage(msg.chat.id, "❌ Доступ только для админов");
    return;
  }
  const nameArg = msg.text?.split(" ")[1];

  const testUserId = TEST_USER_PREFIX + testCounter++;
  const testUsername = `test_user_${testUserId}`;

  // Создаём тест-юзера
  createUser(testUserId, testUsername, `Тест${testCounter - 1}`, undefined);
  logAction(adminId, "test_mode_created", { testUserId });

  await bot.sendMessage(msg.chat.id, `🧪 Тест-юзер #${testUserId} (Тест${testCounter - 1}) создан\nДля удаления: /test_delete ${testUserId}`);

  // Запускаем тест-сессию и онбординг
  await bot.sendMessage(msg.chat.id, "💡 Ты в тест-режиме. Нажми кнопку ниже, чтобы выйти.", exitTestInlineKeyboard);
  startTestSession(adminId, testUserId);
  // Запускаем onboarding для тест-юзера
  setOnboardingState(testUserId, "awaiting_name");
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO onboarding (telegram_id, step, created_at) VALUES (?, 'name', datetime('now'))").run(testUserId);
  await bot.sendMessage(msg.chat.id, "👋 Привет! Я — бот-астролог.\n\nКак тебя зовут?");

}

export async function handleTestDelete(
  bot: TelegramBot,
  msg: TelegramBot.Message,
  testUserId: number
): Promise<void> {
  const adminId = msg.from!.id;
  clearAdminState(adminId);

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
export async function handleUseUser(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const adminId = msg.from!.id;
  clearAdminState(adminId);
  const text = msg.text ?? "";
  const testUserId = parseInt(text.split(" ")[1]);

  if (!testUserId || testUserId < 999000) {
    await bot.sendMessage(msg.chat.id, "❌ Укажи валидный ID тест-юзера: /use_user 999001");
    return;
  }

  startTestSession(adminId, testUserId);
  logAction(adminId, "test_session_started", { testUserId });
  await bot.sendMessage(msg.chat.id, `🔄 Теперь ты в режиме тест-юзера #${testUserId}\nВсе сообщения обрабатываются от его имени.`, exitTestInlineKeyboard);
}

export async function handleExitTest(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const adminId = msg.from!.id;
  clearAdminState(adminId);
  const testUserId = getTestUserForAdmin(adminId);

  if (!testUserId) {
    await bot.sendMessage(msg.chat.id, "❌ Ты не в тест-режиме");
    return;
  }

  endTestSession(adminId);
  logAction(adminId, "test_session_ended", { testUserId });
  await bot.sendMessage(msg.chat.id, `✅ Выход из тест-режима. Ты снова админ #${adminId}`, { reply_markup: { remove_keyboard: true } });
}
