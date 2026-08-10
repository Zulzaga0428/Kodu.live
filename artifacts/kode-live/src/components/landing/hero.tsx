import { motion } from "framer-motion";
import { ArrowUp, Library, Mic, Paperclip } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { useLanguage } from "@/store/lang-store";

const MODELS = [
  { id: "fast",  label: "Fast",  cost: "4кр" },
  { id: "smart", label: "Smart", cost: "7кр" },
  { id: "deep",  label: "Deep",  cost: "25кр" },
];

const PLACEHOLDER: Record<"mn" | "en", { prefix: string; words: string[] }> = {
  mn: {
    prefix: "Build Your ",
    words: ["Business Website", "eCommerce Store", "SaaS Platform", "Portfolio", "Dashboard"],
  },
  en: {
    prefix: "Build Your ",
    words: ["Business Website", "eCommerce Store", "SaaS Platform", "Portfolio", "Dashboard"],
  },
};

function RotatingPrompt({ prefix, words }: { prefix: string; words: string[] }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  useEffect(() => { setWordIndex(0); setText(""); setPhase("typing"); }, [prefix, words]);

  useEffect(() => {
    const word = words[wordIndex % words.length]!;
    let delay = 90;
    if (phase === "typing") {
      if (text === word) { setPhase("pausing"); delay = 1400; }
    } else if (phase === "pausing") {
      delay = 1400;
    } else {
      delay = 45;
    }
    const id = setTimeout(() => {
      if (phase === "typing") {
        if (text !== word) setText(word.slice(0, text.length + 1));
      } else if (phase === "pausing") {
        setPhase("deleting");
      } else {
        if (text === "") { setWordIndex((p) => (p + 1) % words.length); setPhase("typing"); }
        else setText(word.slice(0, text.length - 1));
      }
    }, delay);
    return () => clearTimeout(id);
  }, [text, phase, wordIndex, words]);

  return (
    <span aria-hidden className="pointer-events-none relative block h-7 w-full overflow-hidden text-left text-[15px] text-zinc-500">
      {prefix}
      <span className="text-zinc-300">{text}</span>
      <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-zinc-400 align-middle" />
    </span>
  );
}

export function Hero() {
  const [, setLocation] = useLocation();
  const { t, lang } = useLanguage();
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("fast");
  const activeModel = MODELS.find((m) => m.id === model) ?? MODELS[0]!;
  const ph = PLACEHOLDER[lang];

  const handleGenerate = () => {
    const params = new URLSearchParams();
    if (prompt.trim()) params.set("prompt", prompt.trim());
    setLocation(`/dashboard?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden px-5 pb-28 pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(124,92,255,0.20),transparent_65%)] blur-3xl" />
        <div className="absolute left-1/4 top-24 h-[300px] w-[400px] rounded-full bg-[radial-gradient(ellipse,rgba(167,139,255,0.10),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl text-white"
          style={{ textShadow: "0 0 40px rgba(124,92,255,0.25)" }}
        >
          {t("hero.headline1")}{" "}
          <span className="bg-gradient-to-r from-[#b9a6ff] via-[#7c5cff] to-[#a78bff] bg-clip-text text-transparent">
            {t("hero.headline2")}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-400"
        >
          {t("hero.sub")}
        </motion.p>

        {/* Prompt card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e18] shadow-2xl shadow-black/60"
        >
          {/* Model selector */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
            <div className="flex items-center gap-1">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold font-mono transition-all ${
                    model === m.id
                      ? "bg-[#7c5cff]/20 text-[#c9b8ff] ring-1 ring-[#7c5cff]/30"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] font-mono text-[#a78bff] font-semibold">{activeModel.cost}</span>
          </div>

          {/* Input area */}
          <div className="px-4 pt-3 pb-1">
            {prompt ? (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                rows={3}
                className="w-full bg-transparent text-[15px] text-zinc-200 outline-none resize-none leading-relaxed placeholder:text-zinc-600"
              />
            ) : (
              <div
                className="cursor-text py-1"
                onClick={() => {
                  const ta = document.getElementById("hero-ta") as HTMLTextAreaElement | null;
                  ta?.focus();
                }}
              >
                <RotatingPrompt prefix={ph.prefix} words={ph.words} />
                <textarea
                  id="hero-ta"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                  rows={1}
                  className="w-full bg-transparent text-[15px] text-zinc-200 outline-none resize-none opacity-0 h-0"
                />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-end justify-between p-1 px-3 pb-3">
            <div className="flex gap-2">
              {[
                { icon: Paperclip, label: lang === "mn" ? "Хавсаргах" : "Attach" },
                { icon: Mic, label: lang === "mn" ? "Дуу" : "Voice" },
                { icon: Library, label: lang === "mn" ? "Загвар" : "Prompts" },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-white/10 hover:text-zinc-200"
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7c5cff] text-white transition hover:scale-105 hover:brightness-110 active:scale-95"
            >
              <ArrowUp size={18} className="stroke-[2.5]" />
            </button>
          </div>
        </motion.div>

        {/* Decorative preview */}
        <div className="pointer-events-none mt-6 space-y-3 opacity-25 w-full max-w-2xl">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 shrink-0 rounded-full bg-white/10" />
            <div className="h-12 w-3/4 rounded-lg bg-white/5" />
          </div>
          <div className="flex justify-end">
            <div className="h-16 w-1/2 rounded-lg border border-[#7c5cff]/20 bg-[#7c5cff]/10" />
          </div>
        </div>

        <p className="mt-5 text-[11px] text-zinc-600">Powered by Zulzaga Ai V4.7</p>
      </div>
    </section>
  );
}
