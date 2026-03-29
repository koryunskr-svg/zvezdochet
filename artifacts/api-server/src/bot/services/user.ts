import { getDb, logAction } from "../db";
import { getZodiacSign } from "./ai";
import { logger } from "../../lib/logger";
import { isAdmin } from "../lib/admin";
import crypto from "crypto";
import { loadConfig } from "../lib/config";

export interface User {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  name: string | null;
  birth_date: string | null;
  zodiac_sign: string | null;
  referral_code: string;
  referred_by: number | null;
  free_horoscopes: number;
  has_subscription: number;
  subscription_expires: string | null;
  theme: string;
  created_at: string;
}

function generateReferralCode(telegramId: number): string {
  return crypto
    .createHash("sha256")
    .update(`${telegramId}-${Date.now()}`)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

export function findUserByTelegramId(telegramId: number): User | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE telegram_id = ? LIMIT 1`);
  return (stmt.get(telegramId) as User) ?? null;
}

export function findUserByReferralCode(code: string): User | null {
  const db = getDb();
  const stmt = db.prepare(`SELECT * FROM users WHERE referral_code = ? LIMIT 1`);
  return (stmt.get(code) as User) ?? null;
}

export function createUser(
  telegramId: number,
  username: string | null,
  firstName: string | null,
  referredByCode?: string
): User {
  const db = getDb();
  const referralCode = generateReferralCode(telegramId);

  let referredById: number | null = null;
  if (referredByCode) {
    const referrer = findUserByReferralCode(referredByCode);
    if (referrer) {
      referredById = referrer.id;
    }
  }

  const config = loadConfig();
  db.prepare(
    `INSERT OR IGNORE INTO users (telegram_id, username, first_name, referral_code, referred_by, free_horoscopes)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(telegramId, username, firstName, referralCode, referredById, config.freeHoroscopesDefault);

  const user = findUserByTelegramId(telegramId)!;

  if (referredById) {
    db.prepare(
      `INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)`
    ).run(referredById, user.id);
    db.prepare(
      `UPDATE users SET free_horoscopes = free_horoscopes + 3, updated_at = datetime('now') WHERE id = ?`
    ).run(referredById);
    db.prepare(
      `UPDATE referrals SET bonus_granted = 1 WHERE referrer_id = ? AND referred_id = ?`
    ).run(referredById, user.id);
    logger.info({ referredById, newUserId: user.id }, "Referral bonus granted");
    logAction(telegramId, "referral_registered", { referredByCode, bonusTo: referredById });
  }

  logger.info({ telegramId, referralCode, referredById }, "New user created");
  logAction(telegramId, "user_created", { username, referralCode });

  return user;
}

export function updateUserProfile(
  telegramId: number,
  name: string,
  birthDate: string
): User {
  const db = getDb();
  const zodiacSign = getZodiacSign(birthDate);

  db.prepare(
    `UPDATE users SET name = ?, birth_date = ?, zodiac_sign = ?, updated_at = datetime('now')
     WHERE telegram_id = ?`
  ).run(name, birthDate, zodiacSign, telegramId);

  logger.info({ telegramId, name, birthDate, zodiacSign }, "User profile updated");
  logAction(telegramId, "profile_updated", { name, birthDate, zodiacSign });

  return findUserByTelegramId(telegramId)!;
}

export function updateUserTheme(telegramId: number, theme: "light" | "dark"): void {
  const db = getDb();
  db.prepare(
    `UPDATE users SET theme = ?, updated_at = datetime('now') WHERE telegram_id = ?`
  ).run(theme, telegramId);
  logAction(telegramId, "theme_changed", { theme });
}

export function canGetHoroscope(user: User): boolean {
  if (isAdmin(user.telegram_id)) return true;
  if (user.has_subscription === 1) {
    if (!user.subscription_expires) return true;
    return new Date(user.subscription_expires) > new Date();
  }
  return user.free_horoscopes > 0;
}

export function decrementFreeHoroscopes(userId: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE users SET free_horoscopes = MAX(0, free_horoscopes - 1), updated_at = datetime('now')
     WHERE id = ?`
  ).run(userId);
}

export function getUserStats(telegramId: number): {
  horoscopeCount: number;
  referralCount: number;
} {
  const db = getDb();
  const user = findUserByTelegramId(telegramId);
  if (!user) return { horoscopeCount: 0, referralCount: 0 };

  const hCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM horoscopes WHERE user_id = ?`
  ).get(user.id) as { cnt: number };

  const rCount = db.prepare(
    `SELECT COUNT(*) as cnt FROM referrals WHERE referrer_id = ?`
  ).get(user.id) as { cnt: number };

  return {
    horoscopeCount: hCount.cnt,
    referralCount: rCount.cnt,
  };
}

export function getHoroscoreHistory(telegramId: number, limit = 10): Array<{
  id: number;
  type: string;
  content: string;
  zodiac_sign: string;
  created_at: string;
}> {
  const db = getDb();
  const user = findUserByTelegramId(telegramId);
  if (!user) return [];

  return db.prepare(
    `SELECT id, type, content, zodiac_sign, created_at
     FROM horoscopes WHERE user_id = ?
     ORDER BY created_at DESC LIMIT ?`
  ).all(user.id, limit) as Array<{ id: number; type: string; content: string; zodiac_sign: string; created_at: string }>;
}
