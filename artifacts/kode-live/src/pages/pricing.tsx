import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeftIcon, ZapIcon, BrainIcon, MicroscopeIcon, StarIcon,
  CheckIcon, SparklesIcon, Loader2Icon, XIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const PACKAGES = [
  {
    id: "standard", name: "Standard", credits: 50, price: 50000,
    color: "border-border/60 bg-card",
    buttonClass: "border border-border text-foreground hover:bg-accent",
    popular: false,
  },
  {
    id: "pro", name: "Pro", credits: 100, price: 80000,
    color: "border-violet-500/60 bg-gradient-to-b from-violet-950/40 to-card",
    buttonClass: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30",
    popular: true,
  },
  {
    id: "premium", name: "Premium", credits: 180, price: 120000,
    color: "border-border/60 bg-card",
    buttonClass: "border border-border text-foreground hover:bg-accent",
    popular: false,
  },
];

const USAGE = [
  { icon: <ZapIcon className="w-3.5 h-3.5 text-yellow-400" />, label: "Fast үйлдэл",       cost: 4,  note: "claude-haiku" },
  { icon: <BrainIcon className="w-3.5 h-3.5 text-blue-400" />, label: "Smart үйлдэл",      cost: 7,  note: "claude-sonnet" },
  { icon: <MicroscopeIcon className="w-3.5 h-3.5 text-purple-400" />, label: "Deep үйлдэл", cost: 25, note: "claude-opus" },
  { icon: <StarIcon className="w-3.5 h-3.5 text-green-400" />, label: "Шинэ хэрэглэгч бүрт", cost: 50, note: "үнэгүй эхлэл" },
];

