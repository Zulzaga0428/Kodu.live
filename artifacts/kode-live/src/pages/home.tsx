import { Link } from "wouter";
import { TerminalSquareIcon, BotIcon, ZapIcon, GlobeIcon, ArrowRightIcon, CodeIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: <BotIcon className="w-5 h-5 text-primary" />,
    title: "AI Кодчиллын Агент",
    sub: "AI Coding Agent",
    desc: "Kodu агент таны кодыг уншиж, алдааг олж, шийдлийг санал болгоно. Claude-д суурилсан.",
  },
  {
    icon: <ZapIcon className="w-5 h-5 text-yellow-400" />,
    title: "Шуурхай Ажиллагаа",
    sub: "Lightning Fast",
    desc: "Vite + Edge runtime ашиглан хурдан build, preview болон deploy хийнэ.",
  },
  {
    icon: <CodeIcon className="w-5 h-5 text-emerald-400" />,
    title: "Олон Хэл Дэмжлэг",
    sub: "Multi-language",
    desc: "TypeScript, Python, Go, Rust — бүх технологийн стэк нэг дор. Package manager дуусгасан.",
  },
  {
    icon: <GlobeIcon className="w-5 h-5 text-blue-400" />,
    title: "Монгол хэлний Тоолуур",
    sub: "Mongolian First",
    desc: "Монгол хөгжүүлэгчдэд зориулсан анхны AI кодчиллын платформ.",
  },
];

const TERMINAL_LINES = [
  { prefix: "$", text: " kode init my-saas-app", color: "text-primary" },
  { prefix: "✓", text: " Scaffolded Next.js + TypeScript", color: "text-emerald-400" },
  { prefix: "✓", text: " Configured Drizzle ORM + PostgreSQL", color: "text-emerald-400" },
  { prefix: "✓", text: " Auth routes ready", color: "text-emerald-400" },
  { prefix: "~", text: " Kodu: Юу хийлгэх вэ? // What should I build?", color: "text-yellow-400" },
  { prefix: ">", text: " Хэрэглэгчийн бүртгэлийн хуудас нэмнэ үү", color: "text-muted-foreground" },
  { prefix: "⟳", text: " Generating registration page...", color: "text-primary animate-pulse" },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="w-5 h-5 text-primary" />
            <span className="font-bold font-mono text-lg tracking-tight">kodu<span className="text-primary">.live</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="font-mono text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="font-mono text-sm">
                Эхлэх <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-blue-500/3 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/5 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-mono text-primary tracking-wide">Монгол хөгжүүлэгчдэд зориулсан AI орчин</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[1.05]">
            <span className="text-foreground">Код бичих нь</span>
            <br />
            <span className="bg-gradient-to-r from-primary via-blue-400 to-primary bg-clip-text text-transparent">
              хэзээ ч ийм хялбар
            </span>
            <br />
            <span className="text-foreground/60 text-4xl md:text-5xl font-bold">байгаагүй.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            AI агенттай хамт кодоо бичиж, шалгаж, нийтлэ.{" "}
            <span className="text-foreground/60">Claude-д суурилсан — монгол хэлээр ажилладаг анхны платформ.</span>
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/dashboard">
              <Button size="lg" className="font-mono text-base px-8 h-12 gap-2 shadow-lg shadow-primary/20">
                Үнэгүй эхлэх
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/projects/proj-1">
              <Button variant="outline" size="lg" className="font-mono text-base px-8 h-12 border-border/60 text-muted-foreground hover:text-foreground">
                Demo харах
              </Button>
            </Link>
          </div>

          {/* Terminal mockup */}
          <div className="max-w-2xl mx-auto rounded-xl border border-border/60 overflow-hidden shadow-2xl shadow-black/40 text-left">
            {/* Window chrome */}
            <div className="bg-card border-b border-border/60 px-4 h-9 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="flex-1 text-center text-[11px] font-mono text-muted-foreground/60">kodu.live — terminal</span>
            </div>
            {/* Terminal body */}
            <div className="bg-[#0a0a0f] p-5 font-mono text-[13px] flex flex-col gap-1.5">
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className={`${line.color} shrink-0 w-4`}>{line.prefix}</span>
                  <span className={`${line.color} ${line.color.includes("animate") ? "animate-pulse" : ""}`}>{line.text}</span>
                </div>
              ))}
              <div className="flex gap-2 mt-1">
                <span className="text-muted-foreground/40 shrink-0 w-4">|</span>
                <span className="w-2 h-4 bg-primary/80 animate-pulse inline-block" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Боломжууд</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Хөгжүүлэгчид хэрэгтэй бүх зүйл
            </h2>
            <p className="text-muted-foreground mt-3 text-base max-w-xl mx-auto">
              Нэг дор: агент, редактор, preview, deploy — монгол хэлээр.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-card/30 p-5 hover:border-border transition-colors group">
                <div className="w-9 h-9 rounded-lg bg-card border border-border/60 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-sm mb-0.5">{f.title}</h3>
                <p className="text-[10px] font-mono text-muted-foreground/50 mb-2 uppercase tracking-wide">{f.sub}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-12 px-6 border-t border-border/30 bg-card/10">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { val: "129+", label: "Хөгжүүлэгч", sub: "Active developers" },
              { val: "Claude", label: "AI Хөдөлгүүр", sub: "Powered by Anthropic" },
              { val: "100%", label: "Монгол хэл", sub: "Native Mongolian" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-3xl font-black font-mono text-primary mb-1">{s.val}</div>
                <div className="text-sm font-semibold text-foreground">{s.label}</div>
                <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="py-24 px-6 border-t border-border/30">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Өнөөдөр эхлэ.
          </h2>
          <p className="text-muted-foreground mb-8 text-base">
            Бүртгэл шаардлагагүй — шууд үнэгүй ашиглаарай.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Drizzle"].map((tag) => (
              <span key={tag} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground/70">
                <CheckIcon className="w-3 h-3 text-primary" /> {tag}
              </span>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/dashboard">
              <Button size="lg" className="font-mono px-10 h-12 text-base shadow-xl shadow-primary/20">
                Одоо эхлэх — Үнэгүй
                <ArrowRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/30 py-6 px-6">
        <div className="container mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalSquareIcon className="w-4 h-4 text-primary/60" />
            <span className="font-mono text-sm text-muted-foreground/60">kodu.live</span>
          </div>
          <p className="text-xs font-mono text-muted-foreground/40">© 2026 kodu.live — Made in Mongolia 🇲🇳</p>
        </div>
      </footer>
    </div>
  );
}
