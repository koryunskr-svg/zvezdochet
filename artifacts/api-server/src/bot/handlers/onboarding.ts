import TelegramBot from "node-telegram-bot-api";
import { findUserByTelegramId, createUser, updateUserProfile, findUserByReferralCode } from "../services/user";
import { logAction } from "../db";
import { logger } from "../../lib/logger";

type OnboardingState = {
  step: "awaiting_name" | "awaiting_birth_date";
};

const onboardingStates = new Map<number, OnboardingState>();

export function isInOnboarding(telegramId: number): boolean {
  return onboardingStates.has(telegramId);
}

export function getOnboardingStep(telegramId: number): OnboardingState | undefined {
  return onboardingStates.get(telegramId);
}

export function clearOnboarding(telegramId: number): void {
  onboardingStates.delete(telegramId);
}

const tempNames = new Map<number, string>();

export async function handleStart(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<void> {
  const telegramId = msg.from!.id;
  const username = msg.from?.username ?? null;
  const firstName = msg.from?.first_name ?? null;
  const text = msg.text ?? "";

  logger.info({ telegramId, username }, "Bot /start received");
  logAction(telegramId, "bot_start", { username, firstName });

  const referralCode = text.replace("/start", "").trim() || undefined;

  let user = findUserByTelegramId(telegramId);

  if (!user) {
    user = createUser(telegramId, username, firstName, referralCode);
  }

  if (user.name && user.birth_date) {
    await sendMainMenu(bot, msg.chat.id, user.name);
    return;
  }

  onboardingStates.set(telegramId, { step: "awaiting_name" });

  const welcomeText =
    `🌟 *Добро пожаловать к Звездочету!*\n\n` +
    `Я — Звездочет, ваш персональный астролог. Составлю гороскоп специально для вас, учитывая вашу дату рождения и положение звёзд.\n\n` +
    `Для начала, как вас зовут? ✨`;

  await bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: "Markdown" });
  logAction(telegramId, "onboarding_started", {});
}

export async function handleOnboardingMessage(
  bot: TelegramBot,
  msg: TelegramBot.Message
): Promise<boolean> {
  const telegramId = msg.from!.id;
  const state = onboardingStates.get(telegramId);

  if (!state) return false;

  const text = msg.text?.trim() ?? "";

  if (state.step === "awaiting_name") {
    if (!text || text.length < 2 || text.length > 50) {
      await bot.sendMessage(msg.chat.id, "Пожалуйста, введите ваше имя (от 2 до 50 символов).");
      return true;
    }

    tempNames.set(telegramId, text);
    onboardingStates.set(telegramId, { step: "awaiting_birth_date" });

    await bot.sendMessage(
      msg.chat.id,
      `Приятно познакомиться, *${text}*! 🌙\n\nТеперь введите вашу дату рождения в формате *ДД.ММ.ГГГГ*\n\nНапример: 15.03.1990`,
      { parse_mode: "Markdown" }
    );
    logAction(telegramId, "onboarding_name_set", { name: text });
    return true;
  }

  if (state.step === "awaiting_birth_date") {
    const dateMatch = text.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (!dateMatch) {
      await bot.sendMessage(
        msg.chat.id,
        "Не удалось распознать дату. Введите в формате *ДД.ММ.ГГГГ*\nНапример: 15.03.1990",
        { parse_mode: "Markdown" }
      );
      return true;
    }

    const [, day, month, year] = dateMatch;
    const isoDate = `${year}-${month}-${day}`;
    const parsed = new Date(isoDate);

    if (isNaN(parsed.getTime())) {
      await bot.sendMessage(msg.chat.id, "Некорректная дата. Попробуйте ещё раз.");
      return true;
    }

    const now = new Date();
    const age = now.getFullYear() - parsed.getFullYear();
    if (age < 5 || age > 120) {
      await bot.sendMessage(msg.chat.id, "Проверьте дату рождения — кажется, она некорректна.");
      return true;
    }

    const name = tempNames.get(telegramId) ?? "Пользователь";
    const user = updateUserProfile(telegramId, name, isoDate);

    clearOnboarding(telegramId);
    tempNames.delete(telegramId);

    logAction(telegramId, "onboarding_completed", { name, birthDate: isoDate, zodiacSign: user.zodiac_sign });

    await bot.sendMessage(
      msg.chat.id,
      `✨ *Профиль создан!*\n\n` +
        `Имя: ${name}\n` +
        `Дата рождения: ${text}\n` +
        `Знак зодиака: *${user.zodiac_sign}* ♾️\n\n` +
        `Звёзды готовы открыть вам свои тайны! 🔮`,
      { parse_mode: "Markdown" }
    );

    await sendMainMenu(bot, msg.chat.id, name);
    return true;
  }

  return false;
}

export function getMiniAppUrl(): string | null {
  if (process.env.MINI_APP_URL) return process.env.MINI_APP_URL;
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) {
    const firstDomain = domains.split(",")[0].trim();
    return `https://${firstDomain}`;
  }
  return null;
}

export async function sendMainMenu(
  bot: TelegramBot,
  chatId: number,
  name: string
): Promise<void> {
  const miniAppUrl = getMiniAppUrl();

  const keyboard: TelegramBot.KeyboardButton[][] = [
    [{ text: "🔮 Получить гороскоп" }],
    [{ text: "👤 Личный кабинет" }, { text: "📜 История" }],
    [{ text: "👥 Реферальная программа" }, { text: "💳 Подписка" }],
  ];

  if (miniAppUrl) {
    keyboard.push([{ text: "🌐 Открыть Mini App", web_app: { url: miniAppUrl } }]);
  }

  await bot.sendMessage(
    chatId,
    `🌟 Выберите действие, *${name}*:`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        keyboard,
        resize_keyboard: true,
      },
    }
  );
}