type QPayModal = {
  invoiceId: string;
  qrImage: string;   // base64 PNG from QPay
  qrText: string;    // deep-link URL for mobile
  pkg: typeof PACKAGES[0];
};

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [modal, setModal] = useState<QPayModal | null>(null);
  const [paid, setPaid] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  // ── Poll payment status while modal is open ─────────────────────────────────
  useEffect(() => {
    if (!modal || paid) return;

    const invoiceId = modal.invoiceId;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BASE}/api/credits/qpay/status/${invoiceId}`);
        const d = await r.json();
        if (d.paid) {
          setPaid(true);
          clearInterval(pollRef.current!);
          // Reload page after 2s so credits badge updates
          setTimeout(() => { window.location.reload(); }, 2000);
        }
      } catch {}
    }, 3000); // poll every 3 seconds

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [modal, paid]);

  const closeModal = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setModal(null);
    setPaid(false);
  };

  const handlePurchase = async (pkgId: string) => {
    setLoading(pkgId);
    try {
      const res = await fetch(`${BASE}/api/credits/qpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkgId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Алдаа", description: data.error, variant: "destructive" });
        return;
      }

      const inv = data.invoice;
      const pkg = PACKAGES.find((p) => p.id === pkgId)!;

      if (inv?.qr_image || inv?.qr_text) {
        setModal({
          invoiceId: inv.invoice_id ?? inv.id ?? "",
          qrImage: inv.qr_image ?? "",
          qrText: inv.qr_text ?? inv.qr_image ?? "",
          pkg,
        });
      } else {
        toast({ title: "QPay алдаа", description: "QR код ирсэнгүй — QPay тохиргооноос шалгана уу", variant: "destructive" });
      }
    } catch {
      toast({ title: "Алдаа", description: "Холболт тасарлаа", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-4 h-11 flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ArrowLeftIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>
        <span className="font-mono text-sm font-semibold">kodu.live</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <p className="text-[11px] font-mono text-violet-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
            <SparklesIcon className="w-3 h-3" />
            КРЕДИТ ХУДАЛДАЖ АВАХ
          </p>
          <h1 className="text-4xl font-bold text-foreground mb-3">Шаардлагаараа кредит нэм</h1>
          <p className="text-sm text-muted-foreground font-mono">
            Fast = 4кр · Smart = 7кр · Deep = 25кр · QPay-р төлнө
          </p>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className={`relative rounded-2xl border p-6 ${pkg.color} transition-all`}>
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-violet-600 text-white text-[10px] font-mono px-2.5 py-0.5 rounded-full border-0">
                    ★ Хамгийн их сонгол
                  </Badge>
                </div>
              )}
              <p className="text-sm font-mono font-semibold text-muted-foreground mb-3">{pkg.name}</p>
              <div className="mb-1">
                <span className="text-5xl font-bold text-foreground">{pkg.credits}</span>
                <span className="text-sm text-muted-foreground ml-1 font-mono">кр</span>
              </div>
              <p className="text-violet-400 font-mono font-bold text-lg mb-5">
                ₮{pkg.price.toLocaleString()}
              </p>
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={!!loading}
                className={`w-full py-2.5 rounded-xl font-mono text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${pkg.buttonClass}`}
              >
                {loading === pkg.id
                  ? <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                  : <ZapIcon className="w-3.5 h-3.5" />
                }
                QPay-р авах
              </button>
            </div>
          ))}
        </div>

        {/* Usage table */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="font-mono font-semibold text-sm mb-4">Кредит хэрхэн ажилладаг вэ?</h3>
          <div className="grid grid-cols-2 gap-2">
            {USAGE.map((u) => (
              <div key={u.label} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-background/50 border border-border/40">
                <div className="flex items-center gap-2">
                  {u.icon}
                  <div>
                    <p className="text-[11px] font-mono font-medium text-foreground">{u.label}</p>
                    <p className="text-[9px] font-mono text-muted-foreground">{u.note}</p>
                  </div>
                </div>
                <span className={`text-[11px] font-mono font-bold ${u.note === "үнэгүй эхлэл" ? "text-green-400" : "text-violet-400"}`}>
                  {u.cost}кр
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Free note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] font-mono text-muted-foreground/50 flex items-center justify-center gap-1">
            <CheckIcon className="w-3 h-3 text-green-400" />
            Шинэ бүртгэл бүр 50 үнэгүй кредит авна
          </p>
        </div>
      </div>

      {/* ── QPay QR Modal ─────────────────────────────────────────────────────── */}
      <Dialog open={!!modal} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="sm:max-w-[380px] border-border/50 p-0 overflow-hidden font-mono">
          {modal && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <ZapIcon className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold">QPay төлбөр</span>
                </div>
                <button onClick={closeModal} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-5 space-y-4">
                {paid ? (
                  /* ── Success state ── */
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2Icon className="w-8 h-8 text-green-400" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-base text-foreground">Төлбөр амжилттай!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        +{modal.pkg.credits} кредит таны данс руу нэмэгдлээ
                      </p>
                    </div>
                    <Loader2Icon className="w-4 h-4 animate-spin text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground">Шинэчлэж байна...</p>
                  </div>
                ) : (
                  /* ── QR state ── */
                  <>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        <span className="text-foreground font-semibold">{modal.pkg.name}</span>
                        {" "}— {modal.pkg.credits}кр · ₮{modal.pkg.price.toLocaleString()}
                      </p>
                    </div>

                    {/* QR code */}
                    {modal.qrImage ? (
                      <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-xl">
                          <img
                            src={`data:image/png;base64,${modal.qrImage}`}
                            alt="QPay QR"
                            className="w-48 h-48 object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-48 border border-dashed border-border/50 rounded-xl">
                        <p className="text-xs text-muted-foreground">QR код ирэхгүй байна</p>
                      </div>
                    )}

                    {/* Mobile deep-link */}
                    {modal.qrText && (
                      <a
                        href={modal.qrText}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold text-center transition-colors"
                      >
                        QPay аппаар нэвтрэх
                      </a>
                    )}

                    <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                      <Loader2Icon className="w-3 h-3 animate-spin" />
                      Төлбөр хүлээж байна...
                    </div>

                    <p className="text-[10px] text-muted-foreground/50 text-center leading-relaxed">
                      QPay аппаа нээж QR уншуулна уу. Төлбөр орсны дараа автоматаар нэмэгдэнэ.
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
