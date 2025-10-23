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
import { useEffect, useState } from "react";

// Shopify App Bridge Provider
function ShopifyAppBridge({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Check if running inside Shopify admin iframe
    const embedded = window !== window.parent || new URLSearchParams(window.location.search).has('shop');
    setIsEmbedded(embedded);

    // Load App Bridge if embedded
    if (embedded && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge.js';
      script.async = true;
      script.onload = () => {
        const urlParams = new URLSearchParams(window.location.search);
        const shopOrigin = urlParams.get('shop');
        const host = urlParams.get('host');

        if (shopOrigin && host && (window as any).ShopifyApp) {
          const app = (window as any).ShopifyApp.createApp({
            apiKey: '78a602699150bda4e49a40861707d500',
            host: host,
            forceRedirect: true
          });

          // Navigation via History API (updates browser URL without reload)
          const History = (window as any).ShopifyApp.History;
          const history = History.create(app);

          // Set up TitleBar with navigation actions
          const TitleBar = (window as any).ShopifyApp.TitleBar;
          const titleBar = TitleBar.create(app, {
            title: 'UnderItAll Tools',
            buttons: {
              primary: undefined,
              secondary: [
                {
                  label: 'Dashboard',
                  onClick: () => {
                    history.dispatch(History.Action.PUSH, `/dashboard?shop=${shopOrigin}&host=${host}`);
                  }
                },
                {
                  label: 'Calculator',
                  onClick: () => {
                    history.dispatch(History.Action.PUSH, `/calculator?shop=${shopOrigin}&host=${host}`);
                  }
                },
                {
                  label: 'Registration',
                  onClick: () => {
                    history.dispatch(History.Action.PUSH, `/?shop=${shopOrigin}&host=${host}`);
                  }
                },
                {
                  label: 'Settings',
                  onClick: () => {
                    history.dispatch(History.Action.PUSH, `/settings?shop=${shopOrigin}&host=${host}`);
                  }
                }
              ]
            }
          });
        }
      };
      document.head.appendChild(script);
    }
  }, [location]);

  return <>{children}</>;
}

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
        <ShopifyAppBridge>
          <Navigation />
          <Toaster />
          <Router />
          {showChatBubble && <ChatBubble />}
        </ShopifyAppBridge>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;