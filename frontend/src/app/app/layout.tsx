import { Poppins } from "next/font/google";

const appSans = Poppins({
  subsets: ["latin"],
  variable: "--font-app-sans",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-horizon ${appSans.variable}`} style={{ fontFamily: "var(--font-body)" }}>
      {children}
    </div>
  );
}
