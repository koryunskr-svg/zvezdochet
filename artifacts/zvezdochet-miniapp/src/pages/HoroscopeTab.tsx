import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTelegram } from "@/hooks/use-telegram";
import { useGetMe, useGenerateHoroscope, GenerateHoroscopeRequestType } from "@workspace/api-client-react";
import { Sparkles, Loader2, Lock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

export default function HoroscopeTab() {
  const { telegramId } = useTelegram();
  const queryClient = useQueryClient();
  const [type, setType] = useState<GenerateHoroscopeRequestType>(GenerateHoroscopeRequestType.daily);

  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe({ telegram_id: telegramId });
  
  const { mutate: generate, isPending, data: result, error: generateError } = useGenerateHoroscope({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/miniapp/me", { telegram_id: telegramId }] });
        queryClient.invalidateQueries({ queryKey: ["/api/miniapp/history", { telegram_id: telegramId }] });
      }
    }
  });

  const handleGenerate = () => {
    generate({ data: { telegram_id: telegramId, type } });
  };

  const types = [
    { id: GenerateHoroscopeRequestType.daily, label: "На сегодня" },
    { id: GenerateHoroscopeRequestType.love, label: "Любовь" },
    { id: GenerateHoroscopeRequestType.career, label: "Карьера" },
  ];

  if (userError && (userError as any)?.response?.status === 404) {
    return (
      <div className="p-8 text-center mt-20 flex flex-col items-center animate-in fade-in duration-700">
        <Sparkles className="w-12 h-12 text-primary mb-4 animate-pulse" />
        <h2 className="text-2xl font-heading mb-2">Звезды вас не узнают</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">Пожалуйста, вернитесь в чат с ботом и отправьте команду <span className="text-primary font-mono bg-primary/10 px-1 py-0.5 rounded">/start</span> для регистрации.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 space-y-8 min-h-full flex flex-col">
      <header className="text-center space-y-2 animate-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-300% animate-gradient">Звездочет</h1>
        <p className="text-muted-foreground text-sm font-body tracking-wide uppercase">Персональный путеводитель</p>
      </header>

      <div className="flex justify-center my-6 relative flex-shrink-0 animate-in zoom-in-95 duration-700 delay-150 fill-mode-both">
        <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full w-48 h-48 mx-auto animate-pulse" />
        <img 
          src={`${import.meta.env.BASE_URL}images/zodiac-wheel.png`} 
          alt="Zodiac Wheel" 
          className="w-56 h-56 object-contain relative z-10 animate-[spin_60s_linear_infinite] opacity-80"
        />
        {user?.zodiac_sign && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <span className="text-4xl font-heading text-primary drop-shadow-[0_0_20px_rgba(168,85,247,0.8)]">
              {user.zodiac_sign}
            </span>
          </div>
        )}
      </div>

      <div className="bg-card/40 backdrop-blur-md rounded-2xl p-1 border border-border shadow-lg flex animate-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
        {types.map(t => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-xl transition-all duration-300 ${
              type === t.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col justify-end pb-4">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="bg-card/70 backdrop-blur-xl border border-primary/20 rounded-3xl p-6 shadow-[0_10px_40px_-10px_rgba(168,85,247,0.2)] relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
              <h2 className="text-xl font-heading mb-4 text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Ваш {type === 'love' ? 'любовный ' : type === 'career' ? 'карьерный ' : 'ежедневный '}прогноз
              </h2>
              <div className="text-foreground/90 whitespace-pre-wrap leading-relaxed text-sm font-body">
                {result.content}
              </div>
              <button 
                onClick={() => {
                  queryClient.resetQueries({ queryKey: ["generateHoroscope"] });
                }}
                className="mt-6 w-full py-3 rounded-xl border border-primary/30 text-primary font-medium hover:bg-primary/10 transition-colors"
              >
                Вернуться
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="action"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <button
                onClick={handleGenerate}
                disabled={isPending || isUserLoading || (!user?.has_subscription && user?.free_horoscopes === 0)}
                className="w-full relative group overflow-hidden rounded-2xl p-[1px] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-70 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-sm" />
                <div className="relative bg-card/90 backdrop-blur-md w-full py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/10 group-hover:bg-card/70 transition-colors">
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-accent" />
                  )}
                  <span className="font-heading font-bold text-lg tracking-wider text-foreground">
                    {isPending ? "Читаем звезды..." : "Узнать будущее"}
                  </span>
                </div>
              </button>

              {user && (
                <div className="text-center text-sm text-muted-foreground animate-in fade-in duration-1000">
                  {user.has_subscription ? (
                    <span className="text-primary flex items-center justify-center gap-1.5 font-medium">
                      <Sparkles className="w-4 h-4" /> Безлимитный доступ активен
                    </span>
                  ) : (
                    <p>Доступно бесплатных прогнозов: <span className="font-bold text-foreground text-base ml-1">{user.free_horoscopes}</span></p>
                  )}
                  
                  {user.free_horoscopes === 0 && !user.has_subscription && (
                    <div className="mt-5 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive-foreground shadow-lg">
                      <Lock className="w-6 h-6 mx-auto mb-2 text-destructive" />
                      <p className="mb-4 text-sm">Бесплатные прогнозы закончились</p>
                      <Link href="/subscription">
                        <button className="w-full px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm shadow-lg shadow-primary/20">
                          Оформить подписку
                        </button>
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {generateError && (
                <div className="p-4 rounded-xl bg-destructive/20 border border-destructive/30 text-destructive-foreground text-center text-sm">
                  {(generateError as any)?.response?.data?.error || "Не удалось получить гороскоп. Звезды сейчас не в духе."}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
