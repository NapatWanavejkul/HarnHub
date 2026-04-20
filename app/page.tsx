import Link from "next/link";
import Image from "next/image";
import { Utensils, Home as HomeIcon, Plane } from "lucide-react";

export default function HarnHubLanding() {
  return (
    <main className="relative min-h-screen text-black p-6 font-sans flex flex-col items-center justify-center">
      
      <div className="relative z-10 w-full max-w-4xl py-12 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-violet-400 to-rose-400 pb-2 drop-shadow-sm">
            HarnHub
          </h1>
          <p className="text-zinc-700 text-lg md:text-xl font-bold tracking-wide uppercase drop-shadow-sm">
            The ultimate shared expense routing engine.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* Module 1 (Restaurant) */}
          <Link href="/restaurant" className="block group">
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-8 border border-white/80 group-hover:border-violet-400 group-hover:bg-white/80 transition-all duration-300 h-full flex flex-col items-center text-center gap-4 hover:shadow-[0_10px_40px_rgba(139,92,246,0.2)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-5 bg-white/80 rounded-full text-zinc-600 group-hover:text-violet-600 group-hover:bg-violet-50 transition-colors shadow-sm">
                <Utensils size={40} strokeWidth={1.5} />
              </div>
              <div className="mt-2">
                <h2 className="text-xl font-black uppercase tracking-widest text-zinc-800 group-hover:text-black transition-colors mb-3">Restaurant Bill</h2>
                <p className="text-sm text-zinc-600 font-bold leading-relaxed">Split complex bills with VAT, SC, and proportional discounts.</p>
              </div>
            </div>
          </Link>
          
          {/* Module 2 (Monthly/Fixed) */}
          <Link href="/monthly" className="block group">
            <div className="bg-white/60 backdrop-blur-md rounded-xl p-8 border border-white/80 group-hover:border-rose-400 group-hover:bg-white/80 transition-all duration-300 h-full flex flex-col items-center text-center gap-4 hover:shadow-[0_10px_40px_rgba(244,63,94,0.2)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-5 bg-white/80 rounded-full text-zinc-600 group-hover:text-rose-600 group-hover:bg-rose-50 transition-colors shadow-sm">
                <HomeIcon size={40} strokeWidth={1.5} />
              </div>
              <div className="mt-2">
                <h2 className="text-xl font-black uppercase tracking-widest text-zinc-800 group-hover:text-black transition-colors mb-3">Monthly Splitting</h2>
                <p className="text-sm text-zinc-600 font-bold leading-relaxed">หารค่าห้องเช่า ค่าเน็ต หรือ Netflix</p>
              </div>
            </div>
          </Link>

          {/* Module 3 (Future Placeholder) */}
          <div className="md:col-span-2 block group opacity-80 relative pointer-events-none mt-2">
            <div className="bg-white/40 backdrop-blur-md rounded-xl p-6 border border-white/50 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-300"></div>
              <div className="flex flex-col sm:flex-row items-center sm:text-left text-center gap-6 ml-2">
                <div className="p-4 bg-white/50 rounded-full text-zinc-500 shadow-sm">
                  <Plane size={32} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-widest text-zinc-500 mb-2">Custom Trip</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Multi-day travel expense routing.</p>
                </div>
              </div>
              <div className="bg-amber-100/80 text-amber-600 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest border border-amber-300 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                Coming Soon
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-12 p-6 bg-white/60 backdrop-blur-md rounded-xl border border-white/80 shadow-lg">
          <h2 className="text-sm font-black tracking-widest text-indigo-800 mb-4 uppercase">HOW IT WORKS</h2>
          <div className="space-y-3 text-zinc-700 font-bold text-sm sm:text-base">
            <p>1. Select your routing engine (Restaurant for dynamic tax, Monthly for fixed costs).</p>
            <p>2. Input your data manually or use the Vision AI to scan a physical receipt.</p>
            <p>3. Assign items to members and instantly generate a PromptPay QR code or PNG.</p>
          </div>
        </div>
      </div>
      
      <footer className="relative z-10 mt-auto pb-6 text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] drop-shadow-md">
        HarnHub // Operating System 2.0
      </footer>
    </main>
  );
}