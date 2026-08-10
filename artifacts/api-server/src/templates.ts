// ── Starter templates ─────────────────────────────────────────────────────────
// All templates use Next.js 15 + React 19 + Tailwind v4 (SAND "app" mode)

export type TemplateId = "blank" | "landing" | "dashboard" | "portfolio";

export interface TemplateFile { path: string; content: string }

const BASE_LAYOUT = (title: string) => `import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "${title}" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`;

const BASE_CSS = `@import "tailwindcss";
`;

// ── blank ─────────────────────────────────────────────────────────────────────
const blank: TemplateFile[] = [
  { path: "app/layout.tsx", content: BASE_LAYOUT("Kodu App") },
  { path: "app/globals.css", content: BASE_CSS },
  { path: "app/page.tsx", content: `export default function Page() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
          <span className="text-2xl">⚡</span>
        </div>
        <h1 className="text-3xl font-bold">Миний шинэ төсөл</h1>
        <p className="text-zinc-400 max-w-sm">Kodu Agent-д хүсэлтээ бичиж эхлүүлнэ үү.</p>
      </div>
    </main>
  );
}
` },
];

// ── landing ───────────────────────────────────────────────────────────────────
const landing: TemplateFile[] = [
  { path: "app/layout.tsx", content: BASE_LAYOUT("Landing Page") },
  { path: "app/globals.css", content: BASE_CSS },
  { path: "app/page.tsx", content: `const features = [
  { icon: "⚡", title: "Хурдан", desc: "Millisecond response time, globally distributed." },
  { icon: "🔒", title: "Найдвартай", desc: "Enterprise-grade security built in from day one." },
  { icon: "🎨", title: "Уян хатан", desc: "Customize every pixel to match your brand perfectly." },
  { icon: "📊", title: "Аналитик", desc: "Real-time insights to grow your business smarter." },
  { icon: "🔗", title: "Интеграц", desc: "Connect with 100+ tools your team already uses." },
  { icon: "🚀", title: "Scale", desc: "From zero to millions of users without breaking a sweat." },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="border-b border-white/5 sticky top-0 bg-zinc-950/80 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">MyProduct</span>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-zinc-400 hover:text-white transition-colors">Pricing</a>
            <button className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs font-medium px-3 py-1 rounded-full mb-6 border border-blue-500/20">
          ✨ Шинэ version гарлаа
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          Таны бизнесийг<br />
          <span className="text-blue-400">дараагийн түвшинд</span> гарга
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          Дэлхийн шилдэг компаниуд манай платформыг ашиглан хэрэглэгчдийнхээ туршлагыг хувьсгаж байна.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm">
            Үнэгүй эхлүүлэх →
          </button>
          <button className="border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-all text-sm">
            Demo үзэх
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-4">Кредит карт шаардлагагүй • Хэдийд ч цуцлах боломжтой</p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Бүх шаардлагат хэрэгсэл</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">Та бизнесийг байгуулах, өсгөх, хэмжилт хийхэд хэрэгтэй бүх зүйл нэг дор.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.06] transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Энгийн үнэ</h2>
          <p className="text-zinc-400">Хэрэгцээндээ тохирох тарифаа сонгоорой</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: "Free", price: "$0", desc: "Хувь хүний судалгаанд", features: ["5 projects", "1GB storage", "Community support"] },
            { name: "Pro", price: "$19", desc: "Жижиг бизнесэд", features: ["Unlimited projects", "10GB storage", "Priority support", "Analytics"], popular: true },
            { name: "Enterprise", price: "Custom", desc: "Том байгууллагад", features: ["Everything in Pro", "SSO", "SLA", "Dedicated support"] },
          ].map((plan) => (
            <div key={plan.name} className={\`rounded-2xl p-6 border \${plan.popular ? "bg-blue-500/10 border-blue-500/40" : "bg-white/[0.03] border-white/5"}\`}>
              {plan.popular && <span className="text-xs text-blue-400 font-medium bg-blue-500/20 px-2 py-0.5 rounded-full">Хамгийн алдартай</span>}
              <div className="mt-3 mb-4">
                <div className="text-3xl font-bold">{plan.price}<span className="text-sm text-zinc-400">/mo</span></div>
                <div className="font-semibold mt-1">{plan.name}</div>
                <div className="text-sm text-zinc-400">{plan.desc}</div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => <li key={f} className="text-sm text-zinc-300 flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>)}
              </ul>
              <button className={\`w-full py-2 rounded-xl text-sm font-medium transition-colors \${plan.popular ? "bg-blue-500 hover:bg-blue-400 text-white" : "bg-white/5 hover:bg-white/10 text-white"}\`}>
                Эхлүүлэх
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-sm text-zinc-600">
        © 2025 MyProduct. Бүх эрх хуулиар хамгаалагдсан.
      </footer>
    </div>
  );
}
` },
];

