import { ArrowRight, LayoutGrid, GitForkIcon, LayoutTemplateIcon, Loader2Icon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useLanguage } from "@/store/lang-store";

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

export function TemplateGallery() {
  const { t: tr, lang } = useLanguage();
  const [, setLocation] = useLocation();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [forking, setForking] = useState<string | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    fetch(`${BASE}/api/templates`)
      .then(r => r.json())
      .then(d => setTemplates((d.templates ?? []).slice(0, 6)))
      .catch(() => {});
  }, []);

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
    <section id="templates" className="mx-auto max-w-6xl px-5 py-20">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {tr("tmpl.title")}
        </h2>
      </div>

      {templates.length === 0 ? (
        <div className="mt-10 flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl text-center">
          <LayoutTemplateIcon className="w-10 h-10 text-white/10 mb-3" />
          <p className="text-white/30 text-sm font-mono">
            {lang === "mn"
              ? "Одоохондоо загвар байхгүй байна — та анхных нь болоорой!"
              : "No templates yet — be the first to share one!"}
          </p>
          <Link href="/dashboard">
            <button className="mt-4 text-xs font-mono text-[#a78bff] hover:text-[#c9b8ff] transition-colors">
              {lang === "mn" ? "Шинэ project эхлэх →" : "Start a new project →"}
            </button>
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {templates.map((tmpl, i) => (
            <div
              key={tmpl.id}
              className="group overflow-hidden rounded-2xl border border-white/8 bg-white/3 transition-all duration-300 hover:border-[#7c5cff]/40 hover:bg-white/5 hover:shadow-xl hover:shadow-[#7c5cff]/8"
            >
              <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} sm:h-44`}>
                {tmpl.thumbnailUrl ? (
                  <img
                    src={tmpl.thumbnailUrl}
                    alt={tmpl.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-end p-4">
                    <LayoutTemplateIcon className="w-10 h-10 text-white/10" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                  <button
                    onClick={() => handleFork(tmpl.id)}
                    disabled={forking === tmpl.id}
                    className="flex items-center gap-2 rounded-full bg-[#7c5cff]/90 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-[#7c5cff] disabled:opacity-50"
                  >
                    {forking === tmpl.id
                      ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                      : <GitForkIcon className="w-3.5 h-3.5" />
                    }
                    {lang === "mn" ? "AI-р үүсгэх" : "Use template"}
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-zinc-100 sm:text-base">{tmpl.name}</h3>
                {tmpl.description && (
                  <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-zinc-500">{tmpl.description}</p>
                )}
                <button
                  onClick={() => handleFork(tmpl.id)}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#a78bff] transition-all duration-200 hover:gap-3"
                >
                  {tr("tmpl.use")} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link
          href="/templates"
          className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/4 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-[#7c5cff]/40 hover:bg-white/6 hover:text-white"
        >
          <LayoutGrid size={16} className="text-[#a78bff]" />
          {lang === "mn" ? "Бүгдийг харах" : "Browse all"}
          <ArrowRight size={15} className="ml-0.5" />
        </Link>
      </div>
    </section>
  );
}
