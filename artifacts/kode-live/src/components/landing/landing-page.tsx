import { Link } from "wouter";
import { About } from "./about";
import { Hero } from "./hero";
import { Payment } from "./payment";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";
import { TemplateGallery } from "./template-gallery";
import { useLanguage } from "@/store/lang-store";

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />;
}

function CtaBand() {
  const { t } = useLanguage();
  return (
    <section className="relative overflow-hidden px-5 py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(124,92,255,0.22),transparent_65%)] blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#a78bff]">{t("cta.label")}</p>
        <h2 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          {t("cta.title1")}{" "}
          <span className="bg-gradient-to-r from-[#b9a6ff] to-[#7c5cff] bg-clip-text text-transparent">{t("cta.title2")}</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg text-zinc-400">{t("cta.sub")}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/dashboard"
            className="brand-gradient inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-semibold text-white shadow-xl shadow-[#7c5cff]/30 transition hover:brightness-110 active:scale-95"
          >
            {t("cta.primary")}
          </Link>
          <a href="#templates"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-7 py-3 text-base font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            {t("cta.secondary")}
          </a>
        </div>
        <p className="mt-5 text-sm text-zinc-600">{t("cta.hint")}</p>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="landing-font min-h-screen bg-[#07070d] text-zinc-200">
      <SiteNav />
      <main className="pt-16">
        <Hero />
        <Divider />
        <TemplateGallery />
        <Divider />
        <About />
        <Divider />
        <Payment />
        <Divider />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
