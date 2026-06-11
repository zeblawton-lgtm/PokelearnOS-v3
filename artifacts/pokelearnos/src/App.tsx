import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";

import { SessionProvider, useSession } from "@/context/SessionContext";
import ProfileSelect from "@/pages/profile-select";
import Home from "@/pages/home";
import MathPage from "@/pages/math";
import SpanishPage from "@/pages/spanish";
import GeographyPage from "@/pages/geography";
import ColoringPage from "@/pages/coloring";
import TracingPage from "@/pages/tracing";
import DotsPage from "@/pages/dots";
import MatchPage from "@/pages/match";
import Progress from "@/pages/progress";
import PokedexPage from "@/pages/pokedex";
import RegionsPage from "@/pages/regions";
import NotFound from "@/pages/not-found";
import { ParentOverlay } from "@/components/ParentOverlay";
import { TopBar } from "@/components/TopBar";
import * as music from "@/lib/music";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 10, retry: 1 } },
});

function AppRoutes() {
  const { profile } = useSession();
  const [location] = useLocation();

  useEffect(() => {
    if (!profile) { music.stop(); return; }
    // Learning modules are music-free so narration is clear; the completion
    // jingle still plays over silence when a module finishes.
    if (["/math", "/spanish", "/geography", "/coloring", "/tracing", "/dots", "/match"].includes(location)) music.stop();
    else music.playScene("menu");
  }, [profile, location]);

  if (!profile) return <ProfileSelect />;

  return (
    <>
      <TopBar />
      <div className="pt-16 pb-4 min-h-screen">
        <AnimatePresence mode="wait">
          <Switch key={location}>
            <Route path="/home" component={Home} />
            <Route path="/math" component={MathPage} />
            <Route path="/spanish" component={SpanishPage} />
            <Route path="/geography" component={GeographyPage} />
            <Route path="/coloring" component={ColoringPage} />
            <Route path="/tracing" component={TracingPage} />
            <Route path="/dots" component={DotsPage} />
            <Route path="/match" component={MatchPage} />
            <Route path="/progress" component={Progress} />
            <Route path="/pokedex" component={PokedexPage} />
            <Route path="/regions" component={RegionsPage} />
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
