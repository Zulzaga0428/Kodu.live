import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  ArrowLeftIcon, LayoutTemplateIcon, GitForkIcon,
  Loader2Icon, SearchIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["Бүгд", "Landing", "Dashboard", "Portfolio", "SaaS", "Blog", "E-commerce", "general"];
const GRADIENT_COLORS = [
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

export default function TemplatesPage() {
  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Бүгд");
  const [search, setSearch] = useState("");
  const [forking, setForking] = useState<string | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    fetch(`${BASE}/api/templates`)
      .then(r => r.json())
      .then(d => { setTemplates(d.templates ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = templates.filter(t => {
    const matchCat = activeCategory === "Бүгд" || t.templateCategory === activeCategory;
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
      || (t.description ?? "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleFork = async (id: string) => {
    setForking(id);
    try {
      const r = await fetch(`${BASE}/api/templates/${id}/fork`, { method: "POST" });
      const d = await r.json();
      if (d.project?.id) setLocation(`/projects/${d.project.id}`);
      else setLocation("/dashboard");
    } catch { setLocation("/dashboard"); }
    finally { setForking(null); }
  };

  return (
    <div className="min-h-screen bg-[#080a10] text-white font-mono">
      {/* Header */}
      <header className="border-b border-white/8 h-14 flex items-center justify-between px-6 bg-[#0e1017]/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <button className="text-white/40 hover:text-white p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <LayoutTemplateIcon className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-semibold">Templates</span>
            {!loading && (
              <span className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                {templates.length}
              </span>
            )}
          </div>
        </div>
        <Link href="/dashboard">
          <button className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors">
            Шинэ project →
          </button>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Template хайх..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-xs h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  activeCategory === cat
                    ? "bg-violet-600 text-white"
                    : "border border-white/10 text-white/40 hover:border-white/20 hover:text-white/60"
                }`}
              >
                {cat === "general" ? "Ерөнхий" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2Icon className="w-6 h-6 animate-spin text-white/30" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
            <LayoutTemplateIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/30 text-sm mb-2">
              {templates.length === 0 ? "Одоохондоо template байхгүй байна" : "Хайлтад тохирох template олдсонгүй"}
            </p>
            <p className="text-white/20 text-xs mb-6">
              Та өөрийн project-ийг template болгоорой — dashboard дээрх project card дээр харагдана
            </p>
            <Link href="/dashboard">
              <button className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-5 py-2 rounded-lg transition-colors">
                Dashboard руу очих →
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t, i) => (
              <div key={t.id} className="group rounded-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-all hover:-translate-y-0.5 bg-[#111318]">
                {/* Thumbnail */}
                <div className={`h-44 bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} relative overflow-hidden`}>
                  {t.thumbnailUrl ? (
                    <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-start justify-end p-4">
                      <div className="space-y-1.5 w-full">
                        <div className="w-24 h-2 bg-white/15 rounded" />
                        <div className="w-16 h-1.5 bg-white/10 rounded" />
                        <div className="w-20 h-1.5 bg-white/10 rounded" />
                        <div className="w-14 h-1.5 bg-white/8 rounded" />
                      </div>
                    </div>
                  )}
                  {/* Fork overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    onClick={() => handleFork(t.id)}
                    disabled={forking === t.id}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-bold shadow-lg disabled:opacity-50 hover:bg-white/90"
                  >
                    {forking === t.id
                      ? <Loader2Icon className="w-3 h-3 animate-spin" />
                      : <GitForkIcon className="w-3 h-3" />
                    }
                    Авах
                  </button>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm text-white leading-tight truncate">{t.name}</h3>
                    {t.templateCategory && t.templateCategory !== "general" && (
                      <Badge variant="outline" className="text-[9px] border-white/15 text-white/40 shrink-0 bg-transparent">
                        {t.templateCategory}
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-white/40 line-clamp-2">{t.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-white/25">{t.templateAuthor ?? "Нэргүй"}</span>
                    <span className="text-[10px] text-white/25 flex items-center gap-0.5">
                      <GitForkIcon className="w-2.5 h-2.5" /> {t.forkCount}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
