import { useTelegram } from "@/hooks/use-telegram";
import { useGetMe, useUpdateTheme, UpdateThemeRequestTheme } from "@workspace/api-client-react";
import { Moon, Sun, Info, ExternalLink, ChevronRight, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function SettingsTab() {
  const { telegramId, tg } = useTelegram();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe({ telegram_id: telegramId });
  const { mutate: updateThemeApi } = useUpdateTheme({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/miniapp/me", { telegram_id: telegramId }] });
      }
    }
  });

  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    updateThemeApi({ 
      data: { 
        telegram_id: telegramId, 
        theme: newTheme as UpdateThemeRequestTheme 
      } 
    });
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500">
      <header className="pt-6 pb-2 border-b border-border/50">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Settings className="w-7 h-7 text-primary" /> Настройки
        </h1>
      </header>

      <div className="space-y-4">
        <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isDark ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'}`}>
              {isDark ? <Moon className="w-6 h-6" /> : <Sun className="w-6 h-6" />}
            </div>
            <div>
              <p className="font-medium text-foreground">Тема оформления</p>
              <p className="text-xs text-muted-foreground mt-0.5">{isDark ? 'Темная магия' : 'Светлая энергия'}</p>
            </div>
          </div>
          
          <button 
            onClick={toggleTheme}
            className={`w-14 h-8 rounded-full p-1 transition-colors duration-500 ease-in-out shadow-inner ${isDark ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-500 ease-out ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-2 shadow-lg space-y-1">
          <div className="flex items-center gap-4 p-4">
            <div className="p-2 rounded-xl bg-accent/20 text-accent">
              <Info className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">О приложении</p>
              <p className="text-xs text-muted-foreground mt-0.5">Звездочет v1.0.0</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-border/50 ml-16" />
          
          <a href="https://t.me/koryun_zvezdochet_bot" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl transition-colors">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">Бот в Telegram</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </a>
        </div>
      </div>
    </div>
  );
}
