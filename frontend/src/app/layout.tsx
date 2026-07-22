import type { Metadata } from "next";
import { Cairo, Inter, JetBrains_Mono, Poppins } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "IAT Academy",
  description:
    "Plateforme e-learning IAT Academy — International Airlines and Tourism Academy",
  icons: {
    icon: "/brand/logo.png",
  },
};

const themeInitScript = `
(function(){
  try {
    var key = 'iat-theme';
    var saved = localStorage.getItem(key);
    var dark = saved === 'dark' || (saved !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#142B4B" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} ${jetbrains.variable} ${cairo.variable} antialiased`}
      >
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <div id="main-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
