"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Plus, Trash2, Calculator, Receipt, Users, Download } from "lucide-react";
import { toPng } from "html-to-image";

interface Expense {
  id: string;
  name: string;
  amount: number;
}

interface Member {
  id: string;
  name: string;
}

export default function MonthlySplit() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [memberName, setMemberName] = useState("");

  const splitRef = useRef<HTMLDivElement>(null);

  const addExpense = () => {
    if (!expenseName || !expenseAmount) return;
    setExpenses([
      ...expenses,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: expenseName,
        amount: parseFloat(expenseAmount),
      },
    ]);
    setExpenseName("");
    setExpenseAmount("");
  };

  const removeExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const addMember = () => {
    if (!memberName) return;
    setMembers([
      ...members,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: memberName,
      },
    ]);
    setMemberName("");
  };

  const removeMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
  };

  const downloadReceipt = async () => {
    if (!splitRef.current) return;
    try {
      const dataUrl = await toPng(splitRef.current, { cacheBust: true, backgroundColor: '#000000' });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = 'harnhub-monthly.png';
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const amountPerPerson = members.length > 0 ? totalExpenses / members.length : 0;

  return (
    <main className="min-h-screen bg-transparent text-white p-6 font-mono">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest text-sm">
          &larr; Back to Hub
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-indigo-400 mb-2">Monthly Split</h1>
          <p className="text-zinc-500 text-sm uppercase tracking-widest">Fixed-Cost Routing Engine</p>
        </div>

        {/* Engine Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Expenses */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
              <Receipt size={14} /> Expenses Manifest
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Expense (e.g. Internet)"
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="w-28 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                />
                <button
                  onClick={addExpense}
                  className="bg-indigo-500 hover:bg-violet-500 text-white p-3 rounded-xl transition-colors shrink-0 flex items-center justify-center p-3"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between bg-black p-4 rounded-xl border border-zinc-800 group transition-colors hover:border-zinc-700">
                  <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{expense.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-400 font-black text-sm sm:text-base">฿{expense.amount.toLocaleString()}</span>
                    <button onClick={() => removeExpense(expense.id)} className="text-zinc-600 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center text-zinc-600 text-xs uppercase tracking-widest py-8">No expenses added</p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-between items-center">
              <span className="text-zinc-500 uppercase tracking-widest font-black text-xs">Run Subtotal</span>
              <span className="text-2xl font-black text-white">฿{totalExpenses.toLocaleString()}</span>
            </div>
          </section>

          {/* Card 2: Roommates */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-6 font-bold flex items-center gap-2">
              <Users size={14} /> Roommates Directory
            </h2>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Roommate Name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && addMember()}
              />
              <button
                onClick={addMember}
                className="bg-indigo-500 hover:bg-violet-500 text-white py-3 px-6 rounded-xl font-bold uppercase tracking-widest text-sm transition-colors shrink-0 flex items-center gap-2"
              >
                Add <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-1 mb-6">Total expenses will be divided equally among all listed members.</p>

            <div className="grid grid-cols-2 gap-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between bg-black p-3 rounded-xl border border-zinc-800 group transition-colors hover:border-zinc-700">
                  <span className="font-bold uppercase tracking-widest text-xs truncate max-w-[80%] block" title={member.name}>{member.name}</span>
                  <button onClick={() => removeMember(member.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <div className="col-span-2 text-center text-zinc-600 text-xs uppercase tracking-widest py-8">
                  No roommates added
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Final Split Output */}
        {members.length > 0 && expenses.length > 0 && (
          <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* The structural DOM bound for PNG Export */}
            <div ref={splitRef} className="bg-black p-6 sm:p-10 rounded-[40px] border border-violet-500/30 shadow-[0_0_50px_rgba(168,85,247,0.1)]">
              <div className="flex items-center gap-3 mb-8 border-b border-zinc-900 pb-6">
                <Calculator className="text-violet-500 animate-pulse" size={24} />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Monthly Distribution</h2>
              </div>
              
              <div className="flex flex-col md:flex-row gap-8 mb-10">
                <div className="flex-1 bg-zinc-950 p-6 rounded-3xl border border-zinc-900">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2 font-bold">Gross Calculation</p>
                    <p className="text-4xl font-black text-white dropshadow-sm">฿{totalExpenses.toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-purple-950/20 p-6 rounded-3xl border border-indigo-900/50">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 mb-2 font-bold">Share Per Resident</p>
                    <p className="text-3xl sm:text-4xl font-black text-indigo-400 dropshadow-sm">฿{amountPerPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>

              <div className="space-y-4">
                {members.map(member => (
                  <div key={member.id} className="flex justify-between items-center p-5 bg-zinc-900/80 rounded-2xl border border-zinc-800/80">
                     <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">{member.name}</span>
                     <span className="text-2xl font-black text-rose-400">฿{amountPerPerson.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-zinc-900 text-center">
                 <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.3em]">HarnHub // Monthly Pipeline</p>
              </div>
            </div>

            <button
              onClick={downloadReceipt}
              className="w-full bg-indigo-500 hover:bg-violet-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] flex justify-center items-center gap-3"
            >
              <Download size={20} /> Export Monthly Breakdown
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
