import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
        <h1 className="text-8xl font-bold font-mono text-muted-foreground mb-4">404</h1>
        <h2 className="text-xl font-mono text-foreground mb-2">Объект олдсонгүй (Object not found)</h2>
        <p className="text-muted-foreground mb-8">Энэ хуудас системд бүртгэлгүй байна.</p>
        <Link href="/dashboard" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 font-mono">
          &larr; БУЦАХ (RETURN)
        </Link>
      </div>
    </div>
  );
}
