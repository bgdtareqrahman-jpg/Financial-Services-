import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus,
  PlusCircle, 
  MinusCircle, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Download, 
  User, 
  Sparkles,
  Camera,
  Trash2,
  ChevronRight,
  BarChart as BarChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  LayoutDashboard,
  History,
  CreditCard,
  Target,
  Landmark,
  ReceiptText,
  ArrowRightLeft
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenAI } from "@google/genai";
import { cn, formatCurrency } from './lib/utils';
import { Transaction, TransactionType, CATEGORIES } from './types';

const COLORS = ['#22d3ee', '#f472b6', '#fbbf24', '#f87171', '#4ade80', '#c084fc', '#2dd4bf', '#94a3b8'];

type Tab = 'dashboard' | 'transactions' | 'debts' | 'savings';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userName, setUserName] = useState<string>('Guest');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Manual overrides
  const [manualIncome, setManualIncome] = useState<number | null>(null);
  const [manualExpense, setManualExpense] = useState<number | null>(null);
  const [manualPayable, setManualPayable] = useState<number | null>(null);
  const [editingField, setEditingField] = useState<'income' | 'expense' | 'payable' | null>(null);

  const [aiTips, setAiTips] = useState<string>('');
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  
  // Savings state
  const [banks, setBanks] = useState([
    { id: 'bank1', name: 'Primary Bank', balance: 0, icon: 'Landmark' },
    { id: 'bank2', name: 'Secondary Bank', balance: 0, icon: 'Wallet' }
  ]);
  const [editingSavingsField, setEditingSavingsField] = useState<{ id: string, field: 'name' | 'balance' | 'icon' } | null>(null);

  // Form state
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState(CATEGORIES.expense[0]);
  const [description, setDescription] = useState('');

  // Load data
  useEffect(() => {
    const savedTransactions = localStorage.getItem('aura_transactions');
    const savedName = localStorage.getItem('aura_username');
    const savedProfileImage = localStorage.getItem('aura_profile_image');
    const savedBanks = localStorage.getItem('aura_banks');
    const savedManualIncome = localStorage.getItem('aura_manual_income');
    const savedManualExpense = localStorage.getItem('aura_manual_expense');
    const savedManualPayable = localStorage.getItem('aura_manual_payable');
    
    if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    if (savedName) setUserName(savedName);
    if (savedProfileImage) setProfileImage(savedProfileImage);
    if (savedBanks) setBanks(JSON.parse(savedBanks));
    if (savedManualIncome) setManualIncome(Number(savedManualIncome));
    if (savedManualExpense) setManualExpense(Number(savedManualExpense));
    if (savedManualPayable) setManualPayable(Number(savedManualPayable));
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('aura_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('aura_username', userName);
    if (profileImage) {
      localStorage.setItem('aura_profile_image', profileImage);
    } else {
      localStorage.removeItem('aura_profile_image');
    }
    localStorage.setItem('aura_banks', JSON.stringify(banks));
    if (manualIncome !== null) localStorage.setItem('aura_manual_income', manualIncome.toString());
    if (manualExpense !== null) localStorage.setItem('aura_manual_expense', manualExpense.toString());
    if (manualPayable !== null) localStorage.setItem('aura_manual_payable', manualPayable.toString());
  }, [userName, profileImage, banks, manualIncome, manualExpense, manualPayable]);

  const totalIncome = useMemo(() => 
    transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
  [transactions]);

  const totalExpenses = useMemo(() => 
    transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
  [transactions]);

  const totalPayable = useMemo(() => 
    transactions.filter(t => t.type === 'payable').reduce((acc, t) => acc + t.amount, 0),
  [transactions]);

  const totalReceivable = useMemo(() => 
    transactions.filter(t => t.type === 'receivable').reduce((acc, t) => acc + t.amount, 0),
  [transactions]);

  const balance = totalIncome - totalExpenses;

  const totalBankSavings = banks.reduce((acc, b) => acc + b.balance, 0);
  const displayIncome = manualIncome !== null ? manualIncome : totalIncome;
  const displayExpense = manualExpense !== null ? manualExpense : totalExpenses;
  const displayPayable = manualPayable !== null ? manualPayable : totalPayable;
  const displayNetWorth = displayIncome - displayExpense - displayPayable;

  const renderBankIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'Landmark': return <Landmark size={size} />;
      case 'Wallet': return <Wallet size={size} />;
      case 'CreditCard': return <CreditCard size={size} />;
      case 'PiggyBank': return <PiggyBank size={size} />;
      case 'ReceiptText': return <ReceiptText size={size} />;
      default: return <Landmark size={size} />;
    }
  };

  const updateBank = (id: string, updates: Partial<{ name: string, balance: number, icon: string }>) => {
    setBanks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const bankIcons = ['Landmark', 'Wallet', 'CreditCard', 'PiggyBank', 'ReceiptText'];

  const chartData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTransactions = transactions.filter(t => t.date === date);
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        income: dayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
        expense: dayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      };
    });
  }, [transactions]);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;

    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      amount: Number(amount),
      type,
      category,
      description: description || category,
      date: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    setTransactions([newTransaction, ...transactions]);
    setAmount('');
    setDescription('');
    setIsAddingTransaction(false);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(transactions.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(transactions);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "Aura_Finance_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Aura Finance - Full Ledger History", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    // Summary stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Income: ${formatCurrency(displayIncome)}`, 14, 40);
    doc.text(`Total Expenses: ${formatCurrency(displayExpense)}`, 14, 47);
    doc.text(`Total Pay Loan: ${formatCurrency(displayPayable)}`, 14, 54);
    doc.text(`Net Balance: ${formatCurrency(displayNetWorth)}`, 14, 61);

    const tableData = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.type.toUpperCase(),
      t.description,
      t.category,
      `${t.amount} ৳`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [['Date', 'Type', 'Description', 'Category', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212] }, // cyan-500
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    doc.save("Aura_Finance_Ledger.pdf");
  };

  const generateAITips = async () => {
    setIsGeneratingTips(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const summary = transactions.slice(0, 20).map(t => `${t.type}: ${t.amount} for ${t.category}`).join(', ');
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `As a financial expert, analyze these recent transactions: ${summary}. 
        Total Income: ${totalIncome}, Total Expenses: ${totalExpenses}, Payable: ${totalPayable}, Receivable: ${totalReceivable}. 
        Provide 3 concise, actionable tips to improve financial health. Keep it under 100 words. Use Bangladeshi Taka (৳) in your response.`,
      });

      setAiTips(response.text || "Keep tracking your expenses to see patterns!");
    } catch (error) {
      console.error("AI Error:", error);
      setAiTips("Focus on categorizing your spending to identify where you can save most.");
    } finally {
      setIsGeneratingTips(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-cyan-500/30 pb-12">
      {/* Top Header with Profile & Navigation */}
      <header className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative group">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 overflow-hidden border-2 border-slate-800">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={28} />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center border-2 border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
                <Camera size={12} className="text-cyan-400" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <input
                    autoFocus
                    className="bg-slate-800 border border-cyan-500/50 outline-none text-lg font-bold px-2 py-0.5 rounded-lg w-32 text-white"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={() => {
                      if (tempName) setUserName(tempName);
                      setIsEditingName(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (tempName) setUserName(tempName);
                        setIsEditingName(false);
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col">
                    <h1 
                      className="text-lg font-bold tracking-tight cursor-pointer hover:text-cyan-400 transition-colors"
                      onClick={() => {
                        setTempName(userName);
                        setIsEditingName(true);
                      }}
                    >
                      {userName}
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personal Account</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Separately Dashboard Bar */}
          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={exportToExcel}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 rounded-xl transition-all"
              title="Export to Excel"
            >
              <Download size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Bank Savings Section */}
        {activeTab === 'savings' && (
          <div className="space-y-8">
            <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 shadow-xl space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl shadow-lg shadow-cyan-500/10">
                    <Landmark size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-100">Bank Accounts</h2>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {banks.map((bank, index) => (
                  <div 
                    key={bank.id}
                    className={cn(
                      "border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all group",
                      index === 0 
                        ? "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/40" 
                        : "bg-indigo-500/5 border-indigo-500/20 hover:border-indigo-500/40"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        onClick={() => setEditingSavingsField({ id: bank.id, field: 'icon' })}
                        className={cn(
                          "w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center cursor-pointer hover:bg-opacity-80 transition-colors relative",
                          index === 0 ? "text-cyan-400" : "text-indigo-400"
                        )}
                      >
                        {renderBankIcon(bank.icon, 24)}
                        {editingSavingsField?.id === bank.id && editingSavingsField.field === 'icon' && (
                          <div className="absolute top-full left-0 mt-2 p-2 bg-slate-900 border border-slate-700 rounded-xl z-50 flex gap-2 shadow-2xl">
                            {bankIcons.map(icon => (
                              <button 
                                key={icon}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateBank(bank.id, { icon });
                                  setEditingSavingsField(null);
                                }}
                                className={cn(
                                  "p-2 rounded-lg hover:bg-slate-800 transition-colors",
                                  bank.icon === icon 
                                    ? (index === 0 ? "text-cyan-400 bg-cyan-500/10" : "text-indigo-400 bg-indigo-500/10") 
                                    : "text-slate-500"
                                )}
                              >
                                {renderBankIcon(icon, 18)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        {editingSavingsField?.id === bank.id && editingSavingsField.field === 'name' ? (
                          <input 
                            autoFocus
                            className={cn(
                              "bg-slate-900 border rounded-lg px-2 py-1 text-base font-black text-white outline-none w-full",
                              index === 0 ? "border-cyan-500/30" : "border-indigo-500/30"
                            )}
                            value={bank.name}
                            onChange={(e) => updateBank(bank.id, { name: e.target.value })}
                            onBlur={() => setEditingSavingsField(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingSavingsField(null)}
                          />
                        ) : (
                          <h3 
                            onClick={() => setEditingSavingsField({ id: bank.id, field: 'name' })}
                            className={cn(
                              "text-base font-black text-slate-200 cursor-pointer transition-colors",
                              index === 0 ? "hover:text-cyan-400" : "hover:text-indigo-400"
                            )}
                          >
                            {bank.name}
                          </h3>
                        )}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Savings Account</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {editingSavingsField?.id === bank.id && editingSavingsField.field === 'balance' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn("font-black text-xl", index === 0 ? "text-cyan-400" : "text-indigo-400")}>৳</span>
                          <input 
                            autoFocus
                            type="number"
                            className={cn(
                              "bg-slate-900 border rounded-lg px-2 py-1 text-xl font-black text-white outline-none w-32 text-right",
                              index === 0 ? "border-cyan-500/30" : "border-indigo-500/30"
                            )}
                            value={bank.balance}
                            onChange={(e) => updateBank(bank.id, { balance: Number(e.target.value) })}
                            onBlur={() => setEditingSavingsField(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingSavingsField(null)}
                          />
                        </div>
                      ) : (
                        <p 
                          onClick={() => setEditingSavingsField({ id: bank.id, field: 'balance' })}
                          className={cn(
                            "text-2xl font-black cursor-pointer hover:scale-105 transition-transform origin-right",
                            index === 0 ? "text-cyan-400" : "text-indigo-400"
                          )}
                        >
                          {formatCurrency(bank.balance)}
                        </p>
                      )}
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Current Balance</p>
                    </div>
                  </div>
                ))}

                {/* Total Balance Row */}
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                      <ArrowRightLeft size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-emerald-400">Total Balance</h3>
                      <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest">Combined Savings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">
                      {formatCurrency(totalBankSavings)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Net Savings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Stats */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex justify-between items-center px-2 mb-2">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Financial Summary</h2>
              </div>

              {/* 2x2 Grid for Stats */}
              <div className="grid grid-cols-2 gap-3">
                {/* Balance Box */}
                <div 
                  className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 p-4 rounded-2xl border border-cyan-500/20 flex flex-col justify-between group h-32"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-cyan-500/60 uppercase tracking-widest">Balance</p>
                    <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                      <Wallet size={18} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight truncate">{formatCurrency(displayNetWorth)}</h3>
                  </div>
                </div>

                {/* Income Box */}
                <div 
                  onClick={() => setEditingField('income')}
                  className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-emerald-500/30 transition-all cursor-pointer group h-32"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Income</p>
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
                      <TrendingUp size={18} />
                    </div>
                  </div>
                  <div>
                    {editingField === 'income' ? (
                      <input 
                        autoFocus
                        type="number"
                        className="bg-slate-800 border border-emerald-500/30 rounded-lg px-2 py-1 text-sm font-black text-white outline-none w-full"
                        value={manualIncome ?? displayIncome}
                        onChange={(e) => setManualIncome(Number(e.target.value))}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                      />
                    ) : (
                      <h3 className="text-lg font-black text-emerald-400 tracking-tight truncate">{formatCurrency(displayIncome)}</h3>
                    )}
                  </div>
                </div>

                {/* Expense Box */}
                <div 
                  onClick={() => setEditingField('expense')}
                  className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between hover:border-pink-500/30 transition-all cursor-pointer group h-32"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-pink-500/60 uppercase tracking-widest">Expense</p>
                    <div className="p-2 bg-pink-500/10 text-pink-400 rounded-lg group-hover:scale-110 transition-transform">
                      <TrendingDown size={18} />
                    </div>
                  </div>
                  <div>
                    {editingField === 'expense' ? (
                      <input 
                        autoFocus
                        type="number"
                        className="bg-slate-800 border border-pink-500/30 rounded-lg px-2 py-1 text-sm font-black text-white outline-none w-full"
                        value={manualExpense ?? displayExpense}
                        onChange={(e) => setManualExpense(Number(e.target.value))}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                      />
                    ) : (
                      <h3 className="text-lg font-black text-pink-400 tracking-tight truncate">{formatCurrency(displayExpense)}</h3>
                    )}
                  </div>
                </div>

                {/* Pay Loan Box */}
                <div 
                  onClick={() => setEditingField('payable')}
                  className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between group hover:border-amber-500/30 transition-all cursor-pointer h-32"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">Pay Loan</p>
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:scale-110 transition-transform">
                      <ReceiptText size={18} />
                    </div>
                  </div>
                  <div>
                    {editingField === 'payable' ? (
                      <input 
                        autoFocus
                        type="number"
                        className="bg-slate-800 border border-amber-500/30 rounded-lg px-2 py-1 text-sm font-black text-white outline-none w-full"
                        value={manualPayable ?? displayPayable}
                        onChange={(e) => setManualPayable(Number(e.target.value))}
                        onBlur={() => setEditingField(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                      />
                    ) : (
                      <h3 className="text-lg font-black text-amber-400 tracking-tight truncate">{formatCurrency(displayPayable)}</h3>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Ledger */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Transaction History</h2>
                {transactions.length > 8 && (
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
                  >
                    View All
                  </button>
                )}
              </div>
              {/* Transaction Ledger - Separated Rows */}
              <div className="space-y-4">
                {/* Separated Transaction Rows */}
                <div className="space-y-3">
                  {transactions.slice(0, 8).map(t => (
                    <motion.div 
                      layout
                      key={t.id} 
                      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          t.type === 'income' ? "bg-cyan-500/10 text-cyan-400" : 
                          t.type === 'expense' ? "bg-pink-500/10 text-pink-400" :
                          t.type === 'payable' ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                        )}>
                          {t.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                        </div>
                        <div>
                          <input 
                            type="text"
                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-200 p-0 w-full"
                            value={t.description}
                            onChange={(e) => updateTransaction(t.id, { description: e.target.value })}
                          />
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-[8px] font-black uppercase tracking-widest",
                              t.type === 'income' ? "text-cyan-500/60" : "text-pink-500/60"
                            )}>{t.type}</span>
                            <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">•</span>
                            <select 
                              className="bg-transparent border-none focus:ring-0 text-[8px] font-bold text-slate-500 uppercase tracking-widest p-0 cursor-pointer"
                              value={t.category}
                              onChange={(e) => updateTransaction(t.id, { category: e.target.value })}
                            >
                              {CATEGORIES[t.type].map(cat => (
                                <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-600 font-bold text-sm">৳</span>
                          <input 
                            type="number"
                            className={cn(
                              "bg-transparent border-none focus:ring-0 text-lg font-black w-24 text-right p-0",
                              t.type === 'income' || t.type === 'receivable' ? "text-cyan-400" : "text-pink-400"
                            )}
                            value={t.amount}
                            onChange={(e) => updateTransaction(t.id, { amount: Number(e.target.value) })}
                          />
                        </div>
                        <button 
                          onClick={() => deleteTransaction(t.id)} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-600 hover:text-pink-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {transactions.length > 8 && (
                  <button 
                    onClick={() => setActiveTab('transactions')}
                    className="w-full py-4 text-[10px] font-black text-slate-500 hover:text-cyan-400 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800 transition-colors uppercase tracking-[0.3em]"
                  >
                    View All Activity
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2 text-slate-100">
                  <History size={18} className="text-cyan-400" />
                  Full Ledger History
                </h2>
                <button 
                  onClick={exportToPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/20 transition-all text-xs font-black uppercase tracking-widest"
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      <th className="px-6 py-4 border-b border-slate-800">Date</th>
                      <th className="px-6 py-4 border-b border-slate-800">Type</th>
                      <th className="px-6 py-4 border-b border-slate-800">Description</th>
                      <th className="px-6 py-4 border-b border-slate-800">Category</th>
                      <th className="px-6 py-4 border-b border-slate-800">Amount</th>
                      <th className="px-6 py-4 border-b border-slate-800 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map(t => (
                      <tr key={t.id} className="group hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-600">
                          {new Date(t.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest",
                            t.type === 'income' ? "bg-cyan-500/10 text-cyan-400" : 
                            t.type === 'expense' ? "bg-pink-500/10 text-pink-400" :
                            t.type === 'payable' ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                          )}>
                            {t.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <input 
                            type="text"
                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-medium text-slate-300"
                            value={t.description}
                            onChange={(e) => updateTransaction(t.id, { description: e.target.value })}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            className="w-full bg-transparent border-none focus:ring-0 text-xs font-medium text-slate-500"
                            value={t.category}
                            onChange={(e) => updateTransaction(t.id, { category: e.target.value })}
                          >
                            {CATEGORIES[t.type].map(cat => (
                              <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-600 font-bold text-xs">৳</span>
                            <input 
                              type="number"
                              className={cn(
                                "w-full bg-transparent border-none focus:ring-0 text-xs font-black",
                                t.type === 'income' || t.type === 'receivable' ? "text-cyan-400" : "text-pink-400"
                              )}
                              value={t.amount}
                              onChange={(e) => updateTransaction(t.id, { amount: Number(e.target.value) })}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => deleteTransaction(t.id)} className="text-slate-600 hover:text-pink-500">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-sm">
              <h2 className="font-bold mb-6 flex items-center gap-2 text-pink-400">
                <TrendingDown size={18} />
                Accounts Payable
              </h2>
              <div className="space-y-4">
                {transactions.filter(t => t.type === 'payable').map(t => (
                  <div key={t.id} className="p-4 bg-pink-500/5 rounded-2xl border border-pink-500/10 flex justify-between items-center group hover:bg-pink-500/10 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{t.description}</p>
                      <p className="text-[10px] font-bold text-pink-500/50 uppercase tracking-widest">{t.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-pink-400">{formatCurrency(t.amount)}</p>
                      <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-600 hover:text-pink-500 font-bold uppercase">Remove</button>
                    </div>
                  </div>
                ))}
                {transactions.filter(t => t.type === 'payable').length === 0 && (
                  <p className="text-center py-8 text-sm text-slate-600 italic">No payables recorded</p>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-sm">
              <h2 className="font-bold mb-6 flex items-center gap-2 text-cyan-400">
                <TrendingUp size={18} />
                Accounts Receivable
              </h2>
              <div className="space-y-4">
                {transactions.filter(t => t.type === 'receivable').map(t => (
                  <div key={t.id} className="p-4 bg-cyan-500/5 rounded-2xl border border-cyan-500/10 flex justify-between items-center group hover:bg-cyan-500/10 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-200">{t.description}</p>
                      <p className="text-[10px] font-bold text-cyan-500/50 uppercase tracking-widest">{t.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-cyan-400">{formatCurrency(t.amount)}</p>
                      <button onClick={() => deleteTransaction(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-600 hover:text-cyan-500 font-bold uppercase">Remove</button>
                    </div>
                  </div>
                ))}
                {transactions.filter(t => t.type === 'receivable').length === 0 && (
                  <p className="text-center py-8 text-sm text-slate-600 italic">No receivables recorded</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-50 px-6 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <nav className="flex items-center justify-between bg-slate-900/80 backdrop-blur-2xl border border-white/5 p-1.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-around flex-1">
              {(['dashboard', 'transactions'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative p-2.5 rounded-full transition-all duration-300",
                    activeTab === tab 
                      ? "text-cyan-400 bg-cyan-500/10 scale-110" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                  title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                >
                  {tab === 'dashboard' && <LayoutDashboard size={18} />}
                  {tab === 'transactions' && <History size={18} />}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 border border-cyan-500/30 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsAddingTransaction(true)}
              className="mx-2 p-3.5 bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-full shadow-lg shadow-cyan-500/20 hover:scale-110 active:scale-95 transition-all"
            >
              <Plus size={24} strokeWidth={3} />
            </button>

            <div className="flex items-center justify-around flex-1">
              {(['debts', 'savings'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "relative p-2.5 rounded-full transition-all duration-300",
                    activeTab === tab 
                      ? "text-cyan-400 bg-cyan-500/10 scale-110" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                  title={tab.charAt(0).toUpperCase() + tab.slice(1)}
                >
                  {tab === 'debts' && <ReceiptText size={18} />}
                  {tab === 'savings' && <Landmark size={18} />}
                  {activeTab === tab && (
                    <motion.div 
                      layoutId="activeTab"
                      className="absolute inset-0 border border-cyan-500/30 rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingTransaction(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <h2 className="text-lg font-black text-white uppercase tracking-widest">New Transaction</h2>
                <button 
                  onClick={() => setIsAddingTransaction(false)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <Plus className="rotate-45" size={20} />
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['expense', 'income', 'payable', 'receivable'] as TransactionType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setType(t);
                          setCategory(CATEGORIES[t][0]);
                        }}
                        className={cn(
                          "py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          type === t 
                            ? (t === 'income' || t === 'receivable' ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400" : "bg-pink-500/10 border-pink-500/50 text-pink-400")
                            : "bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount (৳)</label>
                  <input
                    autoFocus
                    type="number"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-xl font-black text-white outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</label>
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-colors appearance-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES[type].map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Description</label>
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-colors"
                    placeholder="What was this for?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-black uppercase tracking-[0.2em] shadow-lg shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4"
                >
                  Add Transaction
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
