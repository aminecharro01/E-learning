import "./landing.css";
import { LandingHeader } from "./Header";
import { LandingHero } from "./Hero";
import { LandingAbout } from "./About";
import { LandingExpertiseScroll } from "./ExpertiseScroll";
import { LandingWhy } from "./Why";
import { LandingContact } from "./Contact";
import { LandingNewsletter } from "./Newsletter";
import { LandingFooter } from "./Footer";

export function LandingPage() {
  return (
    <div className="landing">
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingAbout />
        <LandingExpertiseScroll />
        <LandingWhy />
        <LandingContact />
        <LandingNewsletter />
      </main>
      <LandingFooter />
    </div>
  );
}