// ── dashboard ─────────────────────────────────────────────────────────────────
const dashboard: TemplateFile[] = [
  { path: "app/layout.tsx", content: BASE_LAYOUT("Dashboard") },
  { path: "app/globals.css", content: BASE_CSS },
  { path: "app/page.tsx", content: `const stats = [
  { label: "Нийт орлого", value: "₮24.5M", change: "+12%", up: true },
  { label: "Идэвхтэй хэрэглэгч", value: "1,284", change: "+8%", up: true },
  { label: "Шинэ захиалга", value: "142", change: "-3%", up: false },
  { label: "Хөрвөлтийн хувь", value: "3.6%", change: "+0.4%", up: true },
];

const recent = [
  { name: "Б. Зулзага", email: "zulzaga@email.com", amount: "₮120,000", status: "Paid" },
  { name: "Т. Нарантуяа", email: "nara@email.com", amount: "₮89,000", status: "Pending" },
  { name: "Д. Мөнхбат", email: "munkh@email.com", amount: "₮250,000", status: "Paid" },
  { name: "О. Солонго", email: "solongo@email.com", amount: "₮45,000", status: "Failed" },
  { name: "Г. Батэрдэнэ", email: "bat@email.com", amount: "₮180,000", status: "Paid" },
];

const statusColor: Record<string, string> = {
  Paid: "bg-emerald-500/20 text-emerald-400",
  Pending: "bg-yellow-500/20 text-yellow-400",
  Failed: "bg-red-500/20 text-red-400",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900/50 border-r border-white/5 flex flex-col p-4 shrink-0">
        <div className="font-bold text-lg mb-8 px-2">⚡ Dashboard</div>
        <nav className="flex flex-col gap-1">
          {["Нүүр", "Аналитик", "Захиалга", "Хэрэглэгч", "Тохиргоо"].map((item, i) => (
            <button key={item} className={\`text-left px-3 py-2 rounded-lg text-sm transition-colors \${i === 0 ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}\`}>
              {item}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Сайн уу 👋</h1>
            <p className="text-zinc-400 text-sm mt-1">Өнөөдрийн тоймоо харна уу</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-zinc-900/50 border border-white/5 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className={\`text-xs mt-1 \${s.up ? "text-emerald-400" : "text-red-400"}\`}>{s.change} өнгөрсөн сараас</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-semibold">Сүүлийн гүйлгээ</h2>
              <button className="text-xs text-zinc-400 hover:text-white">Бүгдийг харах →</button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-white/5">
                  <th className="px-6 py-3 text-left font-medium">Нэр</th>
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Дүн</th>
                  <th className="px-6 py-3 text-left font-medium">Төлөв</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.email} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-sm font-medium">{r.name}</td>
                    <td className="px-6 py-3 text-sm text-zinc-400">{r.email}</td>
                    <td className="px-6 py-3 text-sm">{r.amount}</td>
                    <td className="px-6 py-3">
                      <span className={\`text-xs px-2 py-0.5 rounded-full font-medium \${statusColor[r.status]}\`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
` },
];

