"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Calculator, Receipt, Users, Download, Save, Settings2, Percent } from "lucide-react";
import { toPng } from "html-to-image";
import { createClient } from "@/utils/supabase/client";

interface Expense {
  id: string;
  name: string;
  amount: number;
  allocations?: Record<string, number>;
}

interface Member {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  expenses: Expense[];
  members: Member[];
}

export default function MonthlySplit() {
  const supabase = createClient();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [memberName, setMemberName] = useState("");
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('monthly_templates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => {
            if (data) setTemplates(data);
          });
      }
    });
  }, [supabase]);

  const saveTemplate = async () => {
    if (!templateName) return alert("Please name your template");
    setIsSavingTemplate(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('monthly_templates').insert([
        {
          user_id: user.id,
          name: templateName,
          expenses: expenses,
          members: members
        }
      ]).select().single();
      
      console.log("Supabase Insert Response ->", { data, error });
      if (!error && data) {
        setTemplates([data, ...templates]);
        setTemplateName("");
        alert(`Template '${templateName}' has been successfully saved!`);
      } else {
        console.error("Supabase Save Error Object:", error);
        alert(`Failed to save! Supabase says: ${error?.message || JSON.stringify(error) || "Data was null"}.`);
      }
    } else {
      alert("Please log in to save templates.");
    }
    setIsSavingTemplate(false);
  };

  const loadTemplate = (template: Template) => {
    setExpenses(template.expenses || []);
    setMembers(template.members || []);
  };
  
  const updateExpenseAllocation = (expenseId: string, memberId: string, percentage: number) => {
    setExpenses(expenses.map(e => {
      if (e.id === expenseId) {
        const allocs = { ...(e.allocations || {}) };
        allocs[memberId] = percentage;
        return { ...e, allocations: allocs };
      }
      return e;
    }));
  };

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

  const calculatedShares: Record<string, number> = {};
  members.forEach(m => calculatedShares[m.id] = 0);
  
  let totalExpenses = 0;

  expenses.forEach(e => {
    totalExpenses += e.amount;
    const hasCustomAllocs = e.allocations && Object.keys(e.allocations).length > 0;
    
    if (hasCustomAllocs) {
      members.forEach(m => {
        const percent = e.allocations![m.id] || 0;
        calculatedShares[m.id] += (percent / 100) * e.amount;
      });
    } else {
      const equalShare = members.length > 0 ? e.amount / members.length : 0;
      members.forEach(m => {
        calculatedShares[m.id] += equalShare;
      });
    }
  });

  const averageShare = members.length > 0 ? totalExpenses / members.length : 0;

  return (
    <main className="min-h-screen bg-transparent text-white p-6 font-mono">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        {/* Navigation */}
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest text-sm">
          &larr; Back to Hub
        </Link>

        {/* Header & Templates */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-indigo-400 mb-2">Monthly Split</h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest">Fixed-Cost Routing Engine</p>
          </div>
          
          <div className="flex flex-col gap-3 md:min-w-[300px]">
            {templates.length > 0 && (
              <select 
                className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors uppercase tracking-widest font-bold"
                onChange={(e) => {
                  const tId = e.target.value;
                  const t = templates.find(t => String(t.id) === String(tId));
                  if (t) loadTemplate(t);
                }}
                defaultValue=""
              >
                <option value="" disabled>Load Memory Template</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Template Name..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && saveTemplate()}
              />
              <button 
                onClick={saveTemplate}
                disabled={isSavingTemplate}
                className="bg-zinc-800 hover:bg-violet-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50"
                title="Save as new Template"
              >
                <Save size={18} />
              </button>
            </div>
          </div>
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
                <div key={expense.id} className="flex flex-col bg-black rounded-xl border border-zinc-800 transition-colors hover:border-zinc-700 overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-zinc-950">
                    <span className="font-bold uppercase tracking-widest text-xs sm:text-sm">{expense.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-indigo-400 font-black text-sm sm:text-base">฿{expense.amount.toLocaleString()}</span>
                      <button 
                        onClick={() => setExpandedExpenseId(expandedExpenseId === expense.id ? null : expense.id)} 
                        className={`text-zinc-600 hover:text-indigo-400 transition-colors shrink-0 ${expandedExpenseId === expense.id ? 'text-indigo-400' : ''}`}
                        title="Customize Split Ratio"
                      >
                        <Settings2 size={16} />
                      </button>
                      <button onClick={() => removeExpense(expense.id)} className="text-zinc-600 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {expandedExpenseId === expense.id && members.length > 0 && (
                    <div className="p-4 bg-black border-t border-zinc-800 space-y-3 animate-in slide-in-from-top-2">
                       <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"><Percent size={12}/> Custom Ratio Split</p>
                       <div className="grid grid-cols-2 gap-3">
                         {members.map(m => (
                           <div key={m.id} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
                             <span className="text-xs text-zinc-400 font-bold uppercase truncate flex-1">{m.name}</span>
                             <input 
                               type="number"
                               min={0}
                               max={100}
                               placeholder={(100 / members.length).toFixed(0)}
                               value={expense.allocations?.[m.id] === undefined ? "" : expense.allocations[m.id]}
                               onChange={(e) => updateExpenseAllocation(expense.id, m.id, Number(e.target.value))}
                               className="w-16 bg-black border border-zinc-800 rounded px-2 py-1 text-xs text-indigo-400 outline-none text-right font-black"
                             />
                             <span className="text-xs text-zinc-600">%</span>
                           </div>
                         ))}
                       </div>
                       {(() => {
                         const currentTotal = members.reduce((sum, m) => sum + (expense.allocations?.[m.id] || 0), 0);
                         const isCustom = expense.allocations && Object.keys(expense.allocations).length > 0;
                         if (isCustom && currentTotal !== 100) {
                           return <p className="text-[9px] text-rose-500 uppercase tracking-widest font-bold mt-2">Warning: Allocations sum to {currentTotal}%, scaling mathematically.</p>
                         }
                         return null;
                       })()}
                    </div>
                  )}
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
                    <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 mb-2 font-bold">Base Average Share</p>
                    <p className="text-3xl sm:text-4xl font-black text-indigo-400 dropshadow-sm">฿{averageShare.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>

              <div className="space-y-4">
                {members.map(member => (
                  <div key={member.id} className="flex justify-between items-center p-5 bg-zinc-900/80 rounded-2xl border border-zinc-800/80">
                     <span className="text-sm font-bold uppercase tracking-widest text-zinc-300">{member.name}</span>
                     <span className="text-2xl font-black text-rose-400">฿{calculatedShares[member.id].toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
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
