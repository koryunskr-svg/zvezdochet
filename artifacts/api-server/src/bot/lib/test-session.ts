import { getDb } from "../db";

export function startTestSession(adminId: number, testUserId: number): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO test_sessions (admin_id, test_user_id) VALUES (?, ?)").run(adminId, testUserId);
}

export function endTestSession(adminId: number): { admin_id: number; test_user_id: number } | null {
  const db = getDb();
  const session = db.prepare("SELECT admin_id, test_user_id FROM test_sessions WHERE admin_id = ?").get(adminId) as { admin_id: number; test_user_id: number } | undefined;
  if (session) { db.prepare("DELETE FROM test_sessions WHERE admin_id = ?").run(adminId); return session; }
  return null;
}

export function getTestUserForAdmin(adminId: number): number | null {
  const db = getDb();
  const result = db.prepare("SELECT test_user_id FROM test_sessions WHERE admin_id = ?").get(adminId) as { test_user_id: number } | undefined;
  return result?.test_user_id ?? null;
}

export function getAdminForTestUser(testUserId: number): number | null {
  const db = getDb();
  const result = db.prepare("SELECT admin_id FROM test_sessions WHERE test_user_id = ?").get(testUserId) as { admin_id: number } | undefined;
  return result?.admin_id ?? null;
}

export function isAdminInTestMode(adminId: number): boolean {
  return getTestUserForAdmin(adminId) !== null;
}
