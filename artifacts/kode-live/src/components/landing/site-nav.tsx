import { Menu, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useId, useState } from "react";
import { useLanguage } from "@/store/lang-store";
import { FlagMN, FlagEN } from "./brand-icons";

export function SiteNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, lang, toggleLang } = useLanguage();
  const [location] = useLocation();
  const id = useId();

  const TOP_LINKS = [
    { href: "/#about", label: t("nav.about") },
    { href: "/templates", label: t("nav.templates") },
    { href: "/pricing", label: t("nav.pricing") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#07070d]/80 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        {/* Logo */}
        <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
          Ko<span className="brand-text">Du</span>
        </Link>

        {/* Center links */}
        <div className="hidden items-center gap-7 text-sm text-zinc-400 md:flex">
          {TOP_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-zinc-100">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right: lang + login + CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            {lang === "mn" ? <FlagMN /> : <FlagEN id={id} />}
            {lang === "mn" ? "MN" : "EN"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/dashboard"
            className="brand-gradient flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#7c5cff]/25 transition hover:brightness-110"
          >
            {t("nav.cta")}
          </Link>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-400"
          >
            {lang === "mn" ? <FlagMN className="h-3 w-4" /> : <FlagEN id={`${id}-m`} className="h-3 w-4" />}
            {lang === "mn" ? "MN" : "EN"}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/5 hover:text-white"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="border-t border-white/5 bg-[#07070d]/95 px-5 pb-5 pt-4 md:hidden">
          <div className="flex flex-col gap-1">
            {TOP_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-3 border-t border-white/5 pt-3">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="brand-gradient flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold text-white"
              >
                {t("nav.cta")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
