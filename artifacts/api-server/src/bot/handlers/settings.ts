import TelegramBot from "node-telegram-bot-api";
import { isAdmin } from "../lib/admin";
import { setFreeHoroscopesDefault } from "../lib/config";
import { logAction } from "../db";

export async function handleSetFree(bot: TelegramBot, msg: any): Promise<void> {
  const telegramId = msg.from?.id;
  const chatId = msg.chat.id;

  if (!isAdmin(telegramId)) {
    await bot.sendMessage(chatId, "❌ Только для администратора.");
    return;
  }

  const parts = msg.text?.split(" ");
  const value = parseInt(parts?.[1] ?? "0", 10);

  if (isNaN(value) || value < 0) {
    await bot.sendMessage(chatId, "❌ Использование: /set_free <число>\nПример: /set_free 3");
    return;
  }

  setFreeHoroscopesDefault(value);

  await bot.sendMessage(chatId, `✅ Лимит бесплатных гороскопов изменён: ${value}`);
  logAction(telegramId, "set_free_horoscopes", { newValue: value });
}
