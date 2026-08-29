import "../landing/landing.css";
import "./rejoindre.css";
import { LandingFooter } from "../landing/Footer";
import { RejoindreHeader } from "./RejoindreHeader";
import { RejoindreHero } from "./RejoindreHero";
import { RejoindreProgressBar } from "./RejoindreProgressBar";
import { TaglineReveal } from "./TaglineReveal";
import { RejoindreSocialProof } from "./SocialProof";
import { RejoindreBenefits } from "./Benefits";
import { RejoindreTestimonials } from "./Testimonials";
import { RejoindreHowItWorks } from "./HowItWorks";
import { RejoindreFaq } from "./Faq";
import { RejoindreFinalCta } from "./FinalCta";
import { RejoindreStickyMobileCta } from "./StickyMobileCta";

export function RejoindrePage() {
  return (
    <div className="landing rejoindre-page">
      <RejoindreProgressBar />
      <RejoindreHeader />
      <main>
        <RejoindreHero />
        <RejoindreSocialProof />
        <RejoindreBenefits />
        <TaglineReveal />
        <RejoindreTestimonials />
        <RejoindreHowItWorks />
        <RejoindreFaq />
        <RejoindreFinalCta />
      </main>
      <LandingFooter />
      <RejoindreStickyMobileCta />
    </div>
  );
}
