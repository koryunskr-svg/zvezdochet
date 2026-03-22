import { useTelegram } from "@/hooks/use-telegram";
import { useGetMe, useGetReferral } from "@workspace/api-client-react";
import { User, Sparkles, Gem, Users, Star } from "lucide-react";
import { Link } from "wouter";

export default function ProfileTab() {
  const { telegramId, tg } = useTelegram();
  const { data: user, isLoading: isUserLoading } = useGetMe({ telegram_id: telegramId });
  const { data: referral } = useGetReferral({ telegram_id: telegramId });

  if (isUserLoading) {
    return <div className="p-8 h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!user) return <div className="p-8 text-center mt-20 text-muted-foreground">Профиль не найден</div>;

  return (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      <header className="text-center pt-8 pb-4 relative">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-primary/20 blur-[40px] rounded-full z-0" />
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary via-accent to-primary p-[2px] shadow-[0_0_30px_rgba(168,85,247,0.3)] relative z-10">
          <div className="w-full h-full rounded-full bg-card flex items-center justify-center text-4xl">
            {user.zodiac_sign ? "✨" : "👤"}
          </div>
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground relative z-10">{user.name || "Гость"}</h1>
        {user.username && <p className="text-muted-foreground text-sm relative z-10">@{user.username}</p>}
      </header>

      <div className="grid gap-4">
        {/* Personal Info */}
        <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
          <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Личные данные
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-border/50">
              <span className="text-foreground/70">Дата рождения</span>
              <span className="font-medium text-foreground">{user.birth_date || "Не указана"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/70">Знак зодиака</span>
              <span className="font-heading font-bold text-lg text-primary flex items-center gap-1.5">
                {user.zodiac_sign || "Не определен"} <Star className="w-4 h-4 text-accent fill-accent/20" />
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-5 shadow-lg">
          <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" /> Космический след
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 border border-border/50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-heading text-primary mb-1">{user.horoscope_count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Прогнозов</div>
            </div>
            <div className="bg-background/50 border border-border/50 rounded-2xl p-4 text-center">
              <div className="text-3xl font-heading text-accent mb-1">{user.referral_count}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Друзей</div>
            </div>
          </div>
        </div>

        {/* Referral */}
        {referral && (
          <div className="bg-card/50 backdrop-blur-md border border-border rounded-3xl p-5 shadow-lg">
            <h3 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" /> Партнерская программа
            </h3>
            <p className="text-sm text-foreground/80 mb-4 leading-relaxed">Приглашайте друзей и получайте <span className="text-primary font-bold">+3 прогноза</span> за каждого!</p>
            <div className="bg-background/80 rounded-xl p-3 flex items-center justify-between border border-border">
              <div className="truncate text-xs font-mono text-primary/80 mr-3 opacity-80">
                {referral.referral_link}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(referral.referral_link);
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                }}
                className="shrink-0 bg-primary/20 text-primary px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary/30 transition-colors"
              >
                Копировать
              </button>
            </div>
          </div>
        )}

        {/* Subscription */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-3xl p-5 shadow-[0_4px_20px_rgba(168,85,247,0.1)] relative overflow-hidden">
          <div className="absolute -top-4 -right-4 p-4 opacity-10 rotate-12">
            <Gem className="w-24 h-24" />
          </div>
          <h3 className="text-xs uppercase tracking-widest font-semibold text-primary mb-3 flex items-center gap-2 relative z-10">
            <Gem className="w-4 h-4" /> Подписка Premium
          </h3>
          <div className="relative z-10 flex items-center justify-between">
            {user.has_subscription ? (
              <div className="space-y-1">
                <p className="text-foreground font-bold text-lg font-heading tracking-wide">АКТИВНА</p>
                {user.subscription_expires && (
                  <p className="text-xs text-muted-foreground">До {new Date(user.subscription_expires).toLocaleDateString('ru-RU')}</p>
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <p className="text-foreground/80 text-sm font-medium">Нет подписки</p>
                <Link href="/subscription">
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-medium shadow-md shadow-primary/30">
                    Узнать больше
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
