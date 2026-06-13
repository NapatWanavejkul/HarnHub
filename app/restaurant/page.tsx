"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Trash2, Calculator, Receipt, Users } from "lucide-react";
import { toPng } from "html-to-image";
import { QRCodeSVG } from "qrcode.react";
import promptpayQr from "promptpay-qr";
import { calculateTotals } from "@/lib/math/splitEngine";
import { createClient } from "@/utils/supabase/client";

// Use the interface we defined earlier
interface Participant {
  id: string;
  name: string;
}

interface SavedFriend {
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
  const supabase = createClient();
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
  const [savedFriends, setSavedFriends] = useState<SavedFriend[]>([]);
  const billRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function initFriends() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Auth session fetch error:", error);
          return;
        }
        const user = data?.session?.user;
        if (user && active) {
          const { data: friendsData, error: friendsError } = await supabase.from('friends')
            .select('id, name')
            .eq('user_id', user.id)
            .limit(10);
          if (friendsError) {
            console.warn("Supabase Fetch Friends Error:", friendsError);
          } else if (friendsData && active) {
            setSavedFriends(friendsData);
          }
        }
      } catch (err) {
        console.warn("Auth getSession error in restaurant page:", err);
      }
    }
    initFriends();
    return () => {
      active = false;
    };
  }, [supabase]);

  const addQuickFriend = (name: string) => {
    if (!participants.some(p => p.name.trim().toLowerCase() === name.trim().toLowerCase())) {
      setParticipants([...participants, { id: Math.random().toString(36).substr(2, 9), name }]);
    }
  };

  const deleteSavedFriend = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedFriends(savedFriends.filter(f => f.id !== id));
    await supabase.from('friends').delete().eq('id', id);
  };

  const downloadReceipt = async () => {
    if (!billRef.current) return;
    
    // Silently log this into User History if generating a PNG
    if (!shareLink) {
      saveBillToDatabase();
    }

    try {
      const dataUrl = await toPng(billRef.current, { cacheBust: true, pixelRatio: 2 });
      
      // Attempt Web Share API first for direct iOS Save/Share Sheet
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], 'harnhub-receipt.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'HarnHub Split Receipt',
            text: 'Here is our bill split summary!',
          });
          return;
        }
      } catch (shareErr) {
        console.log("Web Share failed or cancelled:", shareErr);
      }
      
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
        const img = new window.Image();
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
    if (shareLink) return; // Prevent duplicate saves for the same session
    try {
      setIsSaving(true);
      const { data, error: authError } = await supabase.auth.getSession();
      if (authError) throw authError;
      const user = data?.session?.user;

      if (user) {
        // Extract names to save
        const uniqueNames = Array.from(new Set(participants.map(p => p.name.trim()).filter(n => n !== "")));
        const newFriendsToSave = uniqueNames.filter(
          name => !savedFriends.some(sf => sf.name.trim().toLowerCase() === name.toLowerCase())
        );

        if (newFriendsToSave.length > 0) {
          const insertPayload = newFriendsToSave.map(name => ({
            user_id: user.id,
            name: name
          }));
          
          const { error: insertError } = await supabase.from('friends').insert(insertPayload);
          if (insertError) console.warn("Supabase Insert Friends Error:", insertError);
          
          // Refetch to sync IDs
          const { data: updatedFriends, error: fetchError } = await supabase.from('friends')
            .select('id, name')
            .eq('user_id', user.id)
            .limit(10);
            
          if (fetchError) console.warn("Supabase Refetch Friends Error:", fetchError);
          if (updatedFriends) setSavedFriends(updatedFriends);
        }
      }

      const { data: insertData, error } = await supabase
        .from("bills")
        .insert([
          {
            host_promptpay: hostPromptPay,
            service_charge: serviceCharge,
            vat: vat,
            participants: participants,
            items: items,
            ...(user ? { user_id: user.id } : {})
          },
        ])
        .select()
        .single();

      if (error) {
        console.warn("Supabase Error:", error?.message || error);
        alert("Failed to save bill: " + (error?.message || "Unknown error"));
        setIsSaving(false);
        return;
      }

      if (insertData && insertData.id) {
        setShareLink(`${window.location.origin}/bill/${insertData.id}?discount=${discount}`);
      }
    } catch (err) {
      console.warn("Unexpected error:", err);
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
        <div className="mb-2 w-full max-w-[300px]">
          <Image 
            src="/bannerlogo.png" 
            alt="HarnHub" 
            width={600} 
            height={150} 
            priority
            className="w-full h-auto drop-shadow-sm"
          />
        </div>
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

            {savedFriends.length > 0 && (
              <div className="pt-4 mt-4 border-t border-violet-100 flex flex-wrap gap-2 animate-in fade-in">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 w-full mb-1">Quick Add Recent</span>
                {savedFriends.map((friend) => (
                  <div 
                    key={friend.id} 
                    className="flex items-center gap-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 font-bold px-3 py-1.5 rounded-full text-xs cursor-pointer transition-all shadow-sm hover:shadow-md"
                    onClick={() => addQuickFriend(friend.name)}
                  >
                    <Plus size={12} className="opacity-50" />
                    <span>{friend.name}</span>
                    <div 
                      className="ml-1 p-0.5 rounded-full hover:bg-red-100 hover:text-red-500 text-violet-300 transition-colors"
                      onClick={(e) => deleteSavedFriend(friend.id, e)}
                    >
                      <Trash2 size={12} />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                          <span className="text-black font-bold">฿{(result.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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
        <div ref={billRef} className="w-[600px] p-8 font-sans text-slate-900 relative rounded-3xl overflow-hidden bg-zinc-50">
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/bg-ark.png"
              alt="Global Background"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
          </div>
          
          <div className="relative z-10 flex flex-col gap-6">
            <header className="border-b border-violet-300 pb-6 text-center">
              <h1 className="text-4xl font-black tracking-tighter text-indigo-900 mb-2">
                HarnHub <span className="text-violet-600 text-sm font-normal">หารฮับ</span>
              </h1>
              <p className="text-violet-700 text-[10px] tracking-widest uppercase font-black opacity-70">Shareable Summary</p>
            </header>

            {/* Global Summary block */}
            <section className="bg-white/90 border border-violet-300 p-6 rounded-3xl shadow-xl">
              <h2 className="text-[10px] uppercase tracking-widest text-violet-500 mb-5 font-black flex items-center justify-between">
                <span>Global Summary</span>
                <Calculator size={14} />
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-violet-100 pb-2">
                  <span className="text-zinc-600 font-bold">Subtotal</span>
                  <span className="text-slate-900 font-black">฿{items.reduce((sum, item) => sum + item.price, 0).toLocaleString()}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between items-center border-b border-violet-100 pb-2 text-rose-500">
                    <span className="font-bold">Discount</span>
                    <span className="font-black">-฿{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-b border-violet-100 pb-2">
                  <span className="text-zinc-600 font-bold">Service Charge</span>
                  <span className="text-indigo-600 font-black">{activeSC}%</span>
                </div>
                <div className="flex justify-between items-center border-b border-violet-100 pb-2">
                  <span className="text-zinc-600 font-bold">VAT</span>
                  <span className="text-emerald-600 font-black">{activeVat}%</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-violet-500 uppercase text-xs tracking-widest font-black">Total</span>
                  <span className="text-4xl font-black text-indigo-900">
                     ฿{(() => {
                        const sub = items.reduce((s, i) => s + i.price, 0);
                        const subAfterDisc = Math.max(0, sub - discount);
                        const sc = subAfterDisc * (activeSC / 100);
                        const vat = (subAfterDisc + sc) * (activeVat / 100);
                        return (subAfterDisc + sc + vat).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
                     })()}
                  </span>
                </div>
              </div>
            </section>

            {/* Receipt Data block */}
            <section className="bg-white/90 border border-violet-300 p-6 rounded-3xl shadow-xl">
               <h2 className="text-[10px] uppercase tracking-widest text-violet-500 mb-5 font-black flex items-center justify-between">
                 <span>Items</span>
                 <Receipt size={14} />
               </h2>
               <div className="space-y-6">
                 {items.map((item) => (
                   <div key={item.id} className="group">
                     <div className="flex justify-between items-start mb-3">
                       <span className="font-bold text-slate-800 tracking-wide text-sm">{item.name || "Untitled"}</span>
                       <span className="text-indigo-700 font-black bg-indigo-50 px-3 py-1 rounded-md text-sm border border-indigo-200">
                         ฿{item.price.toLocaleString()}
                       </span>
                     </div>
                     <div className="flex flex-wrap gap-2">
                       {item.consumedBy.map(pId => {
                         const p = participants.find(part => part.id === pId);
                         return (
                           <span key={pId} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-white text-violet-600 rounded-full border border-violet-200 shadow-sm">
                             {p?.name || "Unknown"}
                           </span>
                         )
                       })}
                     </div>
                   </div>
                 ))}
               </div>
            </section>

            {/* User Share Manifest Block */}
            <section className="bg-white/90 border border-violet-300 p-6 rounded-3xl shadow-xl">
               <h2 className="text-[10px] uppercase tracking-widest text-violet-500 mb-5 font-black flex items-center justify-between">
                 <span>Final Splits</span>
                 <Users size={14} />
               </h2>
               <div className={calculateTotals(items, activeSC, activeVat, discount).length === 1 ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-4"}>
                 {calculateTotals(items, activeSC, activeVat, discount).map((result) => {
                   const person = participants.find(p => p.id === result.id);
                   return (
                     <div key={result.id} className="p-4 bg-white rounded-2xl border border-violet-200 shadow-sm flex items-center justify-between gap-3 h-[132px]">
                       <div className="flex flex-col justify-between h-full flex-1 min-w-0">
                         <div className="space-y-0.5">
                           <span className="text-xs font-black text-slate-800 uppercase tracking-widest block truncate" title={person?.name}>
                             {person?.name || "Unknown"}
                           </span>
                           <span className="text-lg font-black text-indigo-700 block whitespace-nowrap">
                             ฿{(result.total || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                           </span>
                         </div>
                         {hostPromptPay ? (
                           <div className="mt-1">
                             <span className="text-[8px] font-black uppercase tracking-wider text-violet-500 block">PromptPay</span>
                             <span className="text-[9px] font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded border border-violet-100 inline-block truncate max-w-full">
                               {hostPromptPay}
                             </span>
                           </div>
                         ) : (
                           <span className="text-[8px] font-black uppercase tracking-wider text-rose-500">No PromptPay</span>
                         )}
                       </div>
                       
                       <div className="shrink-0 flex items-center justify-center bg-violet-50/50 p-1.5 rounded-xl border border-violet-100 shadow-inner">
                         {hostPromptPay ? (
                           <div className="bg-white p-1 rounded-lg shadow-sm border border-violet-100">
                             <QRCodeSVG
                               value={promptpayQr(hostPromptPay, { amount: result.total || 0 })}
                               size={84}
                               bgColor="#ffffff"
                               fgColor="#1e1b4b"
                               level="Q"
                             />
                           </div>
                         ) : (
                           <div className="w-[92px] h-[92px] flex items-center justify-center border border-dashed border-rose-200 bg-rose-50 rounded-lg">
                             <span className="text-rose-500 text-[8px] font-black uppercase tracking-widest text-center leading-tight">No PP</span>
                           </div>
                         )}
                       </div>
                     </div>
                   )
                 })}
               </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}