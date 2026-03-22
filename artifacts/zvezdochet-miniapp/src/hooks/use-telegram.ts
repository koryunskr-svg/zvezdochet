import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);

  useEffect(() => {
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.expand();
      telegram.ready();
      setTg(telegram);
    }
  }, []);

  // Use Telegram user if available, fallback to a mock ID for local testing
  const user = tg?.initDataUnsafe?.user || {
    id: 123456789,
    first_name: "Test",
    username: "testuser"
  };

  return {
    tg,
    user,
    telegramId: user.id as number
  };
}
