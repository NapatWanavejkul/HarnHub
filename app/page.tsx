"use client";

import { useState } from "react";
import { Plus, Trash2, Calculator, Receipt, Users } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
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
        setShareLink(`${window.location.origin}/bill/${data.id}`);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 p-6 font-sans">
      {/* 3. SESSION LOG: 
          - Question: How to fix lucide-react error? 
          - Answer: Ran npm install lucide-react.
          - Question: How to make 'Add Item' work?
          - Answer: Implemented useState array for items with a dynamic mapping function.
      */}

      <header className="mb-10 max-w-2xl mx-auto">
        <h1 className="text-4xl font-black tracking-tighter text-[#06b6d4]">
          HarnHub <span className="text-zinc-600 text-sm font-normal">หารฮับ</span>
        </h1>
        <p className="text-zinc-500">Smart Split Prototype | Phase 1</p>
      </header>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Restaurant Info Card */}
        <div className="relative bg-white border border-blue-600 rounded-3xl p-6">
          <input 
            type="text" 
            placeholder="Where are you eating?" 
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full bg-white border border-blue-600 rounded-xl p-4 text-xl font-bold outline-none focus:border-blue-600 transition-all"
          />
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-600"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-600"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-600"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-600"></div>
        </div>

        {/* Table Members */}
        <div className="relative bg-white border border-blue-600 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-blue-600">
              <Users size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Table Members</h2>
            </div>
            <span className="text-xs text-blue-600">{participants.length} members</span>
          </div>

          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex space-x-2 animate-in fade-in slide-in-from-top-1">
                <input 
                  type="text" 
                  placeholder="Friend's name"
                  value={participant.name}
                  onChange={(e) => updateParticipant(participant.id, e.target.value)}
                  className="flex-1 bg-white border border-blue-600 rounded-xl p-3 text-sm outline-none focus:border-blue-600"
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
              className="w-full py-4 border-2 border-dashed border-blue-600 rounded-2xl text-blue-600 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-600/5 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Friend</span>
            </button>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-600"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-600"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-600"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-600"></div>
        </div>

        {/* Items List */}
        <div className="relative bg-white border border-blue-600 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-blue-600">
              <Receipt size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Bill Items</h2>
            </div>
            <span className="text-xs text-blue-600">{items.length} items added</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="animate-in fade-in slide-in-from-top-1">
                <div className="flex space-x-2 mb-2">
                  <input 
                    type="text" 
                    placeholder="Item name"
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    className="flex-1 bg-white border border-blue-600 rounded-xl p-3 text-sm outline-none focus:border-blue-600"
                  />
                  <input 
                    type="number" 
                    placeholder="Price"
                    value={item.price || ""}
                    onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                    className="w-24 bg-white border border-blue-600 rounded-xl p-3 text-sm outline-none focus:border-blue-600"
                  />
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
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          isConsumed
                            ? 'bg-blue-600 text-white'
                            : 'bg-transparent border border-blue-600 text-blue-600'
                        }`}
                      >
                        {participant.name || 'Unnamed'}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button 
              onClick={addItem}
              className="w-full py-4 border-2 border-dashed border-blue-600 rounded-2xl text-blue-600 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-600/5 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
          <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-blue-600"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-r-2 border-t-2 border-blue-600"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-l-2 border-b-2 border-blue-600"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-blue-600"></div>
        </div>

        {/* HOST SETTINGS */}
        {items.length > 0 && (
          <div className="bg-white border border-blue-600 rounded-3xl p-6 mb-4">
            <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">HOST SETTINGS</h2>
            <label className="flex flex-col text-blue-900 text-sm gap-2">
              <span>Host PromptPay Number (Phone/ID)</span>
              <input
                type="text"
                value={hostPromptPay}
                onChange={(e) => setHostPromptPay(e.target.value)}
                placeholder="Enter PromptPay number"
                className="bg-white border border-blue-600 rounded-xl p-3 text-sm text-black outline-none focus:border-blue-600"
              />
            </label>
          </div>
        )}

        {/* TAX & SERVICE SETTINGS */}
        {items.length > 0 && (
          <div className="bg-white border border-blue-600 rounded-3xl p-6 mb-4">
            <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">TAX & SERVICE SETTINGS</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-blue-900 text-sm gap-2">
                <span>Service Charge (%)</span>
                <input
                  type="number"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                  className="bg-white border border-blue-600 rounded-xl p-3 text-sm text-black outline-none focus:border-blue-600"
                />
              </label>
              <label className="flex flex-col text-blue-900 text-sm gap-2">
                <span>VAT (%)</span>
                <input
                  type="number"
                  value={vat}
                  onChange={(e) => setVat(parseFloat(e.target.value) || 0)}
                  className="bg-white border border-blue-600 rounded-xl p-3 text-sm text-black outline-none focus:border-blue-600"
                />
              </label>
            </div>
          </div>
        )}

        {/* Calculation Summary Preview */}
        {items.length > 0 && (
          <div className="bg-[#06b6d4] rounded-3xl p-6 text-black">
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-xs font-bold uppercase opacity-60">Subtotal</p>
                <p className="text-3xl font-black">
                  ฿{items.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-black/10 p-3 rounded-2xl">
                <Calculator size={32} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="rounded-2xl border border-blue-600 bg-white/70 p-3 text-blue-900">
                <p className="font-semibold uppercase tracking-widest">Service Charge</p>
                <p>{serviceCharge}%</p>
              </div>
              <div className="rounded-2xl border border-blue-600 bg-white/70 p-3 text-blue-900">
                <p className="font-semibold uppercase tracking-widest">VAT</p>
                <p>{vat}%</p>
              </div>
            </div>
          </div>
        )}

        {/* Final Split */}
        {items.length > 0 && (() => {
          const splitResults = calculateTotals(items, serviceCharge, vat);
          return (
            <div className="bg-white border border-blue-600 rounded-3xl p-6">
              <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">Final Split</h2>
              <div className="space-y-2">
                {splitResults.map((result) => {
                  const person = participants.find(p => p.id === result.id);
                  const isActive = activeQR === result.id;
                  return (
                    <div key={result.id} className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-blue-900 font-medium">{person?.name || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-black font-bold">฿{(result.total || 0).toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => setActiveQR(result.id)}
                            className="rounded-full border border-blue-600 px-3 py-1 text-xs uppercase tracking-widest text-blue-600 transition hover:bg-blue-600/10"
                          >
                            Pay
                          </button>
                        </div>
                      </div>
                      {isActive && hostPromptPay && (
                        <div className="rounded-3xl border border-blue-600 p-4 inline-block bg-white/95">
                          <QRCodeCanvas
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
        <div className="bg-white border border-blue-600 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">SYSTEM EXPORT</h2>
          <button
            onClick={saveBillToDatabase}
            disabled={isSaving}
            className={`w-full rounded-xl px-4 py-3 font-bold uppercase tracking-widest text-sm transition-all ${
              isSaving
                ? "bg-blue-400 text-white/70 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isSaving ? "Generating..." : "Generate Shareable Link"}
          </button>
          {shareLink && (
            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-widest text-blue-900 mb-2">
                Share Link
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                  className="w-full bg-blue-50 border border-blue-600 rounded-xl p-3 font-mono text-sm text-black outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="fixed bottom-6 left-6 text-[10px] text-blue-900 uppercase tracking-widest">
        MUIC | ID 6680024 | Kou
      </footer>
    </main>
  );
}