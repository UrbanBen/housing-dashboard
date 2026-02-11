import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { SessionProvider } from "@/components/auth/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

// Add DIN font via CSS if available on system, with fallbacks
const dinFontStyle = `
  @font-face {
    font-family: 'DIN';
    src: local('DIN'), local('DIN-Regular'), local('DINPro'), local('DIN Alternate');
    font-weight: normal;
    font-style: normal;
  }
  @font-face {
    font-family: 'DIN';
    src: local('DIN Bold'), local('DIN-Bold'), local('DINPro-Bold');
    font-weight: bold;
    font-style: normal;
  }
`;

export const metadata: Metadata = {
  title: "Spatio Dash",
  description: "Professional spatial analytics and insights platform",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: dinFontStyle }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme');
                if (savedTheme === 'light') {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                } else if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  // No saved preference - use system preference
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (prefersDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}