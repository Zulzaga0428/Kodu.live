import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useLanguage } from "@/store/lang-store";

const COPY = {
  mn: {
    label: "QPay-тэй",
    title: "Зөвхөн сайт биш —",
    titleAccent: "мөнгө олддог бизнес",
    body: "KoDu-гаар хийсэн дэлгүүр QPay-ээр шууд төлбөр авна. Гадаад карт, Stripe хэрэггүй — монгол хэрэглэгч, монгол төлбөр. Код бичихгүйгээр, минутын дотор.",
    badges: ["🇲🇳 Монголоор ярь", "💰 QPay-ээр мөнгө ав", "⚡ Минутад бэлэн"],
    order: "Захиалга #1024", merchant: "KoDu Дэлгүүр", amount: "49,900₮",
    confirm: "Төлбөр төлөх", processing: "Боловсруулж байна…",
    paid: "Амжилттай төлөгдлөө!", paidSub: "Таны захиалга баталгаажлаа",
  },
  en: {
    label: "QPay built-in",
    title: "Not just a site —",
    titleAccent: "a business that earns",
    body: "Stores you build with KoDu take payments directly via QPay. No Stripe, no foreign card — Mongolian customers, Mongolian payments. No code, ready in minutes.",
    badges: ["🇲🇳 Speak Mongolian", "💰 Get paid via QPay", "⚡ Ready in minutes"],
    order: "Order #1024", merchant: "KoDu Store", amount: "₮49,900",
    confirm: "Pay now", processing: "Processing…",
    paid: "Payment successful!", paidSub: "Your order is confirmed",
  },
} as const;

type Stage = "idle" | "processing" | "paid";

function QpayMock({ lang }: { lang: "mn" | "en" }) {
  const c = COPY[lang];
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    let alive = true;
    const cycle = () => {
      if (!alive) return;
      setStage("idle");
      const t1 = setTimeout(() => { if (alive) setStage("processing"); }, 2200);
      const t2 = setTimeout(() => { if (alive) setStage("paid"); }, 3800);
      const t3 = setTimeout(cycle, 7000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    };
    const cleanup = cycle();
    return () => { alive = false; cleanup?.(); };
  }, []);

  const isPaid = stage === "paid";
  const isProcessing = stage === "processing";

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-full blur-3xl transition-all duration-700"
        style={{ background: isPaid ? "radial-gradient(ellipse, rgba(16,185,129,0.22) 0%, transparent 70%)" : "radial-gradient(ellipse, rgba(91,140,255,0.15) 0%, transparent 70%)" }}
      />
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.09] bg-[#0d0d0d] shadow-[0_32px_64px_rgba(0,0,0,0.6)]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span className="text-[10px] font-semibold text-zinc-500">9:41</span>
          <div className="flex items-center gap-1">
            {[3,4,5,6].map(h => <div key={h} className="w-[3px] rounded-sm bg-zinc-500" style={{ height: h }} />)}
            <div className="ml-1 h-3 w-5 rounded-[3px] border border-zinc-500 p-[1.5px]">
              <div className="h-full w-3/4 rounded-[1.5px] bg-zinc-500" />
            </div>
          </div>
        </div>
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-white/[0.05] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a3bcc] shadow-lg shadow-[#1a3bcc]/30">
            <span className="text-[13px] font-black text-white">Q</span>
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">QPay</p>
            <p className="text-[10px] text-zinc-500">Монголын нэгдсэн төлбөр</p>
          </div>
        </div>
        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] text-zinc-600 mb-1">{c.order}</p>
            <p className="text-[13px] font-semibold text-zinc-200">{c.merchant}</p>
            <p className="text-xl font-black text-white mt-1">{c.amount}</p>
          </div>
          {/* Button */}
          <AnimatePresence mode="wait">
            {stage === "idle" && (
              <motion.button key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full rounded-xl bg-[#1a3bcc] py-3 text-[13px] font-bold text-white shadow-lg shadow-[#1a3bcc]/30 transition hover:bg-[#1a3bcc]/90"
              >{c.confirm}</motion.button>
            )}
            {stage === "processing" && (
              <motion.div key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-full rounded-xl bg-[#1a3bcc]/50 py-3 text-center text-[13px] font-bold text-zinc-400 flex items-center justify-center gap-2"
              >
                <span className="flex gap-1">{[0,1,2].map(i => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#5b8cff]" style={{ animationDelay: `${i * 0.1}s` }} />)}</span>
                {c.processing}
              </motion.div>
            )}
            {stage === "paid" && (
              <motion.div key="paid" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/30 py-3 text-center"
              >
                <p className="text-[13px] font-bold text-emerald-400">✓ {c.paid}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{c.paidSub}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export function Payment() {
  const { lang } = useLanguage();
  const c = COPY[lang];

  return (
    <section className="relative overflow-hidden px-5 py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 flex justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(16,185,129,0.06),transparent_65%)] blur-3xl" />
      </div>
      <div className="relative mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-emerald-400">{c.label}</p>
          <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            {c.title}{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-[#5b8cff] bg-clip-text text-transparent">{c.titleAccent}</span>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400">{c.body}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {c.badges.map(b => (
              <span key={b} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300">{b}</span>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex justify-center">
          <QpayMock lang={lang} />
        </motion.div>
      </div>
    </section>
  );
}
