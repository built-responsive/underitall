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
import { useEffect, useState, useRef } from "react";

// Shopify App Bridge Provider
function ShopifyAppBridge({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isEmbedded] = useState(() => {
    return (window as any).__SHOPIFY_EMBEDDED__ || false;
  });
  const appInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once and only if embedded
    if (!isEmbedded || appInitialized.current) {
      return;
    }

    // Wait for App Bridge to be fully loaded
    const initBridge = () => {
      try {
        if (!(window as any).ShopifyApp) {
          console.warn('⚠️ App Bridge not available yet');
          return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const shopOrigin = urlParams.get('shop');
        const host = urlParams.get('host');

        if (!shopOrigin || !host) {
          console.warn('⚠️ Missing shop/host params - not initializing App Bridge');
          return;
        }

        console.log('✅ Initializing App Bridge for', shopOrigin);

        const app = (window as any).ShopifyApp.createApp({
          apiKey: '78a602699150bda4e49a40861707d500',
          host: host,
          forceRedirect: true
        });

        const History = (window as any).ShopifyApp.History;
        const history = History.create(app);

        const TitleBar = (window as any).ShopifyApp.TitleBar;
        TitleBar.create(app, {
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

        appInitialized.current = true;
      } catch (error) {
        console.error('❌ App Bridge initialization error:', error);
      }
    };

    // Ensure App Bridge script is loaded
    if ((window as any).ShopifyApp) {
      initBridge();
    } else {
      // Wait for script to load
      const checkInterval = setInterval(() => {
        if ((window as any).ShopifyApp) {
          clearInterval(checkInterval);
          initBridge();
        }
      }, 100);

      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  }, [isEmbedded]);

  return <>{children}</>;
}

function Router() {
  const [location, setLocation] = useLocation();
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Check if running inside Shopify admin iframe
    const embedded = window !== window.parent || new URLSearchParams(window.location.search).has('shop');
    setIsEmbedded(embedded);

    // If embedded in admin and on root path, redirect to dashboard
    if (embedded && location === '/') {
      const urlParams = new URLSearchParams(window.location.search);
      const shopOrigin = urlParams.get('shop');
      const host = urlParams.get('host');

      // Preserve query params for Shopify auth
      const newPath = `/dashboard${shopOrigin && host ? `?shop=${shopOrigin}&host=${host}` : ''}`;
      setLocation(newPath);
    }
  }, [location, setLocation]);

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