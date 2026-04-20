"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Plus, Trash2, Calculator, Receipt, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import promptpayQr from "promptpay-qr";
import { calculateTotals } from "@/lib/math/splitEngine";
import { supabase } from "@/lib/supabaseClient";

// Use the interface we defined earlier
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

export default function Home() {
  const [restaurantName, setRestaurantName] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [serviceCharge, setServiceCharge] = useState<number>(10);
  const [vat, setVat] = useState<number>(7);
  const [hostPromptPay, setHostPromptPay] = useState<string>("");
  const [activeQR, setActiveQR] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [includeServiceCharge, setIncludeServiceCharge] = useState<boolean>(false);
  const [includeVat, setIncludeVat] = useState<boolean>(false);
  const [discount, setDiscount] = useState<number>(0);
  const [targetTotal, setTargetTotal] = useState<number | "">("");
  const [stagedItems, setStagedItems] = useState<Array<{name: string, price: number}> | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const downloadReceipt = async () => {
    if (!billRef.current) return;
    try {
      const dataUrl = await toPng(billRef.current, { cacheBust: true, backgroundColor: '#000000' });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'harnhub-receipt.png';
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
    }
  };

  const addItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      price: 0,
      consumedBy: [],
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const addParticipant = () => {
    const newParticipant: Participant = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
    };
    setParticipants([...participants, newParticipant]);
  };

  const updateParticipant = (id: string, name: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, name } : p));
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const toggleConsumedBy = (itemId: string, participantId: string) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const consumedBy = item.consumedBy || [];
        if (consumedBy.includes(participantId)) {
          return { ...item, consumedBy: consumedBy.filter(id => id !== participantId) };
        } else {
          return { ...item, consumedBy: [...consumedBy, participantId] };
        }
      }
      return item;
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG at 70% quality to bypass Vercel 4.5MB Payload limit
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          try {
            const response = await fetch('/api/scan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: compressedBase64 })
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`[Vercel Server Error: ${response.status}] ${errorText}`);
            }

            const data = await response.json();
            const extractedItems = data.items || [];

            if (extractedItems.length === 0) {
              alert("Couldn't find any valid items in this receipt.");
            } else {
              const parsedData = extractedItems.map((item: any) => ({
                name: item.name,
                price: Number(item.price)
              }));

              setStagedItems(parsedData);
            }
          } catch (apiError: any) {
            console.error("Vision AI Error:", apiError);
            alert(`Failed to analyze image from backend. Detailed Error: ${apiError.message}`);
          } finally {
            setIsAnalyzing(false);
            e.target.value = '';
          }
        };
      };

      reader.onerror = (err) => {
        console.error("FileReader Error:", err);
        alert("Failed to read image file.");
        setIsAnalyzing(false);
        e.target.value = '';
      };

    } catch (err) {
      console.error("Upload Error:", err);
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  const saveBillToDatabase = async () => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from("bills")
        .insert([
          {
            host_promptpay: hostPromptPay,
            service_charge: serviceCharge,
            vat: vat,
            participants: participants,
            items: items,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase Error:", error?.message || error);
        alert("Failed to save bill: " + (error?.message || "Unknown error"));
        setIsSaving(false);
        return;
      }

      if (data && data.id) {
        setShareLink(`${window.location.origin}/bill/${data.id}?discount=${discount}`);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeSC = includeServiceCharge ? serviceCharge : 0;
  const activeVat = includeVat ? vat : 0;

  return (
    <main className="min-h-screen text-slate-900 p-6 font-sans bg-transparent">
      {/* 3. SESSION LOG: 
          - Question: How to fix lucide-react error? 
          - Answer: Ran npm install lucide-react.
          - Question: How to make 'Add Item' work?
          - Answer: Implemented useState array for items with a dynamic mapping function.
      */}

      <header className="mb-10 max-w-2xl mx-auto">
        <h1 className="text-4xl font-black tracking-tighter text-[indigo-400]">
          HarnHub <span className="text-zinc-600 text-sm font-normal">หารฮับ</span>
        </h1>
        <p className="text-zinc-500">Smart Split Prototype | Phase 1</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors mb-6 font-medium w-fit">
          <span>&larr;</span>
          <span>Back to Hub</span>
        </Link>
        
        {/* Restaurant Info Card */}
        <div className="relative bg-white border border-violet-400 rounded-3xl p-6">
          <input
            type="text"
            placeholder="Where are you eating?"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full bg-white border border-violet-400 rounded-xl p-4 text-xl font-bold outline-none focus:border-violet-400 transition-all"
          />
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-violet-400"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-violet-400"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-violet-400"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-violet-400"></div>
        </div>

        {/* Table Members */}
        <div className="relative bg-white border border-violet-400 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-violet-400">
              <Users size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Table Members</h2>
            </div>
            <span className="text-xs text-violet-400">{participants.length} members</span>
          </div>

          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex space-x-2 animate-in fade-in slide-in-from-top-1">
                <input
                  type="text"
                  placeholder="Friend's name"
                  value={participant.name}
                  onChange={(e) => updateParticipant(participant.id, e.target.value)}
                  className="flex-1 bg-white border border-violet-400 rounded-xl p-3 text-sm outline-none focus:border-violet-400"
                />
                <button
                  onClick={() => removeParticipant(participant.id)}
                  className="p-3 text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button
              onClick={addParticipant}
              className="w-full py-4 border-2 border-dashed border-violet-400 rounded-2xl text-violet-400 hover:border-violet-400 hover:text-violet-400 hover:bg-violet-400/5 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Friend</span>
            </button>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-violet-400"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-violet-400"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-violet-400"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-violet-400"></div>
        </div>

        {stagedItems !== null ? (
          <div className="bg-zinc-900 border border-indigo-400 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center space-x-2 text-indigo-400 mb-6">
              <Receipt size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Audit Receipt</h2>
            </div>
            
            <div className="space-y-3 mb-6">
              {stagedItems.map((item, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const newStaged = [...stagedItems];
                      newStaged[index] = { ...newStaged[index], name: e.target.value };
                      setStagedItems(newStaged);
                    }}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 text-white"
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={(e) => {
                      const newStaged = [...stagedItems];
                      newStaged[index] = { ...newStaged[index], price: parseFloat(e.target.value) || 0 };
                      setStagedItems(newStaged);
                    }}
                    className="w-24 bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm outline-none focus:border-indigo-400 text-white"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const newItems: BillItem[] = stagedItems.map((item) => ({
                  id: Math.random().toString(36).substr(2, 9),
                  name: item.name,
                  price: item.price,
                  consumedBy: []
                }));
                setItems((prev) => [...prev, ...newItems]);
                setStagedItems(null);
              }}
              className="w-full bg-indigo-500 text-white font-bold uppercase tracking-widest text-sm py-4 rounded-xl hover:bg-green-500 transition-colors"
            >
              Confirm & Add to Bill
            </button>
          </div>
        ) : (
          <>
        {/* Items List */}
        <div className="relative bg-white border border-violet-400 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-violet-400">
              <Receipt size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Bill Items</h2>
            </div>
            <span className="text-xs text-violet-400">{items.length} items added</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const itemSc = item.price * (activeSC / 100);
              const itemVat = (item.price + itemSc) * (activeVat / 100);
              const finalNetPrice = item.price + itemSc + itemVat;

              return (
              <div key={item.id} className="animate-in fade-in slide-in-from-top-1">
                <div className="flex space-x-2 mb-2 items-start">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-1 bg-white border border-violet-400 rounded-xl p-3 text-sm outline-none focus:border-violet-400"
                  />
                  <div className="flex flex-col w-28 shrink-0">
                    <input
                      type="number"
                      placeholder="Price"
                      value={item.price || ""}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-violet-400 rounded-xl p-3 text-sm outline-none focus:border-violet-400"
                    />
                    {item.price > 0 && (
                      <span className="text-[10px] font-bold text-[indigo-400] text-right mt-1 pr-1 tracking-widest uppercase">
                        Net ฿{finalNetPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-3 text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {participants.map((participant) => {
                    const isConsumed = item.consumedBy?.includes(participant.id) || false;
                    return (
                      <button
                        key={participant.id}
                        onClick={() => toggleConsumedBy(item.id, participant.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isConsumed
                            ? 'bg-violet-400 text-white'
                            : 'bg-transparent border border-violet-400 text-violet-400'
                          }`}
                      >
                        {participant.name || 'Unnamed'}
                      </button>
                    );
                  })}
                </div>
              </div>
              );
            })}

            <label className="block w-full cursor-pointer mb-3">
              <input
                type="file"
                accept="image/jpeg, image/png, image/webp"
                onChange={handleImageUpload}
                disabled={isAnalyzing}
                className="hidden"
              />
              <div className={`w-full py-4 rounded-2xl transition-all flex items-center justify-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-bold uppercase tracking-widest text-xs shadow-lg border border-cyan-900/30 ${isAnalyzing ? 'opacity-70 cursor-not-allowed animate-pulse' : ''}`}>
                <span>{isAnalyzing ? "Analyzing Image..." : "Scan Receipt (BETA)"}</span>
              </div>
            </label>
            <p className="text-xs text-zinc-500 text-center mt-2 mb-3">AI extracts item names and base prices automatically.</p>

            <button
              onClick={addItem}
              className="w-full py-4 border-2 border-dashed border-violet-400 rounded-2xl text-violet-400 hover:border-violet-400 hover:text-violet-400 hover:bg-violet-400/5 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-violet-400"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-violet-400"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-violet-400"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-violet-400"></div>
        </div>

        {/* HOST SETTINGS */}
        {items.length > 0 && (
          <div className="bg-white border border-violet-400 rounded-3xl p-6 mb-4">
            <h2 className="font-bold uppercase tracking-widest text-sm text-violet-400 mb-4">HOST SETTINGS</h2>
            <label className="flex flex-col text-violet-900 text-sm gap-2">
              <span>Host PromptPay Number (Phone/ID)</span>
              <input
                type="text"
                value={hostPromptPay}
                onChange={(e) => setHostPromptPay(e.target.value)}
                placeholder="Enter PromptPay number"
                className="bg-white border border-violet-400 rounded-xl p-3 text-sm text-black outline-none focus:border-violet-400"
              />
            </label>
          </div>
        )}

        {/* TAX & SERVICE SETTINGS */}
        {items.length > 0 && (
          <div className="bg-white border border-violet-400 rounded-3xl p-6 mb-4">
            <h2 className="font-bold uppercase tracking-widest text-sm text-violet-400 mb-4">DISCOUNT & TAXES</h2>
            <div className="mb-6">
              <label className="flex flex-col text-violet-900 text-sm gap-2">
                <span className="font-medium">Total Discount (฿)</span>
                <input
                  type="number"
                  value={discount > 0 ? discount : ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="bg-white border border-violet-400 rounded-xl p-3 text-sm text-black outline-none focus:border-violet-400 w-full sm:w-1/2"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-violet-900 text-sm gap-2">
                <div className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeServiceCharge} 
                    onChange={(e) => setIncludeServiceCharge(e.target.checked)} 
                    className="w-4 h-4 text-violet-400 rounded border-violet-400 focus:ring-violet-400"
                  />
                  <span className="font-medium">Service Charge (%)</span>
                </div>
                {includeServiceCharge && (
                  <input
                    type="number"
                    value={serviceCharge}
                    onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                    className="bg-white border border-violet-400 rounded-xl p-3 text-sm text-black outline-none focus:border-violet-400 animate-in fade-in slide-in-from-top-2"
                  />
                )}
              </label>
              <label className="flex flex-col text-violet-900 text-sm gap-2">
                <div className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={includeVat} 
                    onChange={(e) => setIncludeVat(e.target.checked)} 
                    className="w-4 h-4 text-violet-400 rounded border-violet-400 focus:ring-violet-400"
                  />
                  <span className="font-medium">VAT (%)</span>
                </div>
                {includeVat && (
                  <input
                    type="number"
                    value={vat}
                    onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
                    className="bg-white border border-violet-400 rounded-xl p-3 text-sm text-black outline-none focus:border-violet-400 animate-in fade-in slide-in-from-top-2"
                  />
                )}
              </label>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Calculates proportionally across all shared items.</p>
          </div>
        )}

        {/* Calculation Summary Preview */}
        {items.length > 0 && (() => {
          const subtotal = items.reduce((acc, curr) => acc + curr.price, 0);
          const subtotalAfterDiscount = Math.max(0, subtotal - discount);
          const totalSc = subtotalAfterDiscount * (activeSC / 100);
          const totalVat = (subtotalAfterDiscount + totalSc) * (activeVat / 100);
          const netTotal = subtotalAfterDiscount + totalSc + totalVat;
          const diff = targetTotal === "" ? 0 : Math.abs(netTotal - Number(targetTotal));

          return (
            <div className="bg-[indigo-400] rounded-3xl p-6 text-black">
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs font-bold uppercase opacity-60">Subtotal</p>
                    <p className="text-2xl font-black">
                      ฿{subtotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase opacity-60 drop-shadow-md">Net Total</p>
                    <p className="text-4xl font-black drop-shadow-md">
                      ฿{netTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>
                </div>
                <div className="bg-black/10 p-3 rounded-2xl hidden sm:block">
                  <Calculator size={32} />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="rounded-2xl border border-violet-400 bg-white/70 p-3 text-violet-900">
                  <p className="font-semibold uppercase tracking-widest">Service Charge</p>
                  <p>{activeSC}%</p>
                </div>
                <div className="rounded-2xl border border-violet-400 bg-white/70 p-3 text-violet-900">
                  <p className="font-semibold uppercase tracking-widest">VAT</p>
                  <p>{activeVat}%</p>
                </div>
              </div>

              <hr className="border-black/20 my-4" />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <label className="flex items-center gap-3">
                  <span className="text-sm font-bold uppercase tracking-widest opacity-80">Receipt Total (Checksum)</span>
                  <input
                    type="number"
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-white/50 border border-black/10 rounded-xl p-2 text-sm text-black outline-none focus:bg-white w-24 sm:w-32 transition-colors"
                  />
                </label>
                {targetTotal !== "" && (
                  <div className={`px-4 py-2 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-sm transition-all ${diff < 1 ? "bg-[#10b981] text-white" : "bg-[#ef4444] text-white animate-pulse"}`}>
                    {diff < 1 ? "✅ MATCH: SPLIT IS SAFE" : `❌ MISMATCH: Check toggles (Off by ฿${diff.toFixed(2)})`}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Final Split */}
        {items.length > 0 && (() => {
          const splitResults = calculateTotals(items, activeSC, activeVat, discount);
          return (
            <div className="bg-white border border-violet-400 rounded-3xl p-6">
              <h2 className="font-bold uppercase tracking-widest text-sm text-violet-400 mb-4">Final Split</h2>
              <div className="space-y-2">
                {splitResults.map((result) => {
                  const person = participants.find(p => p.id === result.id);
                  const isActive = activeQR === result.id;
                  return (
                    <div key={result.id} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-violet-900 font-medium">{person?.name || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-black font-bold">฿{(result.total || 0).toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => setActiveQR(result.id)}
                            className="rounded-full border border-violet-400 px-3 py-1 text-xs uppercase tracking-widest text-violet-400 transition hover:bg-violet-400/10"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                      {isActive && hostPromptPay && (
                        <div className="rounded-3xl border border-violet-400 p-4 inline-block bg-white/95">
                          <QRCodeSVG
                            value={promptpayQr(hostPromptPay, { amount: result.total || 0 })}
                            size={156}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* SYSTEM EXPORT */}
        <div className="bg-white border border-violet-400 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-violet-400 mb-4">SYSTEM EXPORT</h2>
          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <button
              onClick={saveBillToDatabase}
              disabled={isSaving}
              className={`w-full rounded-lg px-4 py-3 font-bold uppercase tracking-widest text-sm transition-all ${isSaving
                  ? "bg-indigo-500 text-white/70 cursor-not-allowed"
                  : "bg-violet-400 text-white hover:bg-violet-600"
                }`}
            >
              {isSaving ? "Generating..." : "Generate Shareable Link"}
            </button>
            <button
              onClick={downloadReceipt}
              className="w-full bg-indigo-500 text-white font-bold py-3 rounded-lg hover:bg-green-500 transition-colors uppercase tracking-widest text-sm"
            >
              Download Receipt PNG
            </button>
          </div>
          {shareLink && (
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-violet-900 mb-2">
                Share Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-violet-50 border border-violet-400 rounded-xl p-3 font-mono text-sm text-black outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-violet-400 px-3 py-1 text-xs font-bold text-white hover:bg-violet-600"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <footer className="fixed bottom-6 left-6 text-[10px] text-violet-900 uppercase tracking-widest">
        MUIC | ID 6680024 | Kou
      </footer>

      {/* HIDDEN RECEIPT DOM FOR PNG EXPORT */}
      <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none opacity-0">
        <div ref={billRef} className="w-[500px] space-y-8 bg-black p-6 font-mono text-zinc-300">
          <header className="border-b-2 border-zinc-900 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
              <h1 className="text-3xl font-black text-zinc-100 tracking-tight">HarnHub<span className="text-indigo-400">_</span>Split</h1>
            </div>
            <p className="text-zinc-600 text-xs tracking-widest uppercase break-all">Session_ID: [ LOCAL_SNAPSHOT ]</p>
          </header>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
              <span className="w-8 h-px bg-zinc-700"></span> Global Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-zinc-100 font-medium">฿{items.reduce((sum, item) => sum + item.price, 0).toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 text-red-400">
                  <span>Discount</span>
                  <span className="font-medium">-฿{discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                <span className="text-zinc-400">Service Charge</span>
                <span className="text-cyan-400 font-bold">{activeSC}%</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
                <span className="text-zinc-400">VAT</span>
                <span className="text-emerald-400 font-bold">{activeVat}%</span>
              </div>
              <div className="pt-4 flex justify-between items-center">
                <span className="text-zinc-500 uppercase text-xs tracking-[0.3em] font-black">Gross Total</span>
                <span className="text-5xl font-black text-white dropshadow-sm">
                   ฿{calculateTotals(items, activeSC, activeVat, discount).reduce((sum, res) => sum + (res.total || 0), 0).toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
             <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
               <span className="w-8 h-px bg-zinc-700"></span> Receipt Data
             </h2>
             <div className="space-y-6">
               {items.map((item) => (
                 <div key={item.id} className="group">
                   <div className="flex justify-between items-start mb-3">
                     <span className="font-bold text-zinc-200 uppercase tracking-wide text-sm">{item.name || "Untitled"}</span>
                     <span className="text-emerald-400 font-black bg-emerald-950/30 px-3 py-1 rounded-md text-sm border border-emerald-900/50">
                       ฿{item.price.toLocaleString()}
                     </span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     {item.consumedBy.map(pId => {
                       const p = participants.find(part => part.id === pId);
                       return (
                         <span key={pId} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-zinc-950 text-cyan-400 rounded border border-cyan-900/50">
                           {p?.name || "Unknown"}
                         </span>
                       )
                     })}
                   </div>
                 </div>
               ))}
             </div>
          </section>

          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 mb-6 font-bold flex items-center gap-2">
              <span className="w-8 h-px bg-cyan-700"></span> User Share Manifest
            </h2>
            <div className="space-y-5">
              {calculateTotals(items, activeSC, activeVat, discount).map((result) => {
                const person = participants.find(p => p.id === result.id);
                return (
                  <div key={result.id} className="p-5 bg-black rounded-xl border border-zinc-800">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xl font-black text-zinc-100 uppercase tracking-widest">{person?.name || "Unknown"}</span>
                      <span className="text-3xl font-black text-emerald-400">
                        ฿{(result.total || 0).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="pt-6 border-t border-zinc-800 border-dashed flex flex-col items-center">
                       <div className="flex items-center gap-3 mb-4">
                          <div className="h-px w-10 bg-zinc-800"></div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black text-center">PromptPay Transfer</p>
                          <div className="h-px w-10 bg-zinc-800"></div>
                       </div>
                       
                       <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 flex flex-col items-center">
                         {hostPromptPay ? (
                           <>
                             <div className="bg-white p-2 rounded-xl mb-3">
                               <QRCodeSVG
                                 value={promptpayQr(hostPromptPay, { amount: result.total || 0 })}
                                 size={160}
                                 bgColor="#ffffff"
                                 fgColor="#000000"
                                 level="Q"
                               />
                             </div>
                             <span className="text-[10px] font-mono text-cyan-500 tracking-widest bg-cyan-950/30 px-3 py-1.5 rounded-full border border-cyan-900/50">
                               {hostPromptPay}
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
      </div>
    </main>
  );
}