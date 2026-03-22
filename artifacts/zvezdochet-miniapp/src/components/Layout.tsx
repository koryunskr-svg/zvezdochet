import { Link, useLocation } from "wouter";
import { Calendar, User, History, Settings, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/use-telegram";
import { useEffect } from "react";
import { useGetMe } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { tg, telegramId } = useTelegram();
  const { data: user } = useGetMe({ telegram_id: telegramId });

  useEffect(() => {
    if (user?.theme) {
      if (user.theme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else if (tg?.colorScheme) {
      if (tg.colorScheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [user?.theme, tg?.colorScheme]);

  const navItems = [
    { href: "/", icon: Calendar, label: "Гороскоп" },
    { href: "/profile", icon: User, label: "Профиль" },
    { href: "/history", icon: History, label: "История" },
    { href: "/settings", icon: Settings, label: "Настройки" },
    { href: "/subscription", icon: Gem, label: "Подписка" },
  ];

  return (
    <div className="min-h-screen flex flex-col relative w-full overflow-hidden text-foreground">
      {/* Background Image with adaptive blend mode */}
      <div 
        className="fixed inset-0 z-[-1] bg-background/80 dark:bg-background/90 transition-colors duration-500"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}images/cosmic-bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay',
        }}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 relative z-10 w-full max-w-md mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-all duration-300 relative outline-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => {
                  if (tg?.HapticFeedback) {
                    tg.HapticFeedback.impactOccurred('light');
                  }
                }}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full shadow-[0_0_10px_theme(colors.primary)]" />
                )}
                <item.icon className={cn("w-5 h-5 transition-all duration-300", isActive && "drop-shadow-[0_0_8px_rgba(168,85,247,0.6)] scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
