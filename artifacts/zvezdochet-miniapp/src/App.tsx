import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import HoroscopeTab from "@/pages/HoroscopeTab";
import ProfileTab from "@/pages/ProfileTab";
import HistoryTab from "@/pages/HistoryTab";
import SettingsTab from "@/pages/SettingsTab";
import SubscriptionTab from "@/pages/SubscriptionTab";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={HoroscopeTab} />
      <Route path="/profile" component={ProfileTab} />
      <Route path="/history" component={HistoryTab} />
      <Route path="/settings" component={SettingsTab} />
      <Route path="/subscription" component={SubscriptionTab} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Router />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
