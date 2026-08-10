import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowRightIcon, ZapIcon, BrainIcon, MicroscopeIcon,
  LayoutTemplateIcon, SendIcon, SparklesIcon, GitForkIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Бүгд", "Landing", "Dashboard", "Portfolio", "SaaS", "Blog", "E-commerce"];

const TEMPLATE_COLORS = [
  "from-violet-900/60 to-indigo-900/60",
  "from-blue-900/60 to-cyan-900/60",
  "from-emerald-900/60 to-teal-900/60",
  "from-orange-900/60 to-red-900/60",
  "from-pink-900/60 to-rose-900/60",
  "from-yellow-900/60 to-amber-900/60",
];

type Template = {
  id: string; name: string; description: string | null;
  thumbnailUrl: string | null; templateCategory: string | null;
  templateAuthor: string | null; forkCount: number;
};

function TemplateCard({ t, idx, onFork, forking }: {
  t: Template; idx: number; onFork: (id: string) => void; forking: string | null;
}) {
  const gradient = TEMPLATE_COLORS[idx % TEMPLATE_COLORS.length];
  return (
    <div className="group rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all hover:-translate-y-0.5 bg-[#111318]">
      {/* Thumbnail */}
      <div className={`h-40 bg-gradient-to-br ${gradient} relative overflow-hidden`}>
        {t.thumbnailUrl ? (
          <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <LayoutTemplateIcon className="w-12 h-12 text-white/10" />
            <div className="absolute bottom-3 left-3">
              <div className="w-20 h-2 bg-white/10 rounded mb-1.5" />
              <div className="w-14 h-1.5 bg-white/8 rounded mb-1" />
              <div className="w-16 h-1.5 bg-white/8 rounded" />
            </div>
          </div>
        )}
        {/* Fork button */}
        <button
          onClick={() => onFork(t.id)}
          disabled={forking === t.id}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-black text-[11px] font-bold font-mono shadow-lg disabled:opacity-50"
        >
          {forking === t.id
            ? <Loader2Icon className="w-3 h-3 animate-spin" />
            : <GitForkIcon className="w-3 h-3" />
          }
          Авах
        </button>
      </div>
      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-semibold text-sm text-white truncate">{t.name}</h3>
          {t.templateCategory && (
            <Badge variant="outline" className="text-[9px] font-mono border-white/15 text-white/50 shrink-0">
              {t.templateCategory}
            </Badge>
          )}
        </div>
        {t.description && (
          <p className="text-[11px] text-white/40 line-clamp-2 mb-2">{t.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/30 font-mono">{t.templateAuthor ?? "Нэргүй"}</span>
          <span className="text-[10px] text-white/30 font-mono flex items-center gap-0.5">
            <GitForkIcon className="w-2.5 h-2.5" /> {t.forkCount}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<"fast" | "smart" | "deep">("smart");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeCategory, setActiveCategory] = useState("Бүгд");
  const [forking, setForking] = useState<string | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    fetch(`${BASE}/api/templates`)
      .then(r => r.json())
      .then(d => setTemplates(d.templates ?? []))
      .catch(() => {});
  }, []);

  const filteredTemplates = activeCategory === "Бүгд"
    ? templates
    : templates.filter(t => t.templateCategory === activeCategory);

  const handlePromptSubmit = () => {
    if (!prompt.trim()) return;
    setLocation(`/dashboard?prompt=${encodeURIComponent(prompt)}`);
  };

  const handleFork = async (id: string) => {
    setForking(id);
    try {
      const r = await fetch(`${BASE}/api/templates/${id}/fork`, { method: "POST" });
      const d = await r.json();
      if (d.project?.id) setLocation(`/projects/${d.project.id}`);
      else setLocation("/dashboard");
    } catch {
      setLocation("/dashboard");
    } finally { setForking(null); }
  };

  const MODEL_OPTS = [
    { id: "fast" as const,  label: "Fast",  cost: "4кр",  icon: <ZapIcon className="w-3 h-3 text-yellow-400" /> },
    { id: "smart" as const, label: "Smart", cost: "7кр",  icon: <BrainIcon className="w-3 h-3 text-blue-400" /> },
    { id: "deep" as const,  label: "Deep",  cost: "25кр", icon: <MicroscopeIcon className="w-3 h-3 text-purple-400" /> },
  ];
  const activeModel = MODEL_OPTS.find(m => m.id === model)!;

  return (
    <div className="min-h-[100dvh] w-full bg-[#080a10] text-white flex flex-col">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#080a10]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="font-black text-white text-xs">K</span>
            </div>
            <span className="font-bold text-base tracking-tight">
              Ko<span className="text-violet-400">Du</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm text-white/50 font-mono">
            <a href="#templates" className="hover:text-white transition-colors">Templates</a>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <button className="text-sm font-mono text-white/50 hover:text-white px-3 py-1.5 transition-colors">
                Нэвтрэх
              </button>
            </Link>
            <Link href="/dashboard">
              <button className="bg-violet-600 hover:bg-violet-500 text-white text-sm font-mono font-semibold px-4 py-1.5 rounded-lg transition-colors">
                Үнэгүй эхлэх
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center px-6 pt-24 pb-16 relative overflow-hidden">
        {/* BG glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/3 w-[300px] h-[300px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 leading-[1.05]">
            Мөрөөдлийн сайтаа<br />
            <span className="text-violet-400">хий.</span>
          </h1>
          <p className="text-white/40 text-base md:text-lg mb-10 font-mono">
            KoDu — таны санааг 5 минутад бодит болгоно.
          </p>

          {/* AI input box */}
          <div className="max-w-2xl mx-auto rounded-2xl border border-white/12 bg-[#0e1017] overflow-hidden shadow-2xl shadow-black/60 mb-4">
            {/* Model tabs */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="flex items-center gap-1">
                {MODEL_OPTS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all ${
                      model === m.id
                        ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                        : "text-white/30 hover:text-white/60"
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
              <span className="flex items-center gap-1 text-[11px] font-mono text-white/30">
                {activeModel.icon}
                <span className="text-violet-400 font-bold">{activeModel.cost}</span>
              </span>
            </div>

            {/* Textarea */}
            <div className="px-4 pb-2">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePromptSubmit(); } }}
                placeholder="Юу хийлгэх вэ? (жишээ: кофе шопны landing page хий)"
                rows={3}
                className="w-full bg-transparent text-white/90 text-sm font-mono placeholder:text-white/20 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
              <div className="flex items-center gap-2 text-[11px] font-mono text-white/25">
                <SparklesIcon className="w-3 h-3" />
                <span>Powered by Zulzaga AI</span>
              </div>
              <button
                onClick={handlePromptSubmit}
                disabled={!prompt.trim()}
                className="w-8 h-8 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <SendIcon className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>

          <p className="text-[11px] font-mono text-white/20">
            Enter дарж эхлэнэ · Шинэ хэрэглэгч бүр 50кр үнэгүй авна
          </p>
        </div>
      </section>

      {/* ── Templates ── */}
      <section id="templates" className="px-6 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
            <Link href="/templates">
              <button className="text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                Бүгдийг харах <ArrowRightIcon className="w-3 h-3" />
              </button>
            </Link>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                  activeCategory === cat
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
              <LayoutTemplateIcon className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm font-mono">
                {templates.length === 0
                  ? "Одоохондоо template байхгүй байна — та анхных нь болоорой!"
                  : "Энэ ангилалд template байхгүй"
                }
              </p>
              <Link href="/dashboard">
                <button className="mt-4 text-xs font-mono text-violet-400 hover:text-violet-300 transition-colors">
                  Шинэ project эхлэх →
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map((t, i) => (
                <TemplateCard key={t.id} t={t} idx={i} onFork={handleFork} forking={forking} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-12 px-6 border-t border-white/8 bg-white/2">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { val: "129+", label: "Хөгжүүлэгч", sub: "Active developers" },
            { val: "Claude", label: "AI Хөдөлгүүр", sub: "Powered by Anthropic" },
            { val: "100%", label: "Монгол хэл", sub: "Native Mongolian" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-black font-mono text-violet-400 mb-1">{s.val}</div>
              <div className="text-sm font-semibold text-white">{s.label}</div>
              <div className="text-[11px] font-mono text-white/30 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 py-6 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="font-mono text-sm text-white/30">kodu.live</span>
          <p className="text-xs font-mono text-white/20">© 2026 kodu.live — Made in Mongolia 🇲🇳</p>
        </div>
      </footer>
    </div>
  );
}
