import { Link } from "wouter";
import { Sparkles } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center px-4">
      <div className="bg-card/50 backdrop-blur-md border border-border p-8 rounded-3xl text-center max-w-sm mx-auto shadow-xl">
        <Sparkles className="w-16 h-16 text-primary mx-auto mb-6 opacity-80" />
        <h1 className="text-2xl font-bold text-foreground mb-3 font-heading">Страница не найдена</h1>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Звезды говорят, что вы сбились с пути. Давайте вернемся к предсказаниям.
        </p>
        <Link href="/">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium w-full shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity">
            Вернуться на главную
          </button>
        </Link>
      </div>
    </div>
  );
}
