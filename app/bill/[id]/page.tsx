"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { calculateTotals } from "@/lib/math/splitEngine";

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
  participants: Participant[];
  items: BillItem[];
}

export default function BillPage() {
  const params = useParams();
  const [billData, setBillData] = useState<BillData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillData = async () => {
      try {
        const { data, error } = await supabase
          .from("bills")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) {
          setError("Failed to load bill data");
          console.error("Supabase Error:", error?.message || error);
        } else {
          setBillData(data);
        }
      } catch (err) {
        setError("An unexpected error occurred");
        console.error("Unexpected error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBillData();
  }, [params.id]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 text-slate-900 p-6 font-sans">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-blue-600 font-semibold">Loading bill...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 text-slate-900 p-6 font-sans">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        </div>
      </main>
    );
  }

  if (!billData) {
    return (
      <main className="min-h-screen bg-gray-50 text-slate-900 p-6 font-sans">
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Not Found!</strong>
            <span className="block sm:inline"> Bill not found.</span>
          </div>
        </div>
      </main>
    );
  }

  const splitResults = calculateTotals(billData.items, billData.service_charge, billData.vat);

  return (
    <main className="min-h-screen bg-gray-50 text-slate-900 p-6 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-black tracking-tighter text-[#06b6d4] mb-2">
            Bill Details
          </h1>
          <p className="text-slate-600">Bill ID: {billData.id}</p>
        </header>

        {/* Host Information */}
        <div className="bg-white border border-blue-600 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">Host Information</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-blue-900 font-medium">Host PromptPay:</span>
              <span className="font-mono text-black font-bold">{billData.host_promptpay}</span>
            </div>
          </div>
        </div>

        {/* Bill Summary */}
        <div className="bg-white border border-blue-600 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">Bill Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-blue-900 font-medium">Subtotal:</span>
              <span className="font-bold">฿{billData.items.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-900 font-medium">Service Charge:</span>
              <span className="font-bold">{billData.service_charge}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-900 font-medium">VAT:</span>
              <span className="font-bold">{billData.vat}%</span>
            </div>
            <div className="border-t border-blue-200 my-2"></div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-blue-900">Total:</span>
              <span>฿{billData.items.reduce((acc, curr) => acc + curr.price, 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white border border-blue-600 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">Items</h2>
          <div className="space-y-3">
            {billData.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-blue-100">
                <div>
                  <span className="font-medium text-blue-900">{item.name}</span>
                  <div className="text-xs text-slate-500">
                    Consumed by: {item.consumedBy.length > 0 
                      ? item.consumedBy.map(id => {
                          const participant = billData.participants.find(p => p.id === id);
                          return participant?.name || 'Unknown';
                        }).join(', ')
                      : 'No one'}
                  </div>
                </div>
                <span className="font-bold">฿{item.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Participants Breakdown */}
        <div className="bg-white border border-blue-600 rounded-3xl p-6">
          <h2 className="font-bold uppercase tracking-widest text-sm text-blue-600 mb-4">Participants Breakdown</h2>
          <div className="space-y-3">
            {splitResults.map((result) => {
              const person = billData.participants.find(p => p.id === result.id);
              return (
                <div key={result.id} className="flex justify-between items-center py-2 border-b border-blue-100">
                  <span className="text-blue-900 font-medium">{person?.name || 'Unknown'}</span>
                  <span className="font-bold text-lg">฿{(result.total || 0).toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="text-center text-xs text-slate-500 mt-8">
          Generated by HarnHub | Smart Split Prototype
        </footer>
      </div>
    </main>
  );
}