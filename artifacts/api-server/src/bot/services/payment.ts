import { logger } from "../../lib/logger";
import { logAction, getDb } from "../db";

export interface PaymentResult {
  success: boolean;
  paymentId: string;
  message: string;
  isMock: boolean;
}

export async function createMockPayment(
  telegramId: number,
  userId: number,
  amount: number = 299
): Promise<PaymentResult> {
  const paymentId = `mock_${Date.now()}_${userId}`;

  logger.info({ telegramId, userId, amount, paymentId }, "Creating mock payment");
  logAction(telegramId, "payment_mock_created", { paymentId, amount });

  const db = getDb();
  db.prepare(
    `INSERT INTO payments (user_id, payment_id, amount, status, is_mock) VALUES (?, ?, ?, 'pending', 1)`
  ).run(userId, paymentId, amount);

  await new Promise((r) => setTimeout(r, 1500));

  db.prepare(
    `UPDATE payments SET status = 'succeeded', updated_at = datetime('now') WHERE payment_id = ?`
  ).run(paymentId);

  db.prepare(
    `UPDATE users SET
      has_subscription = 1,
      subscription_expires = datetime('now', '+30 days'),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(userId);

  logger.info({ telegramId, userId, paymentId }, "Mock payment succeeded, subscription activated");
  logAction(telegramId, "payment_mock_success", { paymentId, amount, subscriptionDays: 30 });

  return {
    success: true,
    paymentId,
    message: "✅ Оплата прошла успешно (тестовый режим)! Подписка активирована на 30 дней.",
    isMock: true,
  };
}

/*
 * YooKassa production integration (uncomment when credentials are available)
 *
 * import { v4 as uuidv4 } from "uuid";
 *
 * export async function createYooKassaPayment(
 *   telegramId: number,
 *   userId: number,
 *   amount: number = 299
 * ): Promise<PaymentResult> {
 *   const idempotenceKey = uuidv4();
 *   const response = await fetch("https://api.yookassa.ru/v3/payments", {
 *     method: "POST",
 *     headers: {
 *       "Content-Type": "application/json",
 *       "Idempotence-Key": idempotenceKey,
 *       Authorization: "Basic " + Buffer.from(
 *         `${process.env.YOOKASSA_SHOP_ID}:${process.env.YOOKASSA_SECRET_KEY}`
 *       ).toString("base64"),
 *     },
 *     body: JSON.stringify({
 *       amount: { value: (amount / 100).toFixed(2), currency: "RUB" },
 *       confirmation: { type: "redirect", return_url: process.env.MINI_APP_URL },
 *       capture: true,
 *       description: "Подписка на Астролог — 30 дней",
 *     }),
 *   });
 *   const data = await response.json();
 *   return {
 *     success: data.status === "succeeded",
 *     paymentId: data.id,
 *     message: data.confirmation?.confirmation_url ?? "Оплата создана",
 *     isMock: false,
 *   };
 * }
 */
