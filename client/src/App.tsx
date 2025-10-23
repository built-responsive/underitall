import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatBubble } from "@/components/chat-bubble";
import { Navigation } from "@/components/navigation";
import Calculator from "@/pages/calculator";
import WholesaleRegistration from "@/pages/wholesale-registration";
import Admin from "@/pages/admin";
import Settings from "@/pages/settings";
import SyncArchitecture from "@/pages/sync-architecture";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={WholesaleRegistration} />
      <Route path="/apps/join" component={WholesaleRegistration} />
      <Route path="/apps/join/calculator" component={Calculator} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/dashboard" component={Admin} />
      <Route path="/settings" component={Settings} />
      <Route path="/outline" component={SyncArchitecture} />
      <Route path="/preview_calculator" component={Calculator} />
      <Route path="/preview_registration" component={WholesaleRegistration} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  const showChatBubble = location !== "/";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Navigation />
        <Toaster />
        <Router />
        {showChatBubble && <ChatBubble />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;