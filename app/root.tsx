import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import {ThemeProvider} from "styled-components";
import {chatManager} from "~/managers/chat.manager";
import {useEffect} from "react";
import {messageManager} from "~/managers/message.manager";
import {messageStore} from "~/database/message.store";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    (async () => {
      (window as any).messageManager = messageManager;

      await chatManager.add({
        id: '79836200181@c.us',
        photo: {
          type: 'empty'
        },
        title: 'Николай',
        version: 0,
      }).catch(() => {})

      await chatManager.add({
        id: 'test@c.us',
        photo: {
          type: 'empty'
        },
        title: 'Вторая личность',
        version: 0,
      }).catch(() => {})

      await chatManager.add({
        id: 't2@c.us',
        photo: {
          type: 'empty'
        },
        title: 'Третья личность',
        version: 0,
      }).catch(() => {})

      await chatManager.add({
        id: 'wine_rose@c.us',
        photo: {
          type: 'empty'
        },
        title: 'Елизаветттка',
        version: 0,
      }).catch(() => {})

      await chatManager.add({
        id: 'yulik@c.us',
        photo: {
          type: 'empty'
        },
        title: 'Юлик',
        version: 0,
      }).catch(() => {})

      await messageStore.add({
        fromMe: false,
        senderId: '79836200181@c.us',
        id: '1231236128368128371627833',
        chatId: '79836200181@c.us',
        timestamp: Date.now(),
        textMessage: {
          text: 'test'
        }
      }).catch(() => {})

      await chatManager.initialize();
    })()
  }, [])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body id='root'>
        <ThemeProvider theme={{
          accent_text_color: "#6ab2f2",

          bg_color: "#151a22",

          destructive_text_color: "#ec3942",

          header_bg_color: "#17212b",

          hint_color: "#708499",
          secondary_hint_color: "#576677",

          link_color: "#6ab3f3",

          secondary_bg_color: "#232e3c",

          section_bg_color: "#17212b",
          section_header_text_color: "#6ab3f3",

          text_color: "#f5f5f5",
          text_inverse_color: "#252525",

          subtitle_text_color: "#708499",

          scrollbar_track_color: "#232e3c", // like secondary_bg_color
          scrollbar_track_hint_color: "#334357", // like secondary_bg_color + saturation
          scrollbar_thumb_color: "#708499", // like hint_color
          scrollbar_thumb_hint_color: "#7e95ae", // like hint_color + saturation

          incoming_message_bg_color: "#182533",
          outgoing_message_bg_color: "#2B5378",
          selected_message_bg_color: "#39658e",
          preview_message_bg_color: "rgba(204,204,204,0.1)",

          button_bg_color: "#39658e",
          button_hint_bg_color: "#366898",
          button_text_color: "#ffffff",
          button_text_secondary_color: "#c8c8c8",

          context_menu_bg_color: "#17212B",
        }}>
          {children}
        </ThemeProvider>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
