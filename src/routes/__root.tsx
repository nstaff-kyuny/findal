import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  ClientOnly,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { EventPopup } from "@/components/EventPopup";
import { InstallPrompt } from "@/components/InstallPrompt";
import { NativeAppBoot } from "@/components/NativeAppBoot";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "format-detection", content: "telephone=no, email=no, address=no, date=no" },
      { name: "theme-color", content: "#ffffff" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Find AR" },
      { title: "Find AR (파인달) — 일용직 일자리 매칭 플랫폼" },
      { name: "description", content: "외식·호텔·요양 등 단기 근무 일자리와 구직자를 빠르게 연결하는 한국형 일용직 매칭 서비스입니다." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Find AR (파인달) — 일용직 일자리 매칭 플랫폼" },
      { property: "og:description", content: "외식·호텔·요양 등 단기 근무 일자리와 구직자를 빠르게 연결하는 한국형 일용직 매칭 서비스입니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Find AR (파인달) — 일용직 일자리 매칭 플랫폼" },
      { name: "naver-site-verification", content: "60e5318cb403ca655789cc5e65745162691bb141" },
      { name: "twitter:description", content: "외식·호텔·요양 등 단기 근무 일자리와 구직자를 빠르게 연결하는 한국형 일용직 매칭 서비스입니다." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/SJZSCjtgHgRqpOaRI9Qwdxdftlw1/social-images/social-1784174868370-main_logo.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/SJZSCjtgHgRqpOaRI9Qwdxdftlw1/social-images/social-1784174868370-main_logo.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/icons/icon-512.png" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ClientOnly fallback={<div className="min-h-screen" />}>
        <AuthProvider>
          <I18nProvider>
            <main>
              <Outlet />
            </main>
            <NativeAppBoot />
            <EventPopup />
            <InstallPrompt />
            <Toaster />
          </I18nProvider>
        </AuthProvider>
      </ClientOnly>
    </QueryClientProvider>
  );
}
