import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { createBot } from "./bot/index";
import { getDb } from "./bot/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

getDb();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

if (process.env.BOT_ENABLED === "true") {
  try {
    createBot();
    logger.info("Telegram bot started successfully");
  } catch (err) {
    logger.error({ err }, "Failed to start Telegram bot");
    process.exit(1);
  }
} else {
  logger.info("Telegram bot disabled (BOT_ENABLED != true)");
}
