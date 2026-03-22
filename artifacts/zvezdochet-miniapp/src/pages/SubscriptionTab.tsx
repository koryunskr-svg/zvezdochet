import { useTelegram } from "@/hooks/use-telegram";
import { useGetMe, useSubscribe } from "@workspace/api-client-react";
import { Gem, Check, Loader2, Infinity } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";

export default function SubscriptionTab() {
  const { telegramId, tg } = useTelegram();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe({ telegram_id: telegramId });
  const [success, setSuccess] = useState(false);

  const { mutate: subscribeApi, isPending } = useSubscribe({
    mutation: {
      onSuccess: () => {
        setSuccess(true);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        queryClient.invalidateQueries({ queryKey: ["/api/miniapp/me", { telegram_id: telegramId }] });
      }
    }
  });

  const handleSubscribe = () => {
    subscribeApi({ data: { telegram_id: telegramId } });
  };

  const features = [
    "Безлимитные ежедневные гороскопы",
    "Любовный и карьерный прогнозы",
    "Приоритетная генерация без очереди",
    "Поддержка проекта"
  ];

  if (success || user?.has_subscription) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 flex flex-col items-center justify-center text-center space-y-6 mt-16"
      >
        <div className="w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(52,211,153,0.5)] mb-4">
          <Check className="w-14 h-14 text-white" strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-heading font-bold text-foreground">Подписка Активна</h2>
        <p className="text-muted-foreground leading-relaxed">Все тайны Вселенной теперь открыты для вас. Наслаждайтесь безлимитным доступом к мудрости звезд!</p>
      </motion.div>
    );
  }

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="text-center pt-10 pb-4">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary to-accent rounded-3xl rotate-6 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.4)] mb-8">
          <div className="w-full h-full bg-card/30 backdrop-blur-sm rounded-3xl flex items-center justify-center -rotate-6 border border-white/20">
            <Gem className="w-12 h-12 text-white drop-shadow-lg" />
          </div>
        </div>
        <h1 className="text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Premium</h1>
        <p className="text-muted-foreground mt-3 font-body text-sm uppercase tracking-widest">Откройте все возможности</p>
      </header>

      <div className="bg-card/70 backdrop-blur-xl border border-primary/30 rounded-[2rem] p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-[40px] -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-accent/10 rounded-full blur-[40px] -ml-10 -mb-10" />
        
        <div className="relative z-10 space-y-5 mb-10">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex flex-shrink-0 items-center justify-center mt-0.5 shadow-inner">
                <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />
              </div>
              <span className="text-foreground/90 text-sm font-medium leading-relaxed">{feature}</span>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-end justify-center gap-2 mb-6">
            <span className="text-5xl font-bold font-heading text-foreground">299</span>
            <span className="text-muted-foreground mb-2 font-medium">₽ / мес</span>
          </div>
          
          <button
            onClick={handleSubscribe}
            disabled={isPending}
            className="w-full relative group overflow-hidden rounded-2xl p-[1px] shadow-[0_10px_30px_-10px_rgba(168,85,247,0.5)]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-100 transition-opacity duration-300 rounded-2xl blur-[2px]" />
            <div className="relative bg-gradient-to-r from-primary to-accent w-full py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/20">
              {isPending ? (
                <Loader2 className="w-5 h-5 animate-spin text-white" />
              ) : (
                <Infinity className="w-6 h-6 text-white" />
              )}
              <span className="font-heading font-bold text-lg tracking-wider text-white">
                {isPending ? "Обработка..." : "Оплатить (Тест)"}
              </span>
            </div>
          </button>
          <p className="text-center text-xs text-muted-foreground mt-5 opacity-80 font-medium">
            Тестовый режим. Реальные деньги не спишутся.
          </p>
        </div>
      </div>
    </div>
  );
}
