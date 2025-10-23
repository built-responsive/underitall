import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Calculator, Users, Settings, Workflow, Palette } from "lucide-react";
import { useState, useEffect } from "react";

export function Navigation() {
  const [location] = useLocation();
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Detect if page is loaded in an iframe (Shopify block)
  useEffect(() => {
    const checkEmbedded = () => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    };
    setIsEmbedded(checkEmbedded());
  }, []);

  // Show navigation on /dashboard, /settings, /outline and /preview_* routes
  if (location !== '/dashboard' && location !== '/settings' && location !== '/outline' && location !== '/preview_calculator' && location !== '/preview_registration') {
    return null;
  }

  const navItems = [
    {
      path: "/preview_calculator",
      label: "Preview Calculator",
      icon: Calculator,
    },
    {
      path: "/preview_registration",
      label: "Preview Registration",
      icon: Users,
    },
    {
      path: "/outline",
      label: "Outline",
      icon: Workflow,
    },
    {
      path: "/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: 'white',
        borderColor: '#E1E0DA',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Icon + Logo */}
          <Link href="/dashboard">
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <img
                src="/brand/uia-icon.png"
                alt="UnderItAll Icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                style={{ filter: 'grayscale(100%)' }}
              />
              <img
                src="/brand/logo-main.png"
                alt="UnderItAll"
                className="h-4 sm:h-6"
              />
            </div>
          </Link>

          {/* Right: Navigation Buttons */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              const ButtonContent = (
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className="font-['Vazirmatn'] gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                  style={
                    isActive
                      ? {
                          backgroundColor: '#F2633A',
                          color: 'white',
                          borderRadius: '11px',
                        }
                      : {
                          color: '#696A6D',
                          borderRadius: '11px',
                        }
                  }
                  onClick={item.onClick}
                >
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </Button>
              );

              return item.path.startsWith('#') ? (
                <div key={item.path}>
                  {ButtonContent}
                </div>
              ) : (
                <Link key={item.path} href={item.path}>
                  {ButtonContent}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
