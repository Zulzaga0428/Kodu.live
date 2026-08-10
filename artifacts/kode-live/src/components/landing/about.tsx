import { motion } from "framer-motion";
import { useEffect, useState, Fragment } from "react";
import { useLanguage } from "@/store/lang-store";

function withBrand(text: string) {
  const parts = text.split("KoDu");
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && (<>Ko<span className="brand-text">Du</span></>)}
    </Fragment>
  ));
}

const DEMO_PROMPTS: Record<"mn" | "en", string[]> = {
  mn: ["Кофе шопын сайт хий", "Онлайн дэлгүүр хий", "Портфолио сайт хий"],
  en: ["Build a coffee shop site", "Build an online store", "Build a portfolio site"],
};

function PromptToSite({ lang }: { lang: "mn" | "en" }) {
  const prompts = DEMO_PROMPTS[lang];
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "building" | "done">("typing");
  const full = prompts[promptIndex % prompts.length]!;

  useEffect(() => { setPromptIndex(0); setTyped(""); setPhase("typing"); }, [lang]);

  useEffect(() => {
    if (phase === "typing") {
      if (typed === full) { const id = setTimeout(() => setPhase("building"), 550); return () => clearTimeout(id); }
      const id = setTimeout(() => setTyped(full.slice(0, typed.length + 1)), 70);
      return () => clearTimeout(id);
    }
    if (phase === "building") {
      const id = setTimeout(() => setPhase("done"), 1100); return () => clearTimeout(id);
    }
    const id = setTimeout(() => { setTyped(""); setPromptIndex((p) => (p + 1) % prompts.length); setPhase("typing"); }, 2600);
    return () => clearTimeout(id);
  }, [phase, typed, full, prompts.length]);

  const built = phase === "done";
  const building = phase === "building";

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex justify-start">
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#7c5cff]/15 px-3 py-2 text-[13px] font-medium text-[#c9b8ff] ring-1 ring-[#7c5cff]/25">
          {typed}
          {phase === "typing" && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-[#c9b8ff] align-middle" />}
        </div>
      </div>
      <div className="flex items-center gap-2 pl-1 text-[11px] text-zinc-500">
        {building ? (
          <>
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => <span key={i} className={`h-1.5 w-1.5 animate-bounce rounded-full bg-[#7c5cff]`} style={{ animationDelay: `${-0.2 + i * 0.1}s` }} />)}
            </span>
            {withBrand(lang === "mn" ? "KoDu бичиж байна..." : "KoDu is building...")}
          </>
        ) : built ? (
          <span className="text-emerald-400">{lang === "mn" ? "✓ Сайт бэлэн боллоо" : "✓ Website ready"}</span>
        ) : <span className="opacity-0">.</span>}
      </div>
      <motion.div
        className="mt-auto overflow-hidden rounded-lg border border-white/10 bg-[#0c0c0c]"
        animate={{ opacity: built ? 1 : 0.25, scale: built ? 1 : 0.96, filter: built ? "blur(0px)" : "blur(1px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.03] px-2.5 py-1.5">
          {[0,1,2].map(i => <span key={i} className="h-2 w-2 rounded-full bg-white/20" />)}
          <span className="ml-2 h-2.5 flex-1 rounded-full bg-white/5" />
        </div>
        <div className="space-y-2 p-3">
          <motion.div className="h-7 rounded-md bg-gradient-to-r from-[#7c5cff]/60 to-[#a78bff]/40" initial={false} animate={{ opacity: built ? 1 : 0, y: built ? 0 : 8 }} transition={{ delay: built ? 0.05 : 0, duration: 0.4 }} />
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => (
              <motion.div key={i} className="h-8 rounded-md bg-white/8" initial={false} animate={{ opacity: built ? 1 : 0, y: built ? 0 : 8 }} transition={{ delay: built ? 0.15 + i * 0.08 : 0, duration: 0.4 }} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const COPY = {
  mn: {
    heading: "KoDu — гэж хэн бэ",
    card1: { title: "5 минутад вэбсайт", body: "Та санаагаа монгол хэлээр бичихэд л хангалттай. KoDu таны өмнөөс код бичиж, дизайныг гаргаж, минутын дотор бодит вэбсайт болгон хувиргана." },
    card2: { title: "Олон загвар", body: "Мэргэжлийн түвшний бэлэн загваруудаас сонгон, өөрийн брэндэд тохируулан хормын зуур өөрчлөх боломжтой." },
    card3: { title: "AI-д суурилсан", body: "Хүчирхэг AI-аар тоноглогдсон тул монгол хэлийг төгс ойлгож, таны хүссэн шийдлийг ухаалгаар санал болгоно." },
  },
  en: {
    heading: "What is KoDu",
    card1: { title: "A website in 5 minutes", body: "Just describe your idea in Mongolian. KoDu writes the code, designs it, and turns it into a real website in minutes." },
    card2: { title: "Templates", body: "Start from professional, ready-made templates and tailor them to your brand in seconds." },
    card3: { title: "Powered by AI", body: "Built on powerful AI that understands Mongolian perfectly and suggests smart solutions for what you want." },
  },
} as const;

export function About() {
  const { lang } = useLanguage();
  const c = COPY[lang];

  return (
    <section id="about" className="relative z-10 bg-[#050505] px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mb-14 text-center text-3xl font-bold tracking-tight text-white sm:text-5xl"
        >
          {withBrand(c.heading)}
        </motion.h2>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card 1 — wide */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 text-white shadow-xl transition-colors duration-500 hover:border-[#7c5cff]/40 md:col-span-2 md:flex-row md:items-center md:gap-8 md:rounded-3xl md:p-8"
          >
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-bold tracking-tight md:mb-4 md:text-3xl">{c.card1.title}</h3>
              <p className="max-w-lg text-sm font-medium leading-relaxed text-zinc-400 md:text-xl">{c.card1.body}</p>
            </div>
            <div className="relative hidden h-[250px] w-full flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-4 shadow-inner md:block">
              <PromptToSite lang={lang} />
            </div>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 text-white shadow-xl transition-colors duration-500 hover:border-[#7c5cff]/40 md:rounded-3xl md:p-8"
          >
            <h3 className="mb-2 text-lg font-bold tracking-tight md:mb-4 md:text-3xl">{c.card2.title}</h3>
            <p className="text-xs font-medium leading-relaxed text-zinc-400 md:text-base">{c.card2.body}</p>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#7c5cff]/5 blur-2xl transition-colors duration-500 group-hover:bg-[#7c5cff]/25" />
          </motion.div>

          {/* Card 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] p-4 text-white shadow-xl transition-colors duration-500 hover:border-[#7c5cff]/40 md:rounded-3xl md:p-8"
          >
            <h3 className="mb-2 text-lg font-bold tracking-tight md:mb-4 md:text-3xl">{c.card3.title}</h3>
            <p className="text-xs font-medium leading-relaxed text-zinc-400 md:text-base">{c.card3.body}</p>
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#7c5cff]/5 blur-2xl transition-colors duration-500 group-hover:bg-[#7c5cff]/25" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
