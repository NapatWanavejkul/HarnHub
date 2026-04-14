import Link from "next/link";
import { Utensils, Home as HomeIcon, Plane } from "lucide-react";

export default function HarnHubLanding() {
  return (
    <main className="min-h-screen bg-black text-white p-6 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl py-12 md:py-24">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#06b6d4] via-emerald-400 to-[#a855f7] pb-2 drop-shadow-sm">
            HarnHub
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl font-medium tracking-wide">
            The ultimate shared expense routing engine.
          </p>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          
          {/* Module 1 (Restaurant) */}
          <Link href="/restaurant" className="block group">
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 group-hover:border-[#06b6d4] transition-all duration-300 h-full flex flex-col items-center text-center gap-4 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#06b6d4] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-5 bg-zinc-950 rounded-full text-zinc-500 group-hover:text-[#06b6d4] transition-colors">
                <Utensils size={40} strokeWidth={1.5} />
              </div>
              <div className="mt-2">
                <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-200 group-hover:text-white transition-colors mb-3">Restaurant Bill</h2>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">Split complex bills with VAT, SC, and proportional discounts.</p>
              </div>
            </div>
          </Link>
          
          {/* Module 2 (Monthly/Fixed) */}
          <Link href="/monthly" className="block group">
            <div className="bg-zinc-900 rounded-xl p-8 border border-zinc-800 group-hover:border-[#a855f7] transition-all duration-300 h-full flex flex-col items-center text-center gap-4 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#a855f7] opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="p-5 bg-zinc-950 rounded-full text-zinc-500 group-hover:text-[#a855f7] transition-colors">
                <HomeIcon size={40} strokeWidth={1.5} />
              </div>
              <div className="mt-2">
                <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-200 group-hover:text-white transition-colors mb-3">Monthly Splitting</h2>
                <p className="text-sm text-zinc-500 font-medium leading-relaxed">หารค่าห้องเช่า ค่าเน็ต หรือ Netflix</p>
              </div>
            </div>
          </Link>

          {/* Module 3 (Future Placeholder) */}
          <div className="md:col-span-2 block group opacity-50 relative pointer-events-none mt-2">
            <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-800"></div>
              <div className="flex flex-col sm:flex-row items-center sm:text-left text-center gap-6 ml-2">
                <div className="p-4 bg-zinc-950 rounded-full text-zinc-600">
                  <Plane size={32} />
                </div>
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-widest text-zinc-500 mb-2">Custom Trip</h2>
                  <p className="text-xs text-zinc-600 font-bold uppercase tracking-widest">Multi-day travel expense routing.</p>
                </div>
              </div>
              <div className="bg-[#fbbf24]/10 text-[#fbbf24] px-4 py-2 rounded-full font-bold text-[10px] uppercase tracking-widest border border-[#fbbf24]/20 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#fbbf24] animate-pulse"></div>
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="mt-auto pb-6 text-[10px] text-zinc-700 font-bold uppercase tracking-[0.3em]">
        HarnHub // Operating System 2.0
      </footer>
    </main>
  );
}