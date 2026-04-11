"use client";

import { useState } from "react";
import { Plus, Trash2, Calculator, Receipt } from "lucide-react";

// Use the interface we defined earlier
interface BillItem {
  id: string;
  name: string;
  price: number;
}

export default function Home() {
  const [restaurantName, setRestaurantName] = useState("");
  const [items, setItems] = useState<BillItem[]>([]);

  const addItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: "",
      price: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-[#000] text-white p-6 font-sans">
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <input 
            type="text" 
            placeholder="Where are you eating?" 
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl p-4 text-xl font-bold outline-none focus:border-[#06b6d4] transition-all"
          />
        </div>

        {/* Items List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2 text-[#4ade80]">
              <Receipt size={20} />
              <h2 className="font-bold uppercase tracking-widest text-sm">Bill Items</h2>
            </div>
            <span className="text-xs text-zinc-500">{items.length} items added</span>
          </div>

          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex space-x-2 animate-in fade-in slide-in-from-top-1">
                <input 
                  type="text" 
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 rounded-xl p-3 text-sm outline-none focus:border-[#06b6d4]"
                />
                <input 
                  type="number" 
                  placeholder="Price"
                  value={item.price || ""}
                  onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                  className="w-24 bg-black border border-zinc-800 rounded-xl p-3 text-sm outline-none focus:border-[#06b6d4]"
                />
                <button 
                  onClick={() => removeItem(item.id)}
                  className="p-3 text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}

            <button 
              onClick={addItem}
              className="w-full py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 hover:border-[#06b6d4] hover:text-[#06b6d4] hover:bg-[#06b6d4]/5 transition-all flex items-center justify-center space-x-2"
            >
              <Plus size={18} />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Calculation Summary Preview */}
        {items.length > 0 && (
          <div className="bg-[#06b6d4] rounded-3xl p-6 text-black flex justify-between items-center">
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
        )}
      </div>

      <footer className="fixed bottom-6 left-6 text-[10px] text-zinc-700 uppercase tracking-widest">
        MUIC | ID 6680024 | Kou
      </footer>
    </main>
  );
}