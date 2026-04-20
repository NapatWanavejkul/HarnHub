"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { calculateTotals } from "@/lib/math/splitEngine";
import { QRCodeSVG } from "qrcode.react";
import promptpayQr from "promptpay-qr";
import { toPng } from "html-to-image";

interface Participant {
  id: string;
  name: string;
}

interface BillItem {
  id: string;
  name: string;
  price: number;
  consumedBy: string[];
}

interface BillData {
  id: string;
  host_promptpay: string;
  service_charge: number;
  vat: number;
  discount?: number;
  participants: Participant[];
  items: BillItem[];
}

export default function BillPage() {
  const params = useParams();
  const printRef = useRef<HTMLDivElement>(null);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBill = async () => {
      try {
        const { data, error } = await supabase
          .from("bills")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) throw error;
        
        // Extract URL discount query param to bypass missing DB schema column
        const searchParams = new URLSearchParams(window.location.search);
        const discountParam = parseFloat(searchParams.get("discount") || "0");
        
        setBillData({ ...data, discount: discountParam });
      } catch (err: any) {
        setError(err.message || "Failed to load bill data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchBill();
    }
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center font-mono text-indigo-400">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-indigo-400 rounded-full animate-spin mb-4"></div>
        <p className="tracking-[0.2em] uppercase text-xs font-bold">Connecting to DB...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="bg-red-950/20 border-2 border-red-500 text-red-500 p-8 rounded-2xl max-w-md w-full shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <h2 className="text-2xl font-black mb-3 uppercase tracking-widest">Error</h2>
          <p className="text-red-400/80">{error}</p>
        </div>
      </div>
    );
  }

  if (!billData) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center font-mono">
        <div className="bg-zinc-900 border-2 border-zinc-800 text-zinc-400 p-8 rounded-2xl max-w-md w-full">
          <h2 className="text-xl font-bold uppercase tracking-widest">Bill Not Found</h2>
          <p className="text-sm mt-2">The specified ID does not exist.</p>
        </div>
      </div>
    );
  }

  const exportAsImage = async () => {
    if (!printRef.current) return;
    try {
      const dataUrl = await toPng(printRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `HarnHub_Split_${billData?.id || "Export"}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
    }
  };

  const subtotal = billData.items.reduce((sum, item) => sum + item.price, 0);
  const splitResults = calculateTotals(billData.items, billData.service_charge, billData.vat, billData.discount || 0);

  return (
    <main className="min-h-screen bg-transparent text-zinc-300 p-2 md:p-6 font-mono selection:bg-indigo-400/30">
      <div className="max-w-2xl mx-auto relative pb-20">
        <div ref={printRef} className="space-y-8 bg-black p-4 sm:p-6 rounded-3xl">
          
          {/* Header */}
        <header className="border-b-2 border-zinc-900 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
            <h1 className="text-3xl font-black text-zinc-100 tracking-tight">HarnHub<span className="text-indigo-400">_</span>Split</h1>
          </div>
          <p className="text-zinc-600 text-xs tracking-widest uppercase break-all">Session_ID: [ {billData.id} ]</p>
        </header>

        {/* Global Summary */}
        <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl relative overflow-hidden shadow-2xl">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
            <span className="w-8 h-px bg-zinc-700"></span> Global Summary
          </h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
              <span className="text-zinc-400">Subtotal</span>
              <span className="text-zinc-100 font-medium">฿{subtotal.toLocaleString()}</span>
            </div>
            {(billData.discount ?? 0) > 0 && (
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 text-red-400">
                <span>Discount</span>
                <span className="font-medium">-฿{billData.discount?.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
              <span className="text-zinc-400">Service Charge</span>
              <span className="text-violet-400 font-bold">{billData.service_charge}%</span>
            </div>
            <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
              <span className="text-zinc-400">VAT</span>
              <span className="text-indigo-400 font-bold">{billData.vat}%</span>
            </div>
            <div className="pt-4 flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-xs tracking-[0.3em] font-black">Gross Total</span>
              <span className="text-5xl font-black text-white dropshadow-sm">
                 ฿{splitResults.reduce((sum, res) => sum + (res.total || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Itemized List */}
        <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
           <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
             <span className="w-8 h-px bg-zinc-700"></span> Receipt Data
           </h2>
           <div className="space-y-6">
             {billData.items.map((item) => (
               <div key={item.id} className="group">
                 <div className="flex justify-between items-start mb-3">
                   <span className="font-bold text-zinc-200 group-hover:text-violet-400 transition-colors uppercase tracking-wide text-sm">{item.name || "Untitled"}</span>
                   <span className="text-indigo-400 font-black bg-indigo-950/30 px-3 py-1 rounded-md text-sm border border-indigo-900/50 shadow-[0_0_10px_rgba(52,211,153,0.05)]">
                     ฿{item.price.toLocaleString()}
                   </span>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {item.consumedBy.map(pId => {
                     const p = billData.participants.find(part => part.id === pId);
                     return (
                       <span key={pId} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-zinc-950 text-violet-400 rounded border border-violet-900/50">
                         {p?.name || "Unknown"}
                       </span>
                     )
                   })}
                 </div>
               </div>
             ))}
           </div>
        </section>

        {/* Participants Breakdown / Owe calculation */}
        <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 mb-6 font-bold flex items-center gap-2">
            <span className="w-8 h-px bg-indigo-700"></span> User Share Manifest
          </h2>
          <div className="space-y-5">
            {splitResults.map((result) => {
              const person = billData.participants.find(p => p.id === result.id);
              return (
                <div key={result.id} className="p-5 bg-black rounded-xl border border-zinc-800 hover:border-violet-900/50 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-xl font-black text-zinc-100 uppercase tracking-widest">{person?.name || "Unknown"}</span>
                    <span className="text-3xl font-black text-indigo-400">
                      ฿{(result.total || 0).toLocaleString()}
                    </span>
                  </div>
                  
                  {/* PromptPay QR Code Component Placeholder */}
                  <div className="pt-6 border-t border-zinc-800 border-dashed flex flex-col items-center">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="h-px w-10 bg-zinc-800"></div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black text-center">PromptPay Transfer</p>
                        <div className="h-px w-10 bg-zinc-800"></div>
                     </div>
                     
                     <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center">
                       {billData.host_promptpay ? (
                         <>
                           <div className="bg-white p-2 rounded-xl mb-3 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
                             <QRCodeSVG
                               value={promptpayQr(billData.host_promptpay, { amount: result.total || 0 })}
                               size={160}
                               bgColor="#ffffff"
                               fgColor="#000000"
                               level="Q"
                             />
                           </div>
                           <span className="text-[10px] font-mono text-indigo-400 tracking-widest bg-violet-950/30 px-3 py-1.5 rounded-full border border-violet-900/50">
                             {billData.host_promptpay}
                           </span>
                         </>
                       ) : (
                         <div className="w-40 h-40 flex items-center justify-center border-2 border-dashed border-red-900/50 rounded-xl">
                           <span className="text-red-500 text-xs font-bold uppercase tracking-widest">No PromptPay</span>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      <footer className="mt-16 text-center">
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">HarnHub // Engineering Module</p>
      </footer>
        </div>

        {/* Floating/Sticky export button (excluded from capture) */}
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50 px-4">
          <button
            onClick={exportAsImage}
            className="pointer-events-auto bg-zinc-800 hover:bg-zinc-700 text-violet-400 font-black uppercase tracking-widest text-[11px] sm:text-xs px-8 py-4 rounded-full border border-violet-900/50 shadow-[0_10px_40px_rgba(34,211,238,0.15)] transition-all transform hover:-translate-y-1 active:translate-y-0"
          >
            Export Receipt Image
          </button>
        </div>
      </div>
    </main>
  );
}