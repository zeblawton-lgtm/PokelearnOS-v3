import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";

import { SessionProvider, useSession } from "@/context/SessionContext";
import ProfileSelect from "@/pages/profile-select";
import Home from "@/pages/home";
import MathPage from "@/pages/math";
import SpanishPage from "@/pages/spanish";
import GeographyPage from "@/pages/geography";
import RestScreen from "@/pages/rest";
import Progress from "@/pages/progress";
import NotFound from "@/pages/not-found";
import { ParentOverlay } from "@/components/ParentOverlay";
import { TimerBar } from "@/components/TimerBar";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 10, retry: 1 } },
});

function AppRoutes() {
  const { profile, isResting } = useSession();
  const [location] = useLocation();

  if (isResting) return <RestScreen />;
  if (!profile) return <ProfileSelect />;

  return (
    <>
      <TimerBar />
      <div className="pt-16 pb-4 min-h-screen">
        <AnimatePresence mode="wait">
          <Switch key={location}>
            <Route path="/home" component={Home} />
            <Route path="/math" component={MathPage} />
            <Route path="/spanish" component={SpanishPage} />
            <Route path="/geography" component={GeographyPage} />
            <Route path="/progress" component={Progress} />
            <Route path="/" component={Home} />
            <Route component={NotFound} />
          </Switch>
        </AnimatePresence>
      </div>
      <ParentOverlay />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
