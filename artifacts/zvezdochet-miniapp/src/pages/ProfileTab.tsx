import { useTelegram } from "@/hooks/use-telegram";
import { useGetMe, useGetReferral } from "@workspace/api-client-react";
import { User, Sparkles, Gem, Users, Star } from "lucide-react";
import { Link } from "wouter";

export default function ProfileTab() {
  const { telegramId, tg } = useTelegram();
  
  // DEBUG LOG
  console.log("[ProfileTab] Render, telegramId:", telegramId, "tg:", !!tg);
  
  const { data: user, isLoading: isUserLoading, error: userError } = useGetMe({ telegram_id: telegramId });
  const { data: referral } = useGetReferral({ telegram_id: telegramId });

  // DEBUG LOG for query
  console.log("[ProfileTab] useGetMe state:", { isLoading: isUserLoading, hasUser: !!user, error: userError });

  if (isUserLoading) {
    return <div className="p-8 h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!user) return <div className="p-8 text-center mt-20 text-muted-foreground">Профиль не найден (ID: {telegramId})</div>;

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
      {/* Остальной код профиля... */}
      <div className="text-center text-xs text-muted-foreground mt-4">Debug: ID={telegramId}</div>
    </div>
  );
}
