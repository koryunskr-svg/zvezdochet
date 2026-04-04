import { Router, type IRouter } from "express";
import {
  GetMeQueryParams,
  GenerateHoroscopeBody,
  GetHistoryQueryParams,
  UpdateThemeBody,
  SubscribeBody,
  GetReferralQueryParams,
} from "@workspace/api-zod";
import {
  findUserByTelegramId,
  getUserStats,
  getHoroscoreHistory,
  canGetHoroscope,
  decrementFreeHoroscopes,
  updateUserTheme,
} from "../bot/services/user";
import { generateHoroscope } from "../bot/services/ai";
import { createMockPayment } from "../bot/services/payment";
import { getDb, logAction } from "../bot/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/me", (req, res) => {
  const parsed = GetMeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params: telegram_id is required" });
    return;
  }

  const telegramId = parsed.data.telegram_id;
  req.log.info({ telegramId }, "miniapp: GET /me");
  console.log("[API /me] Request received for telegram_id:", telegramId);
  logAction(telegramId, "miniapp_get_me", {});

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    res.status(404).json({ error: "User not found. Please start the bot first with /start" });
    return;
  }

  const stats = getUserStats(telegramId);

  res.json({
    id: user.id,
    telegram_id: user.telegram_id,
    name: user.name,
    username: user.username,
    birth_date: user.birth_date,
    zodiac_sign: user.zodiac_sign,
    referral_code: user.referral_code,
    free_horoscopes: user.free_horoscopes,
    has_subscription: user.has_subscription,
    subscription_expires: user.subscription_expires,
    theme: user.theme,
    horoscope_count: stats.horoscopeCount,
    referral_count: stats.referralCount,
  });
});

router.post("/horoscope", async (req, res) => {
  const parsed = GenerateHoroscopeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { telegram_id: telegramId, type = "daily" } = parsed.data;
  req.log.info({ telegramId, type }, "miniapp: POST /horoscope");

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    res.status(404).json({ error: "User not found. Please start the bot first with /start" });
    return;
  }

  if (!user.birth_date || !user.zodiac_sign) {
    res.status(400).json({ error: "Profile incomplete. Please complete onboarding in the bot." });
    return;
  }

  if (!canGetHoroscope(user)) {
    res.status(403).json({
      error: "No horoscopes available. Subscribe or invite friends to get more.",
    });
    return;
  }

  logAction(telegramId, "miniapp_horoscope_requested", { type });

  try {
    const content = await generateHoroscope(
      telegramId,
      user.zodiac_sign,
      user.name ?? "Друг",
      user.birth_date,
      type as "daily" | "weekly" | "love" | "career"
    );

    const db = getDb();
    db.prepare(
      `INSERT INTO horoscopes (user_id, type, content, zodiac_sign) VALUES (?, ?, ?, ?)`
    ).run(user.id, type, content, user.zodiac_sign);

    if (user.has_subscription === 0) {
      decrementFreeHoroscopes(user.id);
    }

    const freshUser = findUserByTelegramId(telegramId);

    res.json({
      content,
      zodiac_sign: user.zodiac_sign,
      type,
      free_horoscopes_remaining: freshUser?.free_horoscopes ?? 0,
      has_subscription: freshUser?.has_subscription ?? 0,
    });
  } catch (err) {
    logger.error({ err, telegramId }, "miniapp: horoscope generation failed");
    logAction(telegramId, "miniapp_horoscope_error", { error: String(err) }, "error");
    res.status(500).json({ error: "Failed to generate horoscope. Please try again later." });
  }
});

router.get("/history", (req, res) => {
  const parsed = GetHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { telegram_id: telegramId, limit = 10 } = parsed.data;
  req.log.info({ telegramId, limit }, "miniapp: GET /history");
  logAction(telegramId, "miniapp_history_viewed", { limit });

  const items = getHoroscoreHistory(telegramId, limit);
  res.json({ items, total: items.length });
});

router.post("/theme", (req, res) => {
  const parsed = UpdateThemeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { telegram_id: telegramId, theme } = parsed.data;
  req.log.info({ telegramId, theme }, "miniapp: POST /theme");

  updateUserTheme(telegramId, theme as "light" | "dark");

  res.json({ success: true, message: `Theme updated to ${theme}` });
});

router.post("/subscribe", async (req, res) => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { telegram_id: telegramId } = parsed.data;
  req.log.info({ telegramId }, "miniapp: POST /subscribe");

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  try {
    const result = await createMockPayment(telegramId, user.id, 29900);
    const freshUser = findUserByTelegramId(telegramId);

    res.json({
      success: result.success,
      message: result.message,
      payment_id: result.paymentId,
      is_mock: result.isMock,
      subscription_expires: freshUser?.subscription_expires ?? null,
    });
  } catch (err) {
    logger.error({ err, telegramId }, "miniapp: subscription failed");
    res.status(500).json({ error: "Payment processing failed. Please try again." });
  }
});

router.get("/referral", async (req, res) => {
  const parsed = GetReferralQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }

  const { telegram_id: telegramId } = parsed.data;
  req.log.info({ telegramId }, "miniapp: GET /referral");

  const user = findUserByTelegramId(telegramId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let botUsername = "koryun_zvezdochet_bot";
  try {
    const db = getDb();
    const cached = db.prepare(`SELECT details FROM logs WHERE action = 'bot_username_cached' LIMIT 1`).get() as { details: string } | null;
    if (cached?.details) {
      botUsername = JSON.parse(cached.details).username ?? botUsername;
    }
  } catch {}

  const stats = getUserStats(telegramId);
  const referralLink = `https://t.me/${botUsername}?start=${user.referral_code}`;

  res.json({
    referral_code: user.referral_code,
    referral_link: referralLink,
    referral_count: stats.referralCount,
    free_horoscopes: user.free_horoscopes,
    bot_username: botUsername,
  });
});

export default router;
