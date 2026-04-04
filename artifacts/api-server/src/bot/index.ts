import TelegramBot from "node-telegram-bot-api";
import { handleTestNew, handleTestDelete, handleUseUser, handleExitTest } from "./handlers/test-mode";
import { getTestUserForAdmin, endTestSession, getAdminForTestUser } from "./lib/test-session";
import { logger } from "../lib/logger";
import { logAction } from "./db";
import { handleStart, handleOnboardingMessage, isInOnboarding, sendMainMenu } from "./handlers/onboarding";
import { handleGetHoroscope, handleHoroscopeCallback } from "./handlers/horoscope";
import { handleProfile, handleHistory } from "./handlers/profile";
import { handleReferral } from "./handlers/referral";
import { handleSubscription, handleMockPayment } from "./handlers/subscription";
import { handleAdminCommand, handleAdminCallback, handleAdminMessage } from "./handlers/admin";
import { isAdmin } from "./lib/admin";
import { getAdminState } from "./handlers/admin";
import { findUserByTelegramId, updateUserTheme } from "./services/user";
import { handleSetFree } from "./handlers/settings";

export function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required but not set in environment");
  }

  const bot = new TelegramBot(token, { polling: true });
  logger.info("Telegram bot starting with polling...");

  bot.on("polling_error", (err) => logger.error({ err }, "Bot polling error"));
  bot.on("error", (err) => logger.error({ err }, "Bot general error"));

  // Commands
  bot.onText(/\/start/, async (msg) => { try { await handleStart(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /start"); }});
  bot.onText(/\/profile/, async (msg) => { try { await handleProfile(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /profile"); }});
  bot.onText(/\/history/, async (msg) => { try { await handleHistory(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /history"); }});
  bot.onText(/\/referral/, async (msg) => { try { await handleReferral(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /referral"); }});
  bot.onText(/\/subscribe/, async (msg) => { try { await handleSubscription(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /subscribe"); }});
  bot.onText(/\/koryun/, async (msg) => { try { await handleAdminCommand(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /koryun"); }});
  bot.onText(/\/set_free/, async (msg) => { try { await handleSetFree(bot, msg); } catch (err) { logger.error({ err, telegramId: msg.from?.id }, "Error in /set_free"); }});
  bot.onText(/\/test_new/, async (msg) => { await handleTestNew(bot, msg); });
  bot.onText(/\/test_delete (\d+)/, async (msg, match) => { const testUserId = parseInt(match[1]); await handleTestDelete(bot, msg, testUserId); });
  bot.onText(/\/use_user/, async (msg) => { await handleUseUser(bot, msg); });
  bot.onText(/\/exit_test/, async (msg) => { await handleExitTest(bot, msg); });

  // Messages with test-mode middleware
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;
    let telegramId = msg.from!.id;
    const text = msg.text;

    // Test-mode: подмена ID (НЕ для админов!)
    const originalId = msg.from!.id;
    const testUserId = getTestUserForAdmin(originalId);
    if (testUserId && !text.startsWith("/") && !getAdminState(originalId)) { (msg.from as any).id = testUserId; telegramId = testUserId; }

    try {
      // Сначала onboarding (важно для тест-режима!)
      if (isInOnboarding(telegramId)) { await handleOnboardingMessage(bot, msg); return; }
      // Потом админ-команды
      const handledByAdmin = await handleAdminMessage(bot, msg);
      if (handledByAdmin) return;
      // Потом обычные сообщения
      const user = findUserByTelegramId(telegramId);
      switch (text) {
        case "🔮 Получить гороскоп": await handleGetHoroscope(bot, msg); break;
        case "👤 Личный кабинет": await handleProfile(bot, msg); break;
        case "📜 История": await handleHistory(bot, msg); break;
        case "👥 Реферальная программа": await handleReferral(bot, msg); break;
        case "💳 Подписка": await handleSubscription(bot, msg); break;
        default:
          if (!user || !user.name) { await bot.sendMessage(msg.chat.id, "Отправьте /start для начала работы."); }
          else { await sendMainMenu(bot, msg.chat.id, user.name); }
      }
    } catch (err) { logger.error({ err, telegramId, text }, "Error handling message"); logAction(telegramId, "message_handler_error", { text, error: String(err) }, "error"); }
  });

  // Callbacks with test-mode middleware
  bot.on("callback_query", async (query) => {
    let telegramId = query.from.id;
    const data = query.data ?? "";
    const testUserId = getTestUserForAdmin(telegramId);
    if (testUserId && !data.startsWith("admin_")) { (query.from as any).id = testUserId; telegramId = testUserId; }

    logger.info({ telegramId, callbackData: data }, "Callback query received");
    logAction(telegramId, "callback_query", { data });

    try {
      if (data.startsWith("admin_") || data.startsWith("sub_detail_")) { await bot.answerCallbackQuery(query.id); await handleAdminCallback(bot, query); }
      else if (data === "subscribe" || data === "pay_show") { await bot.answerCallbackQuery(query.id); await handleSubscription(bot, { chat: query.message!.chat, from: query.from, text: "" } as any); }
      else if (data === "pay_mock") { await handleMockPayment(bot, query); }
      else if (data === "get_horoscope") { await bot.answerCallbackQuery(query.id); await handleGetHoroscope(bot, { chat: query.message!.chat, from: query.from, text: "" } as any); }
      else if (data === "horoscope_love") { await handleHoroscopeCallback(bot, query, "love"); }
      else if (data === "horoscope_career") { await handleHoroscopeCallback(bot, query, "career"); }
      else if (data === "profile") { await bot.answerCallbackQuery(query.id); await handleProfile(bot, { chat: query.message!.chat, from: query.from, text: "" } as any); }
      else if (data === "referral") { await bot.answerCallbackQuery(query.id); await handleReferral(bot, { chat: query.message!.chat, from: query.from, text: "" } as any); }
      else if (data === "main_menu") { await bot.answerCallbackQuery(query.id); const user = findUserByTelegramId(telegramId); if (user?.name) { await sendMainMenu(bot, query.message!.chat.id, user.name); } }
      else if (data === "copy_referral") { const user = findUserByTelegramId(telegramId); if (user) { const botUsername = (await bot.getMe()).username; const refLink = `https://t.me/${botUsername}?start=${user.referral_code}`; await bot.answerCallbackQuery(query.id, { text: refLink, show_alert: true }); } }
      else if (data.startsWith("theme_")) { const theme = data.replace("theme_", "") as "light" | "dark"; updateUserTheme(telegramId, theme); await bot.answerCallbackQuery(query.id, { text: theme === "dark" ? "🌙 Тёмная тема включена" : "☀️ Светлая тема включена" }); await handleProfile(bot, { chat: query.message!.chat, from: query.from, text: "" } as any); }
      else if (data === "edit_profile") { await bot.answerCallbackQuery(query.id); await bot.sendMessage(query.message!.chat.id, "Для изменения профиля отправьте /start и пройдите регистрацию заново."); }
      else if (data === "noop") { await bot.answerCallbackQuery(query.id, { text: "Подписка уже активна ✅" }); }
      else if (data === "exit_test_mode") { await bot.answerCallbackQuery(query.id); const testUserId = query.from.id; const adminId = getAdminForTestUser(testUserId) || query.from.id; const session = endTestSession(adminId); if (session) { logAction(adminId, "test_session_ended", { testUserId: session.testUserId }); await bot.editMessageText("✅ Вы вышли из тест-режима", { chat_id: query.message!.chat.id, message_id: query.message!.message_id, reply_markup: undefined }); } }
      else { await bot.answerCallbackQuery(query.id); }
    } catch (err) { logger.error({ err, telegramId, data }, "Error in callback query handler"); logAction(telegramId, "callback_error", { data, error: String(err) }, "error"); await bot.answerCallbackQuery(query.id, { text: "Произошла ошибка. Попробуйте ещё раз." }); }
  });

  logger.info("Telegram bot initialized and ready");
  return bot;
}
