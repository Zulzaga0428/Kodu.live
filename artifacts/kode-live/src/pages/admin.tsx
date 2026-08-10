import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  UsersIcon, FolderIcon, ZapIcon, CoinsIcon, TrendingUpIcon,
  ShieldIcon, ArrowLeftIcon, GiftIcon, Loader2Icon, ChevronLeftIcon,
  ChevronRightIcon, ServerIcon, AlertCircleIcon, BadgeCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "gomedia.9999@gmail.com";
const BASE = () => import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────────────────
type AdminStats = {
  totalUsers: number; totalProjects: number; liveSites: number; creditsUsed: number;
  totalRevenue: number; monthRevenue: number; paidUsers: number; freeUsers: number;
  mrr: number; hostingPaid: number; hostingExpiringSoon: number;
};

type AdminUser = {
  id: string; name: string; email: string; credits: number; provider: string; createdAt: string;
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-[#111318] border border-white/8 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono">
        {icon}
        <span>{label}</span>
      </div>
      <div>
        <div className="text-3xl font-bold font-mono text-foreground">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [giftUser, setGiftUser] = useState<AdminUser | null>(null);
  const [giftAmount, setGiftAmount] = useState("");
  const [gifting, setGifting] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Redirect if not admin
  useEffect(() => {
    if (!loading && (!user || !isAdmin)) setLocation("/dashboard");
  }, [loading, user, isAdmin]);

  // Fetch stats
  useEffect(() => {
    if (!isAdmin) return;
    setLoadingStats(true);
    fetch(`${BASE()}/api/admin/stats`).then(r => r.json()).then(d => {
      setStats(d); setLoadingStats(false);
    }).catch(() => setLoadingStats(false));
  }, [isAdmin]);

  // Fetch users
  useEffect(() => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    fetch(`${BASE()}/api/admin/users?page=${page}`).then(r => r.json()).then(d => {
      setUsers(d.users ?? []);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
      setLoadingUsers(false);
    }).catch(() => setLoadingUsers(false));
  }, [isAdmin, page]);

  const handleGift = async () => {
    if (!giftUser) return;
    const amount = parseInt(giftAmount);
    if (!amount || amount <= 0) return;
    setGifting(true);
    try {
      const r = await fetch(`${BASE()}/api/admin/users/${giftUser.id}/gift`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      toast({ title: `✅ ${d.name}-д ${amount}кр нэмэгдлээ` });
      // Update local state
      setUsers(prev => prev.map(u => u.id === giftUser.id ? { ...u, credits: d.newCredits } : u));
      setGiftUser(null); setGiftAmount("");
    } catch (e: any) {
      toast({ title: "Алдаа", description: e.message, variant: "destructive" });
    } finally { setGifting(false); }
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0e13] text-foreground font-mono">
      {/* Header */}
      <header className="h-14 border-b border-white/8 flex items-center justify-between px-6 bg-[#0e1017]">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-white/5 transition-colors">
              <ArrowLeftIcon className="w-4 h-4" />
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">kodu.live admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <img src={user.avatar ?? ""} alt={user.name} className="w-7 h-7 rounded-full" />
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<UsersIcon className="w-3.5 h-3.5" />}
            label="Хэрэглэгч"
            value={loadingStats ? "…" : (stats?.totalUsers ?? 0)}
          />
          <StatCard
            icon={<FolderIcon className="w-3.5 h-3.5" />}
            label="Төсөл"
            value={loadingStats ? "…" : (stats?.totalProjects ?? 0)}
          />
          <StatCard
            icon={<ServerIcon className="w-3.5 h-3.5" />}
            label="Live сайт"
            value={loadingStats ? "…" : (stats?.liveSites ?? 0)}
            sub="SAND sandbox"
          />
          <StatCard
            icon={<CoinsIcon className="w-3.5 h-3.5" />}
            label="Зарцуулсан credit"
            value={loadingStats ? "…" : (stats?.creditsUsed ?? 0).toLocaleString()}
          />
        </div>

        {/* ── Revenue ── */}
        <section className="bg-[#111318] border border-white/8 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Орлого</h2>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-400 bg-emerald-500/10">MNT</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <TrendingUpIcon className="w-3 h-3" /> Нийт орлого (dedup)
              </p>
              <p className="text-2xl font-bold">
                ₮{(loadingStats ? 0 : (stats?.totalRevenue ?? 0)).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">0 төлбөр</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Энэ сар (dedup)</p>
              <p className="text-2xl font-bold">
                ₮{(loadingStats ? 0 : (stats?.monthRevenue ?? 0)).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Төлбөртэй хэрэглэгч</p>
              <p className="text-2xl font-bold">{loadingStats ? "…" : (stats?.paidUsers ?? 0)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Нийт хэрэглэгч</p>
              <p className="text-2xl font-bold">{loadingStats ? "…" : (stats?.totalUsers ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">
                Үнэгүй: {loadingStats ? "…" : (stats?.freeUsers ?? 0)}
              </p>
            </div>
          </div>
        </section>

        {/* ── KoDu Hosting ── */}
        <section className="bg-[#111318] border border-white/8 rounded-xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">KoDu Hosting</h2>
            <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-400 bg-blue-500/10">
              ₮30,000/cap
            </Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <BadgeCheckIcon className="w-3 h-3 text-emerald-400" /> Төлбөртэй хост
              </p>
              <p className="text-2xl font-bold">{loadingStats ? "…" : (stats?.hostingPaid ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">+ 2 үнэгүй туршилт</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Сарын орлого (MRR)</p>
              <p className="text-2xl font-bold">
                ₮{(loadingStats ? 0 : (stats?.mrr ?? 0)).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">төлбөртэй захиалгын нийлбэр</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircleIcon className="w-3 h-3 text-yellow-400" /> Удахгүй дуусах
              </p>
              <p className="text-2xl font-bold">{loadingStats ? "…" : (stats?.hostingExpiringSoon ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">≤ 7 хоног</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Дууссан</p>
              <p className="text-2xl font-bold">0</p>
              <p className="text-[10px] text-muted-foreground">сүүлд шаардлагатай</p>
            </div>
          </div>
        </section>

        {/* ── Users table ── */}
        <section className="bg-[#111318] border border-white/8 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <h2 className="text-sm font-semibold">
              Хэрэглэгчид ({total})
            </h2>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8 text-muted-foreground">
                    <th className="text-left px-6 py-3 font-medium">Нэр</th>
                    <th className="text-left px-4 py-3 font-medium">Имэйл</th>
                    <th className="text-left px-4 py-3 font-medium">Төлөв</th>
                    <th className="text-left px-4 py-3 font-medium">Credit</th>
                    <th className="text-left px-4 py-3 font-medium">Бүртгүүлсэн</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-6 py-3">
                        <span className="font-semibold text-foreground">{u.name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[9px] border-muted-foreground/30 text-muted-foreground bg-transparent">
                          Үнэгүй
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.credits < 10 ? "text-orange-400" : "text-foreground"}>
                          {u.credits} кр
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("mn-MN")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setGiftUser(u); setGiftAmount(""); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 transition-colors text-[11px] font-semibold"
                        >
                          <GiftIcon className="w-3 h-3" />
                          Балаглах
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/8">
                <span className="text-[11px] text-muted-foreground">
                  Хуудас {page} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md border border-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md border border-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  >
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {/* ── Gift dialog ── */}
      <Dialog open={!!giftUser} onOpenChange={(o) => { if (!o) setGiftUser(null); }}>
        <DialogContent className="sm:max-w-[360px] border-border/50 font-mono">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <GiftIcon className="w-4 h-4 text-primary" />
              Кредит балаглах
            </DialogTitle>
          </DialogHeader>
          {giftUser && (
            <div className="space-y-4 py-2">
              <div className="bg-card/50 rounded-lg px-4 py-3 space-y-0.5">
                <p className="text-sm font-semibold">{giftUser.name}</p>
                <p className="text-[11px] text-muted-foreground">{giftUser.email}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Одоогийн: {giftUser.credits}кр</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] text-muted-foreground">Нэмэх кредит</label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(e.target.value)}
                  placeholder="50"
                  className="font-mono text-sm h-9"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleGift()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setGiftUser(null)} className="font-mono text-xs">Цуцлах</Button>
            <Button size="sm" onClick={handleGift} disabled={gifting || !giftAmount} className="font-mono text-xs gap-1.5">
              {gifting ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <GiftIcon className="w-3 h-3" />}
              Балаглах
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
