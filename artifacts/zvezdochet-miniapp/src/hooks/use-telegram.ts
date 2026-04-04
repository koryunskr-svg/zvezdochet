import { useEffect, useState } from 'react';

export function useTelegram() {
  const [tg, setTg] = useState<any>(null);

  useEffect(() => {
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.expand();
      telegram.ready();
      setTg(telegram);
      console.log('[Telegram] WebApp loaded, user:', telegram.initDataUnsafe?.user);
    } else {
      console.log('[Telegram] WebApp NOT available');
    }
  }, []);

  const user = tg?.initDataUnsafe?.user || {
    id: 123456789,
    first_name: "Test",
    username: "testuser"
  };

  console.log('[useTelegram] returning telegramId:', user.id);

  return {
    tg,
    user,
    telegramId: 1163253697 as number // HARDCODED FOR DEBUG
  };
}
