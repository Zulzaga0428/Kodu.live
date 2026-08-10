export type Lang = "mn" | "en";

type Translations = Record<string, string>;

const MN: Translations = {
  // Nav
  "nav.about": "Тухай",
  "nav.pricing": "Үнэ",
  "nav.templates": "Загварууд",
  "nav.login": "Нэвтрэх",
  "nav.cta": "Үнэгүй эхлэх",

  // Hero
  "hero.headline1": "Мөрөөдлийн сайтаа",
  "hero.headline2": "хий.",
  "hero.sub": "KoDu — таны санааг 5 минутад бодит болгоно.",
  "hero.placeholder": "Юу хийлгэх вэ? (жишээ: кофе шопны landing page хий)",
  "hero.cta": "Үүсгэх",

  // Templates
  "tmpl.label": "Загварууд",
  "tmpl.title": "Загварууд",
  "tmpl.sub": "Мэргэжлийн загваруудаас сонгон эхлэ",
  "tmpl.use": "Ашиглах",

  // CTA
  "cta.label": "Өнөөдөр эхлэ",
  "cta.title1": "Таны санаа",
  "cta.title2": "бодит болно.",
  "cta.sub": "Монгол хэлээр бичих л хангалттай — KoDu үлдсэнийг хийнэ.",
  "cta.primary": "Үнэгүй эхлэх",
  "cta.secondary": "Загвар харах",
  "cta.hint": "Бүртгэл шаардлагагүй · 50кр үнэгүй",

  // Footer
  "footer.tagline": "Монгол хөгжүүлэгчдэд зориулсан AI кодчиллын платформ.",
  "footer.status": "Бүх систем ажиллаж байна",
  "footer.copy": "© 2026 kodu.live",
  "footer.poweredBy": "Powered by Zulzaga AI",
  "footer.col1": "Бүтээгдэхүүн",
  "footer.col2": "Компани",
  "footer.col3": "Нөөц",
  "footer.col4": "Хуулийн",
};

const EN: Translations = {
  // Nav
  "nav.about": "About",
  "nav.pricing": "Pricing",
  "nav.templates": "Templates",
  "nav.login": "Sign in",
  "nav.cta": "Start free",

  // Hero
  "hero.headline1": "Build your",
  "hero.headline2": "dream site.",
  "hero.sub": "KoDu — turns your idea into reality in 5 minutes.",
  "hero.placeholder": "What do you want to build? (e.g. build a coffee shop landing page)",
  "hero.cta": "Generate",

  // Templates
  "tmpl.label": "Templates",
  "tmpl.title": "Templates",
  "tmpl.sub": "Start from a professional template",
  "tmpl.use": "Use template",

  // CTA
  "cta.label": "Get started today",
  "cta.title1": "Your idea,",
  "cta.title2": "made real.",
  "cta.sub": "Just describe it — KoDu handles the rest.",
  "cta.primary": "Start for free",
  "cta.secondary": "Browse templates",
  "cta.hint": "No sign-up required · 50 credits free",

  // Footer
  "footer.tagline": "The AI coding platform built for Mongolian developers.",
  "footer.status": "All systems operational",
  "footer.copy": "© 2026 kodu.live",
  "footer.poweredBy": "Powered by Zulzaga AI",
  "footer.col1": "Product",
  "footer.col2": "Company",
  "footer.col3": "Resources",
  "footer.col4": "Legal",
};

export const TRANSLATIONS: Record<Lang, Translations> = { mn: MN, en: EN };
export type TranslationKey = string;
