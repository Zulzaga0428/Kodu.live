import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeftIcon, ZapIcon, BrainIcon, MicroscopeIcon, StarIcon, CheckIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const PACKAGES = [
  {
    id: "standard",
    name: "Standard",
    credits: 50,
    price: 50000,
    color: "border-border/60 bg-card",
    buttonClass: "border border-border text-foreground hover:bg-accent",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 100,
    price: 80000,
    color: "border-violet-500/60 bg-gradient-to-b from-violet-950/40 to-card",
    buttonClass: "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    credits: 180,
    price: 120000,
    color: "border-border/60 bg-card",
    buttonClass: "border border-border text-foreground hover:bg-accent",
    popular: false,
  },
];

const USAGE = [
  { icon: <ZapIcon className="w-3.5 h-3.5 text-yellow-400" />, label: "Fast үйлдэл", cost: 4, note: "claude-haiku" },
  { icon: <BrainIcon className="w-3.5 h-3.5 text-blue-400" />, label: "Smart үйлдэл", cost: 7, note: "claude-sonnet" },
  { icon: <MicroscopeIcon className="w-3.5 h-3.5 text-purple-400" />, label: "Deep үйлдэл", cost: 10, note: "claude-opus" },
  { icon: <StarIcon className="w-3.5 h-3.5 text-green-400" />, label: "Шинэ хэрэглэгч бүрт", cost: 20, note: "үнэгүй эхлэл" },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      // QPay QR URL
      if (data.invoice?.qr_image) {
        window.open(data.invoice.qr_text ?? data.invoice.qr_image, "_blank");
      } else {
        toast({ title: "QPay тохируулагдаагүй", description: "Удахгүй нээгдэнэ", variant: "destructive" });
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
            Fast generate = 4кр · Smart generate = 7кр · QPay-р төлнө
          </p>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border p-6 ${pkg.color} transition-all`}
            >
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
                disabled={loading === pkg.id}
                className={`w-full py-2.5 rounded-xl font-mono text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${pkg.buttonClass}`}
              >
                {loading === pkg.id ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ZapIcon className="w-3.5 h-3.5" />
                )}
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
                  {u.note === "үнэгүй эхлэл" ? `${u.cost}кр` : `${u.cost}кр`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Free note */}
        <div className="mt-4 text-center">
          <p className="text-[11px] font-mono text-muted-foreground/50 flex items-center justify-center gap-1">
            <CheckIcon className="w-3 h-3 text-green-400" />
            Шинэ бүртгэл бүр 20 үнэгүй кредит авна
          </p>
        </div>
      </div>
    </div>
  );
}
