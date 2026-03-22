import { useTelegram } from "@/hooks/use-telegram";
import { useGetHistory } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Sparkles, Calendar, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function HistoryTab() {
  const { telegramId } = useTelegram();
  const { data, isLoading } = useGetHistory({ telegram_id: telegramId, limit: 20 });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return <div className="p-8 h-full flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const items = data?.items || [];

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 pb-8">
      <header className="pt-6 pb-2 border-b border-border/50">
        <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-primary" /> История звезд
        </h1>
        <p className="text-muted-foreground text-sm mt-2 font-body">Архив ваших прошлых пророчеств</p>
      </header>

      {items.length === 0 ? (
        <div className="bg-card/40 border border-border rounded-3xl p-10 text-center mt-10 shadow-lg">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Calendar className="w-10 h-10 text-primary opacity-80" />
          </div>
          <h3 className="text-xl font-heading mb-2 text-foreground">Пустота космоса</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">Вы еще не запрашивали гороскопы. Звезды ждут вашего обращения!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const isExpanded = expandedId === item.id;
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="bg-card/60 backdrop-blur-md border border-border rounded-2xl p-5 shadow-lg cursor-pointer overflow-hidden group hover:border-primary/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-primary/15 text-primary text-[10px] uppercase tracking-widest rounded-lg font-bold">
                      {item.type === 'love' ? 'Любовь' : item.type === 'career' ? 'Карьера' : 'На день'}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {format(new Date(item.created_at), "d MMMM yyyy", { locale: ru })}
                    </span>
                  </div>
                  <div className={`w-8 h-8 rounded-full bg-background/50 flex items-center justify-center transition-transform duration-300 ${isExpanded ? "rotate-90 bg-primary/20 text-primary" : "text-muted-foreground"}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                
                <h4 className="font-heading text-lg text-foreground mb-1 group-hover:text-primary transition-colors">{item.zodiac_sign}</h4>
                
                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-foreground/80 leading-relaxed pt-4 border-t border-border/50 mt-3 font-body"
                    >
                      {item.content}
                    </motion.div>
                  ) : (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                      {item.content}
                    </p>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
