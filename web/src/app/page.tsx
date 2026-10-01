import { SiteHeader } from "@/components/site-header";
import { SideNav } from "@/components/side-nav";
import { ScrollToTopButton } from "@/components/scroll-to-top-button";
import { HeroSection } from "@/components/landing/hero-section";
import { EyeConditionsSection } from "@/components/landing/eye-conditions-section";
import { ServicesSection } from "@/components/landing/services-section";
import { ShowcaseSection } from "@/components/landing/showcase-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { TrustSection } from "@/components/landing/trust-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export default function Home() {
  return (
    <div className="font-display flex flex-1 flex-col">
      <SiteHeader />
      <SideNav />
      <ScrollToTopButton />
      <main className="flex-1">
        <HeroSection />
        <EyeConditionsSection />
        <ServicesSection />
        <ShowcaseSection />
        <HowItWorks />
        <TrustSection />
      </main>
      <FinalCta />
      <SiteFooter />
    </div>
  );
}
