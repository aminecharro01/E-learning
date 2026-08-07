"use client";

import AuthBoardingPass from "@/components/auth/AuthBoardingPass";

/** @deprecated Use AuthBoardingPass — kept for import compatibility */
export default function SignInForm() {
  return <AuthBoardingPass initialMode="signin" />;
}
