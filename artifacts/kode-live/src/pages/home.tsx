import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground relative overflow-hidden">
      {/* Decorative noise/texture */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="z-10 flex flex-col items-center animate-in fade-in zoom-in duration-700">
        <h1 className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-2">
          kode<span className="text-primary">.live</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-8 tracking-wide font-mono text-center">
          Сайжруулсан кодчиллын орчин <br />
          <span className="text-sm opacity-50">Precision coding environment</span>
        </p>
        <Link href="/dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 font-mono tracking-wider hover-elevate duration-300">
          SYSTEM_START // СИСТЕМ_ЭХЛЭХ
        </Link>
      </div>
    </div>
  );
}
