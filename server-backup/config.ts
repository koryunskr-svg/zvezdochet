import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve(process.cwd(), "bot-config.json");

interface BotConfig {
  freeHoroscopesDefault: number;
}

const DEFAULT_CONFIG: BotConfig = {
  freeHoroscopesDefault: 1,
};

export function loadConfig(): BotConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.error("Failed to load config, using defaults", err);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: BotConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function setFreeHoroscopesDefault(value: number): void {
  const config = loadConfig();
  config.freeHoroscopesDefault = value;
  saveConfig(config);
}