// ── portfolio ─────────────────────────────────────────────────────────────────
const portfolio: TemplateFile[] = [
  { path: "app/layout.tsx", content: BASE_LAYOUT("Portfolio") },
  { path: "app/globals.css", content: BASE_CSS },
  { path: "app/page.tsx", content: `const projects = [
  { title: "E-commerce Platform", desc: "Next.js + Stripe + PostgreSQL ашигласан дэлгүүрийн систем.", tags: ["Next.js", "TypeScript", "Stripe"] },
  { title: "Analytics Dashboard", desc: "Бодит цагийн мэдээллийг харуулах хяналтын самбар.", tags: ["React", "D3.js", "WebSocket"] },
  { title: "Mobile App", desc: "React Native-аар хийсэн хоол захиалгын апп.", tags: ["React Native", "Expo", "Firebase"] },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-3xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-24 pb-16">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-2xl mb-6">
            👨‍💻
          </div>
          <h1 className="text-4xl font-bold mb-3">Батэрдэнэ Ганзориг</h1>
          <p className="text-zinc-400 text-lg mb-6">Full-Stack Developer • Монгол 🇲🇳</p>
          <p className="text-zinc-300 leading-relaxed mb-8 max-w-2xl">
            Хэрэглэгчдэд үнэ цэнэтэй бүтээгдэхүүн бүтээхэд дуртай хөгжүүлэгч. React, Next.js, Node.js технологиудаар 5+ жил ажилласан туршлагатай.
          </p>
          <div className="flex gap-3">
            <a href="#" className="bg-white text-zinc-900 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-zinc-100 transition-colors">
              Холбоо барих
            </a>
            <a href="#" className="border border-white/10 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
              Resume татах
            </a>
          </div>
        </section>

        {/* Skills */}
        <section className="py-12 border-t border-white/5">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-6">Ур чадвар</h2>
          <div className="flex flex-wrap gap-2">
            {["TypeScript", "React", "Next.js", "Node.js", "PostgreSQL", "Tailwind", "Docker", "AWS"].map((s) => (
              <span key={s} className="bg-white/5 border border-white/10 text-zinc-300 text-sm px-3 py-1 rounded-lg">
                {s}
              </span>
            ))}
          </div>
        </section>

        {/* Projects */}
        <section className="py-12 border-t border-white/5">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-6">Төслүүд</h2>
          <div className="flex flex-col gap-4">
            {projects.map((p) => (
              <div key={p.title} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-colors group cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold group-hover:text-blue-400 transition-colors">{p.title}</h3>
                  <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">→</span>
                </div>
                <p className="text-sm text-zinc-400 mb-3">{p.desc}</p>
                <div className="flex gap-2 flex-wrap">
                  {p.tags.map((t) => (
                    <span key={t} className="text-xs bg-white/5 text-zinc-400 px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="py-12 border-t border-white/5">
          <h2 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-4">Холбоо</h2>
          <div className="flex gap-4">
            {["GitHub", "LinkedIn", "Twitter", "Email"].map((s) => (
              <a key={s} href="#" className="text-sm text-zinc-400 hover:text-white transition-colors">{s}</a>
            ))}
          </div>
        </section>

        <footer className="py-8 text-xs text-zinc-700">© 2025 Батэрдэнэ Ганзориг</footer>
      </div>
    </div>
  );
}
` },
];

// ── registry ──────────────────────────────────────────────────────────────────
export const TEMPLATES: Record<TemplateId, TemplateFile[]> = {
  blank, landing, dashboard, portfolio,
};

export const TEMPLATE_META: Record<TemplateId, { label: string; description: string; icon: string }> = {
  blank:     { label: "Хоосон",       icon: "✦",  description: "Цэвэр Next.js starter" },
  landing:   { label: "Landing Page", icon: "🚀", description: "Hero, features, pricing, footer" },
  dashboard: { label: "Dashboard",    icon: "📊", description: "Sidebar, stat cards, хүснэгт" },
  portfolio: { label: "Portfolio",    icon: "🎨", description: "Хувийн сайт, projects, skills" },
};
