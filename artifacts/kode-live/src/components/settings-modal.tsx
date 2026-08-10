import { useState } from "react";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserIcon, BotIcon, CodeIcon, KeyIcon, AlertTriangleIcon,
  CheckIcon, ChevronRightIcon, GithubIcon, ExternalLinkIcon,
  EyeIcon, EyeOffIcon, Loader2Icon, SaveIcon, DownloadIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";

// ── Types ─────────────────────────────────────────────────────────────────────
type SettingsTab = "profile" | "agent" | "editor" | "apikeys" | "danger";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TABS: { id: SettingsTab; label: string; sublabel: string; icon: React.ReactNode }[] = [
  { id: "profile",  label: "Профайл",    sublabel: "Profile",      icon: <UserIcon className="w-4 h-4" /> },
  { id: "agent",    label: "AI Агент",   sublabel: "Agent",        icon: <BotIcon className="w-4 h-4" /> },
  { id: "editor",   label: "Редактор",   sublabel: "Editor",       icon: <CodeIcon className="w-4 h-4" /> },
  { id: "apikeys",  label: "API Keys",   sublabel: "Integrations", icon: <KeyIcon className="w-4 h-4" /> },
  { id: "danger",   label: "Аюулын бүс", sublabel: "Danger zone",  icon: <AlertTriangleIcon className="w-4 h-4" /> },
];

