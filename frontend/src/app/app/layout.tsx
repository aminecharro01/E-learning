import { Outfit } from "next/font/google";

const appSans = Outfit({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-horizon ${appSans.variable}`}>
      {children}
    </div>
  );
}
