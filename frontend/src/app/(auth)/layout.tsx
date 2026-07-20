import { Outfit } from "next/font/google";
import AuthLayout from "@/components/auth/AuthLayout";
import "@/components/auth/auth-horizon.css";

const authSans = Outfit({
  subsets: ["latin"],
  variable: "--font-landing-sans",
  display: "swap",
});

export default function AuthPagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={authSans.variable}>
      <AuthLayout>{children}</AuthLayout>
    </div>
  );
}