// ── Root modal ────────────────────────────────────────────────────────────────
export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>("profile");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden border-border/60 shadow-2xl" hideClose>
        <div className="flex h-[540px]">
          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-border/50 bg-card/40 flex flex-col">
            <div className="px-4 py-4 border-b border-border/50">
              <h2 className="font-mono font-bold text-sm">Тохиргоо</h2>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Settings</p>
            </div>
            <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all group ${
                    tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
                  } ${t.id === "danger" ? "mt-auto" : ""}`}
                >
                  <span className={tab === t.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
                    {t.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-medium leading-none">{t.label}</p>
                    <p className="text-[9px] font-mono text-muted-foreground/60 mt-0.5">{t.sublabel}</p>
                  </div>
                  {tab === t.id && <ChevronRightIcon className="w-3 h-3 shrink-0" />}
                </button>
              ))}
            </nav>
            <div className="px-4 py-3 border-t border-border/50">
              <p className="text-[9px] font-mono text-muted-foreground/40">kodu.live v0.1.0</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-background">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 shrink-0">
              <div>
                <h3 className="font-mono font-semibold text-sm">{TABS.find((t) => t.id === tab)?.label}</h3>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{TABS.find((t) => t.id === tab)?.sublabel}</p>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xs font-mono px-2 py-1 rounded border border-border/50 hover:border-border"
              >
                ESC
              </button>
            </div>
            <div className="flex-1 overflow-auto px-6 py-5">
              {tab === "profile"  && <ProfileTab />}
              {tab === "agent"    && <AgentTab />}
              {tab === "editor"   && <EditorTab />}
              {tab === "apikeys"  && <ApiKeysTab />}
              {tab === "danger"   && <DangerTab onClose={() => onOpenChange(false)} />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest border-b border-border/40 pb-2">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-medium">{label}</p>
        {sub && <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-9 h-5 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-card border border-border/60 text-xs font-mono rounded-lg px-3 py-1.5 text-foreground outline-none focus:border-primary/60 transition-colors cursor-pointer"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2Icon className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 items-center justify-center h-40">
        <p className="text-sm font-mono text-muted-foreground">Нэвтрээгүй байна</p>
        <a href="/login">
          <Button size="sm" className="font-mono text-xs">Нэвтрэх →</Button>
        </a>
      </div>
    );
  }

  const initials = user.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const providerLabel = user.provider === "google" ? "Google" : user.provider === "github" ? "GitHub" : user.provider;

  return (
    <div className="flex flex-col gap-6">
      <Section title="Хэрэглэгчийн мэдээлэл">
        <div className="flex items-center gap-4">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full object-cover shrink-0 border border-border/40" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-white">{initials}</span>
            </div>
          )}
          <div>
            <p className="font-mono font-semibold text-sm">{user.name}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
              {providerLabel}-аар нэвтэрсэн
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1.5 block">Нэр</label>
            <Input value={user.name} readOnly className="font-mono text-sm h-8 bg-card/30 text-muted-foreground cursor-default" />
          </div>
          <div>
            <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mb-1.5 block">Email</label>
            <Input value={user.email} readOnly className="font-mono text-sm h-8 bg-card/30 text-muted-foreground cursor-default" />
          </div>
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/50">
          Профайл мэдээлэл {providerLabel}-аас автоматаар синхрончлогдоно.
        </p>
      </Section>
    </div>
  );
}

// ── Agent Tab ─────────────────────────────────────────────────────────────────
function AgentTab() {
  const { settings, setSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Агентын тохиргоо хадгалагдлаа ✓" });
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Загвар — Model">
        <Row label="Claude загвар" sub="Ямар AI загвар ашиглах вэ">
          <Select
            value={settings.model}
            onChange={(v) => setSettings({ model: v })}
            options={[
              { value: "claude-opus-4-5",   label: "Claude Opus 4.5 — Хамгийн ухаалаг" },
              { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5 — Тэнцвэртэй" },
              { value: "claude-haiku-3-5",  label: "Claude Haiku 3.5 — Хурдан" },
            ]}
          />
        </Row>
        <Row label="Хариултын урт" sub="Max tokens">
          <Select
            value={settings.maxTokens}
            onChange={(v) => setSettings({ maxTokens: v })}
            options={[
              { value: "2048",  label: "2,048 — Богино" },
              { value: "4096",  label: "4,096 — Стандарт" },
              { value: "8192",  label: "8,192 — Урт" },
              { value: "16384", label: "16,384 — Маш урт" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Хэл — Language">
        <Row label="Агентын хариултын хэл" sub="Монгол / Англи">
          <Select
            value={settings.lang}
            onChange={(v) => setSettings({ lang: v })}
            options={[
              { value: "mn",   label: "🇲🇳 Монгол" },
              { value: "en",   label: "🇬🇧 English" },
              { value: "both", label: "🌐 Хоёулаа" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Зан байдал — Behavior">
        <Row label="Авто ажиллуулах" sub="Агент командыг автоматаар ажиллуулна">
          <Toggle on={settings.autoRun} onChange={(v) => setSettings({ autoRun: v })} />
        </Row>
        <Row label="Streaming хариулт" sub="Бичиж байгаа мэт шуурхай харуулна">
          <Toggle on={settings.streaming} onChange={(v) => setSettings({ streaming: v })} />
        </Row>
      </Section>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex-1 mr-3">
          <BotIcon className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="text-[11px] font-mono text-muted-foreground">
            <span className="text-foreground">{settings.model}</span> · {settings.maxTokens} tokens · {settings.lang === "mn" ? "🇲🇳 Монгол" : settings.lang === "en" ? "🇬🇧 English" : "🌐 Хоёулаа"}
          </p>
        </div>
        <Button onClick={save} size="sm" className="font-mono text-xs gap-1.5 shrink-0">
          {saved ? <CheckIcon className="w-3.5 h-3.5" /> : <SaveIcon className="w-3.5 h-3.5" />}
          {saved ? "Хадгалагдлаа!" : "Хадгалах"}
        </Button>
      </div>
    </div>
  );
}

// ── Editor Tab ────────────────────────────────────────────────────────────────
function EditorTab() {
  const { settings, setSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Редакторын тохиргоо хадгалагдлаа ✓" });
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Харагдах байдал — Appearance">
        <Row label="Font хэмжээ" sub="Редакторын үсгийн хэмжээ">
          <Select
            value={settings.fontSize}
            onChange={(v) => setSettings({ fontSize: v })}
            options={[
              { value: "11", label: "11px" },
              { value: "12", label: "12px" },
              { value: "13", label: "13px — Стандарт" },
              { value: "14", label: "14px" },
              { value: "16", label: "16px" },
            ]}
          />
        </Row>
        <Row label="Загвар" sub="Dark / Light">
          <Select
            value={settings.theme}
            onChange={(v) => setSettings({ theme: v })}
            options={[
              { value: "dark",  label: "🌑 Dark" },
              { value: "light", label: "☀️ Light" },
            ]}
          />
        </Row>
      </Section>

      <Section title="Засах тохиргоо — Editing">
        <Row label="Tab хэмжээ" sub="Spaces per tab">
          <Select
            value={settings.tabSize}
            onChange={(v) => setSettings({ tabSize: v })}
            options={[
              { value: "2", label: "2 spaces" },
              { value: "4", label: "4 spaces" },
            ]}
          />
        </Row>
        <Row label="Авто хадгалах" sub="Өөрчлөгдсний дараа автоматаар хадгална">
          <Toggle on={settings.autoSave} onChange={(v) => setSettings({ autoSave: v })} />
        </Row>
        <Row label="Мөр үргэлжлүүлэх" sub="Word wrap">
          <Toggle on={settings.wordWrap} onChange={(v) => setSettings({ wordWrap: v })} />
        </Row>
        <Row label="Minimap" sub="Кодын тойм харуулах">
          <Toggle on={settings.minimap} onChange={(v) => setSettings({ minimap: v })} />
        </Row>
      </Section>

      <Button onClick={save} size="sm" className="font-mono text-xs w-fit gap-1.5">
        {saved ? <CheckIcon className="w-3.5 h-3.5" /> : <SaveIcon className="w-3.5 h-3.5" />}
        {saved ? "Хадгалагдлаа!" : "Хадгалах"}
      </Button>
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [showKey, setShowKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem("kodu_anthropic_key") ?? "");
  const [saved, setSaved] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const saveKey = () => {
    localStorage.setItem("kodu_anthropic_key", anthropicKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "API key хадгалагдлаа ✓" });
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="AI — Anthropic">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-mono font-medium">Anthropic API Key</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Өөрийн Claude API key ашиглах (заавал биш)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="font-mono text-xs h-8 bg-card/50 pr-9"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
              </button>
            </div>
            <Button onClick={saveKey} size="sm" variant="outline" className="font-mono text-xs h-8 shrink-0 gap-1">
              {saved ? <CheckIcon className="w-3 h-3" /> : <SaveIcon className="w-3 h-3" />}
              {saved ? "OK" : "Хадгалах"}
            </Button>
          </div>
          {!anthropicKey && (
            <p className="text-[10px] font-mono text-muted-foreground/60">
              Key оруулаагүй бол kodu.live-ийн key ашиглана
            </p>
          )}
        </div>
      </Section>

      <Section title="Интеграц — Integrations">
        {/* GitHub */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#24292e] flex items-center justify-center">
              <GithubIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-mono font-medium">GitHub</p>
              <p className="text-[10px] font-mono text-muted-foreground">Repository sync · Commit · Push</p>
            </div>
          </div>
          <a href={`${BASE}/api/auth/github`}>
            <Button size="sm" className="font-mono text-xs h-7 gap-1.5">
              <ExternalLinkIcon className="w-3 h-3" /> Холбох
            </Button>
          </a>
        </div>

        {/* Vercel */}
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center border border-white/10">
              <svg width="16" height="16" viewBox="0 0 76 65" fill="white">
                <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-mono font-medium">Vercel</p>
              <p className="text-[10px] font-mono text-muted-foreground">Deploy · Preview · Production</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="font-mono text-xs h-7 text-muted-foreground" disabled>
            Тун удахгүй
          </Button>
        </div>
      </Section>
    </div>
  );
}

// ── Danger Tab ────────────────────────────────────────────────────────────────
function DangerTab({ onClose }: { onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [exporting, setExporting] = useState(false);
  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`${BASE}/api/export`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kodu-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Өгөгдөл экспортлогдлоо ✓" });
    } catch {
      toast({ title: "Экспорт амжилтгүй боллоо", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="Өгөгдөл экспортлох">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/20">
          <div>
            <p className="text-xs font-mono font-medium">Бүх өгөгдөл татах</p>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Төслүүд, зурвасууд, даалгаврууд — JSON</p>
          </div>
          <Button onClick={handleExport} disabled={exporting} size="sm" variant="outline" className="font-mono text-xs h-7 gap-1.5">
            {exporting ? <Loader2Icon className="w-3 h-3 animate-spin" /> : <DownloadIcon className="w-3 h-3" />}
            Export (.json)
          </Button>
        </div>
      </Section>

      <Section title="Аюулын бүс">
        <div className="flex flex-col gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-mono font-semibold text-destructive">Бүх төслүүд устгах</p>
              <p className="text-[10px] font-mono text-muted-foreground mt-1 leading-relaxed">
                Бүх төслүүд, зурвасууд, тохиргоо бүрмөсөн устгагдана. Энэ үйлдлийг буцааж болохгүй.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-mono text-muted-foreground">
              Баталгаажуулахын тулд <span className="text-destructive font-semibold">DELETE</span> гэж бичнэ үү
            </label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="font-mono text-xs h-8 bg-background border-destructive/30 focus-visible:border-destructive"
            />
            <Button
              variant="destructive"
              size="sm"
              disabled={confirm !== "DELETE"}
              className="font-mono text-xs h-7 w-fit"
              onClick={async () => {
                try {
                  await fetch(`${BASE}/api/projects/all`, { method: "DELETE" });
                  toast({ title: "Бүх төслүүд устгагдлаа", variant: "destructive" });
                  onClose();
                  setTimeout(() => window.location.href = "/dashboard", 500);
                } catch {
                  toast({ title: "Алдаа гарлаа", variant: "destructive" });
                }
              }}
            >
              Бүрмөсөн устгах
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
