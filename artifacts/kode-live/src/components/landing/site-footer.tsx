import { Link } from "wouter";
import { useLanguage } from "@/store/lang-store";

const LINKS_MN = {
  "footer.col1": [
    { label: "Загварууд", href: "/templates" },
    { label: "Үнэ", href: "/pricing" },
    { label: "Editor", href: "/dashboard" },
  ],
  "footer.col2": [
    { label: "Тухай", href: "/#about" },
    { label: "Блог", href: "#" },
    { label: "Холбоо", href: "#" },
  ],
  "footer.col3": [
    { label: "GitHub", href: "https://github.com" },
    { label: "Discord", href: "#" },
    { label: "Статус", href: "#" },
  ],
  "footer.col4": [
    { label: "Нууцлал", href: "#" },
    { label: "Нөхцөл", href: "#" },
  ],
} as const;

const LINKS_EN = {
  "footer.col1": [
    { label: "Templates", href: "/templates" },
    { label: "Pricing", href: "/pricing" },
    { label: "Editor", href: "/dashboard" },
  ],
  "footer.col2": [
    { label: "About", href: "/#about" },
    { label: "Blog", href: "#" },
    { label: "Contact", href: "#" },
  ],
  "footer.col3": [
    { label: "GitHub", href: "https://github.com" },
    { label: "Discord", href: "#" },
    { label: "Status", href: "#" },
  ],
  "footer.col4": [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
  ],
} as const;

type ColKey = keyof typeof LINKS_MN;
const COLS: ColKey[] = ["footer.col1", "footer.col2", "footer.col3", "footer.col4"];

export function SiteFooter() {
  const { t, lang } = useLanguage();
  const LINKS = lang === "mn" ? LINKS_MN : LINKS_EN;

  return (
    <footer className="border-t border-white/5 bg-[#07070d]">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-extrabold tracking-tight text-white">
              Ko<span className="brand-text">Du</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{t("footer.tagline")}</p>
            <div className="mt-4 flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs text-zinc-600">{t("footer.status")}</span>
            </div>
          </div>
          {COLS.map(col => (
            <div key={col}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-400">{t(col)}</p>
              <ul className="flex flex-col gap-2.5">
                {LINKS[col].map(l => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-600 transition hover:text-zinc-300">
                        {l.label}
                      </a>
                    ) : l.href.startsWith("/#") ? (
                      <a href={l.href} className="text-sm text-zinc-600 transition hover:text-zinc-300">{l.label}</a>
                    ) : (
                      <Link href={l.href} className="text-sm text-zinc-600 transition hover:text-zinc-300">{l.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/5 pt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-zinc-700">{t("footer.copy")} — Made in Mongolia 🇲🇳</p>
          <p className="text-xs text-zinc-700">{t("footer.poweredBy")}</p>
        </div>
      </div>
    </footer>
  );
}
