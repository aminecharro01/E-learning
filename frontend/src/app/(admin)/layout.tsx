import { Outfit } from "next/font/google";

const appSans = Outfit({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <div className={appSans.variable}>{children}</div>;
}
