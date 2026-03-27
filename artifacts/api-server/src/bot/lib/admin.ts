import { getDb } from "../db";

export function isAdmin(telegramId: number): boolean {
  const db = getDb();
  const admin = db.prepare("SELECT telegram_id FROM admins WHERE telegram_id = ?").get(telegramId) as { telegram_id: number } | undefined;
  return !!admin;
}

export function isSuperAdmin(telegramId: number): boolean {
  const db = getDb();
  const admin = db.prepare("SELECT telegram_id FROM admins WHERE telegram_id = ? AND is_super_admin = 1").get(telegramId) as { telegram_id: number } | undefined;
  return !!admin;
}
