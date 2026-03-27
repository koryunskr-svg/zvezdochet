import TelegramBot from "node-telegram-bot-api";
import { logger } from "../lib/logger";
import { logAction } from "./db";
import { handleStart, handleOnboardingMessage, isInOnboarding, sendMainMenu } from "./handlers/onboarding";
import { handleGetHoroscope, handleHoroscopeCallback } from "./handlers/horoscope";
import { handleProfile, handleHistory } from "./handlers/profile";
import { handleReferral } from "./handlers/referral";
import { handleSubscription, handleMockPayment } from "./handlers/subscription";
import { handleAdminCommand, handleAdminCallback, handleAdminMessage } from "./handlers/admin";
import { findUserByTelegramId, updateUserTheme } from "./services/user";
import { handleSetFree } from "./handlers/settings";

export function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required but not set in environment");
  }

  const bot = new TelegramBot(token, { polling: true });

  logger.info("Telegram bot starting with polling...");

  bot.on("polling_error", (err) => {
    logger.error({ err }, "Bot polling error");
  });

  bot.on("error", (err) => {
    logger.error({ err }, "Bot general error");
  });

  bot.onText(/\/start/, async (msg) => {
    try {
      await handleStart(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /start handler");
    }
  });

  bot.onText(/\/profile/, async (msg) => {
    try {
      await handleProfile(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /profile handler");
    }
  });

  bot.onText(/\/history/, async (msg) => {
    try {
      await handleHistory(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /history handler");
    }
  });

  bot.onText(/\/referral/, async (msg) => {
    try {
      await handleReferral(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /referral handler");
    }
  });

  bot.onText(/\/subscribe/, async (msg) => {
    try {
      await handleSubscription(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /subscribe handler");
    }
  });

  bot.onText(/\/koryun/, async (msg) => {
    try {
      await handleAdminCommand(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /koryun handler");
    }
  });

  bot.onText(/\/set_free/, async (msg) => {
    try {
      await handleSetFree(bot, msg);
    } catch (err) {
      logger.error({ err, telegramId: msg.from?.id }, "Error in /set_free handler");
    }
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const telegramId = msg.from!.id;
    const text = msg.text;

    try {
      const handledByAdmin = await handleAdminMessage(bot, msg);
      if (handledByAdmin) return;

      if (isInOnboarding(telegramId)) {
        await handleOnboardingMessage(bot, msg);
        return;
      }

      const user = findUserByTelegramId(telegramId);

      switch (text) {
        case "🔮 Получить гороскоп":
          await handleGetHoroscope(bot, msg);
          break;
        case "👤 Личный кабинет":
          await handleProfile(bot, msg);
          break;
        case "📜 История":
          await handleHistory(bot, msg);
          break;
        case "👥 Реферальная программа":
          await handleReferral(bot, msg);
          break;
        case "💳 Подписка":
          await handleSubscription(bot, msg);
          break;
        default:
          if (!user || !user.name) {
            await bot.sendMessage(msg.chat.id, "Отправьте /start для начала работы.");
          } else {
            await sendMainMenu(bot, msg.chat.id, user.name);
          }
      }
    } catch (err) {
      logger.error({ err, telegramId, text }, "Error handling message");
      logAction(telegramId, "message_handler_error", { text, error: String(err) }, "error");
    }
  });

  bot.on("callback_query", async (query) => {
    const telegramId = query.from.id;
    const data = query.data ?? "";

    logger.info({ telegramId, callbackData: data }, "Callback query received");
    logAction(telegramId, "callback_query", { data });

    try {
      if (data.startsWith("admin_")) {
        await handleAdminCallback(bot, query);
      } else if (data === "subscribe" || data === "pay_show") {
        await bot.answerCallbackQuery(query.id);
        await handleSubscription(bot, { chat: query.message!.chat, from: query.from, text: "" } as any);
      } else if (data === "pay_mock") {
        await handleMockPayment(bot, query);
      } else if (data === "get_horoscope") {
        await bot.answerCallbackQuery(query.id);
        await handleGetHoroscope(bot, { chat: query.message!.chat, from: query.from, text: "" } as any);
      } else if (data === "horoscope_love") {
        await handleHoroscopeCallback(bot, query, "love");
      } else if (data === "horoscope_career") {
        await handleHoroscopeCallback(bot, query, "career");
      } else if (data === "profile") {
        await bot.answerCallbackQuery(query.id);
        await handleProfile(bot, { chat: query.message!.chat, from: query.from, text: "" } as any);
      } else if (data === "referral") {
        await bot.answerCallbackQuery(query.id);
        await handleReferral(bot, { chat: query.message!.chat, from: query.from, text: "" } as any);
      } else if (data === "main_menu") {
        await bot.answerCallbackQuery(query.id);
        const user = findUserByTelegramId(telegramId);
        if (user?.name) {
          await sendMainMenu(bot, query.message!.chat.id, user.name);
        }
      } else if (data === "copy_referral") {
        const user = findUserByTelegramId(telegramId);
        if (user) {
          const botUsername = (await bot.getMe()).username;
          const refLink = `https://t.me/${botUsername}?start=${user.referral_code}`;
          await bot.answerCallbackQuery(query.id, { text: refLink, show_alert: true });
        }
      } else if (data.startsWith("theme_")) {
        const theme = data.replace("theme_", "") as "light" | "dark";
        updateUserTheme(telegramId, theme);
        await bot.answerCallbackQuery(query.id, {
          text: theme === "dark" ? "🌙 Тёмная тема включена" : "☀️ Светлая тема включена",
        });
        await handleProfile(bot, { chat: query.message!.chat, from: query.from, text: "" } as any);
      } else if (data === "edit_profile") {
        await bot.answerCallbackQuery(query.id);
        await bot.sendMessage(
          query.message!.chat.id,
          "Для изменения профиля отправьте /start и пройдите регистрацию заново."
        );
      } else if (data === "noop") {
        await bot.answerCallbackQuery(query.id, { text: "Подписка уже активна ✅" });
      } else {
        await bot.answerCallbackQuery(query.id);
      }
    } catch (err) {
      logger.error({ err, telegramId, data }, "Error in callback query handler");
      logAction(telegramId, "callback_error", { data, error: String(err) }, "error");
      await bot.answerCallbackQuery(query.id, { text: "Произошла ошибка. Попробуйте ещё раз." });
    }
  });

  logger.info("Telegram bot initialized and ready");
  return bot;
}
