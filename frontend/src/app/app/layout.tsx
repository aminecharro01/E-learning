import { Poppins } from "next/font/google";
import { ProfileCompletionGuard } from "@/components/learner/ProfileCompletionGuard";

const appSans = Poppins({
  subsets: ["latin"],
  variable: "--font-app-sans",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-horizon ${appSans.variable}`} style={{ fontFamily: "var(--font-body)" }}>
      <ProfileCompletionGuard />
      {children}
    </div>
  );
}
