import { apiFetch } from '../lib/secureApi';
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileSpreadsheet, Upload, CheckCircle2, AlertTriangle, 
  Sparkles, Trash2, Edit3, ArrowUpRight, ArrowDownLeft, 
  RefreshCw, X, Filter, Download, Layers, ShieldCheck, Check, Search
} from 'lucide-react';
import Papa from 'papaparse';
import { Timestamp } from 'firebase/firestore';
import { Transaction } from '../types';
import { cn } from '../lib/utils';

interface CsvImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTransactions: Transaction[];
  onImportTransactions: (transactions: Array<{
    amount: number;
    category: string;
    description: string;
    type: 'expense' | 'income';
    date: Timestamp;
  }>) => void;
}

export interface ParsedCsvRow {
  id: string;
  rawDate: string;
  rawDescription: string;
  rawAmount: number;
  type: 'expense' | 'income';
  category: string;
  description: string;
  amount: number;
  date: string;
  isDuplicate: boolean;
  selected: boolean;
  isAiEnhanced?: boolean;
}

const CATEGORIES = [
  'Food', 'Transport', 'Rent', 'Entertainment', 
  'Shopping', 'Health', 'Education', 'Investment', 
  'Bills', 'Income', 'Other'
];

const SAMPLE_CSV_CHASE = `Transaction Date,Post Date,Description,Category,Type,Amount,Memo
2026-09-18,2026-09-19,TST* BLUE BOTTLE COFFEE,Food & Drink,Sale,-6.85,
2026-09-17,2026-09-18,WHOLEFDS SOMA 10421,Groceries,Sale,-84.20,
2026-09-16,2026-09-17,UBER *TRIP RIDE,Travel,Sale,-22.40,
2026-09-15,2026-09-15,DIRECT DEP TECH CORP,Payroll,Payment,3450.00,Monthly Payroll
2026-09-14,2026-09-15,AMZN MKTP US*7B901,Shopping,Sale,-45.99,
2026-09-12,2026-09-13,PG&E UTILITY BILL,Bills & Utilities,Sale,-112.50,Monthly Electric
2026-09-10,2026-09-11,NETFLIX.COM,Entertainment,Sale,-19.99,
2026-09-08,2026-09-09,CHEVRON 002910 GAS,Automotive,Sale,-52.00,Fuel`;

const SAMPLE_CSV_AMEX = `Date,Description,Card Member,Account #,Amount
09/19/2026,APPLE STORE R102,ALEX,XXXX-1002,129.00
09/18/2026,CHIPOTLE 2891,ALEX,XXXX-1002,18.40
09/16/2026,STEAM GAMES VALVE,ALEX,XXXX-1002,59.99
09/15/2026,PAYMENT RECEIVED - THANK YOU,ALEX,XXXX-1002,-1250.00
09/12/2026,EQUINOX FITNESS CLUB,ALEX,XXXX-1002,260.00
09/10/2026,DELTA AIR LINES 006,ALEX,XXXX-1002,342.10`;

export function CsvImporterModal({
  isOpen,
  onClose,
  existingTransactions,
  onImportTransactions,
}: CsvImporterModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCategorizingAi, setIsCategorizingAi] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'preview'>('upload');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income' | 'duplicates'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse Raw CSV text into preliminary ParsedCsvRow
  const parseCsvText = (csvString: string, filename: string = 'statement.csv') => {
    setIsProcessing(true);
    Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          setIsProcessing(false);
          return;
        }

        const headers = results.meta.fields || [];
        // Detect date column
        const dateKey = headers.find(h => /date|time|posted/i.test(h)) || headers[0];
        // Detect description/payee column
        const descKey = headers.find(h => /desc|payee|merchant|memo|narrative|name|particulars/i.test(h)) || headers[1] || headers[0];
        // Detect amount column(s)
        const debitKey = headers.find(h => /debit|withdrawal|out/i.test(h));
        const creditKey = headers.find(h => /credit|deposit|in/i.test(h));
        const amountKey = headers.find(h => /amount|total|sum/i.test(h)) || (!debitKey ? headers[2] : null);

        const rows: ParsedCsvRow[] = [];

        results.data.forEach((raw: any, idx: number) => {
          if (!raw) return;

          let rawDate = (raw[dateKey] || '').toString().trim();
          let rawDesc = (raw[descKey] || 'Transaction').toString().trim();
          let amount = 0;
          let type: 'expense' | 'income' = 'expense';

          if (debitKey && creditKey) {
            const deb = parseFloat(raw[debitKey]?.toString().replace(/[^0-9.-]/g, '') || '0');
            const cred = parseFloat(raw[creditKey]?.toString().replace(/[^0-9.-]/g, '') || '0');
            if (cred > 0) {
              amount = cred;
              type = 'income';
            } else {
              amount = deb > 0 ? deb : Math.abs(deb);
              type = 'expense';
            }
          } else if (amountKey) {
            const amtStr = (raw[amountKey] || '0').toString().replace(/[$,]/g, '').trim();
            const val = parseFloat(amtStr);
            if (!isNaN(val)) {
              if (val < 0) {
                // Negative is expense in most bank statements (or in cards positive is charge)
                // If memo or type says 'Payment', it's credit
                amount = Math.abs(val);
                type = 'expense';
              } else {
                // If description contains payment/deposit/payroll
                const isInc = /payroll|deposit|refund|interest|salary|credit|payment received/i.test(rawDesc);
                amount = val;
                type = isInc ? 'income' : 'expense';
              }
            }
          }

          if (amount === 0 && !rawDesc) return;

          // Standardize date to YYYY-MM-DD
          let parsedDate = new Date().toISOString().split('T')[0];
          try {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
              parsedDate = d.toISOString().split('T')[0];
            }
          } catch (e) {}

          // Preliminary Category heuristic
          const descLower = rawDesc.toLowerCase();
          let initialCat = 'Other';
          if (type === 'income') {
            initialCat = 'Income';
          } else if (/coffee|restaurant|cafe|uber\s*eats|doordash|chipotle|starbucks|food|wholefds|trader|grocer|burger|pizza/i.test(descLower)) {
            initialCat = 'Food';
          } else if (/uber|lyft|gas|fuel|chevron|shell|transit|flight|airline|delta|united|subway|metro/i.test(descLower)) {
            initialCat = 'Transport';
          } else if (/netflix|spotify|steam|cinema|movie|valve|playstation|game/i.test(descLower)) {
            initialCat = 'Entertainment';
          } else if (/apple|amazon|amzn|target|walmart|bestbuy|store|shop/i.test(descLower)) {
            initialCat = 'Shopping';
          } else if (/rent|lease|mortgage/i.test(descLower)) {
            initialCat = 'Rent';
          } else if (/utility|electric|water|pge|wifi|internet|verizon|at&t/i.test(descLower)) {
            initialCat = 'Bills';
          } else if (/pharmacy|cvs|walgreens|doctor|hospital|dental|equinox|gym|fitness/i.test(descLower)) {
            initialCat = 'Health';
          }

          // Duplicate detection against existing user transactions
          const isDuplicate = existingTransactions.some(et => {
            const etDate = et.date?.toDate ? et.date.toDate().toISOString().split('T')[0] : '';
            const sameDate = etDate === parsedDate;
            const sameAmount = Math.abs(et.amount - amount) < 0.05;
            return sameDate && sameAmount;
          });

          rows.push({
            id: `row_${idx}_${Date.now()}`,
            rawDate,
            rawDescription: rawDesc,
            rawAmount: amount,
            type,
            category: initialCat,
            description: rawDesc,
            amount,
            date: parsedDate,
            isDuplicate,
            selected: !isDuplicate, // auto-select non-duplicates
            isAiEnhanced: false,
          });
        });

        setParsedRows(rows);
        setIsProcessing(false);
        setActiveTab('preview');
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setIsProcessing(false);
      }
    });
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseCsvText(text, selectedFile.name);
      }
    };
    reader.readAsText(selectedFile);
  };

  // Run AI Auto-Categorization on parsed rows
  const handleAiAutoCategorize = async () => {
    if (parsedRows.length === 0 || isCategorizingAi) return;
    setIsCategorizingAi(true);

    try {
      const payloadRows = parsedRows.map(r => ({
        id: r.id,
        rawDate: r.date,
        rawDescription: r.rawDescription,
        rawAmount: r.amount,
        rawType: r.type,
      }));

      const res = await apiFetch('/api/gemini/auto-categorize-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payloadRows })
      });

      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const aiMap = new Map<string, any>();
        json.data.forEach((item: any) => {
          aiMap.set(item.id, item);
        });

        setParsedRows(prev => prev.map(row => {
          const aiData = aiMap.get(row.id);
          if (aiData) {
            return {
              ...row,
              description: aiData.description || row.description,
              category: CATEGORIES.includes(aiData.category) ? aiData.category : row.category,
              type: aiData.type === 'income' ? 'income' : 'expense',
              date: aiData.date || row.date,
              isAiEnhanced: true,
            };
          }
          return row;
        }));
      }
    } catch (err) {
      console.error("AI Auto-categorization failed:", err);
    } finally {
      setIsCategorizingAi(false);
    }
  };

  // Toggle selection
  const handleToggleSelectAll = () => {
    const allSelected = parsedRows.every(r => r.selected);
    setParsedRows(prev => prev.map(r => ({ ...r, selected: !allSelected })));
  };

  const handleToggleRow = (id: string) => {
    setParsedRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const handleUpdateRowField = (id: string, field: keyof ParsedCsvRow, val: any) => {
    setParsedRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const handleDeleteRow = (id: string) => {
    setParsedRows(prev => prev.filter(r => r.id !== id));
  };

  // Batch Import Execution
  const handleExecuteImport = () => {
    const selectedRows = parsedRows.filter(r => r.selected);
    if (selectedRows.length === 0) return;

    const formattedTransactions = selectedRows.map(r => ({
      amount: r.amount,
      category: r.category,
      description: r.description,
      type: r.type,
      date: Timestamp.fromDate(new Date(r.date)),
    }));

    onImportTransactions(formattedTransactions);
    onClose();
  };

  // Filtered rows for preview
  const filteredRows = parsedRows.filter(r => {
    if (filterType === 'expense' && r.type !== 'expense') return false;
    if (filterType === 'income' && r.type !== 'income') return false;
    if (filterType === 'duplicates' && !r.isDuplicate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedCount = parsedRows.filter(r => r.selected).length;
  const duplicateCount = parsedRows.filter(r => r.isDuplicate).length;
  const totalSelectedOutflow = parsedRows.filter(r => r.selected && r.type === 'expense').reduce((acc, r) => acc + r.amount, 0);
  const totalSelectedInflow = parsedRows.filter(r => r.selected && r.type === 'income').reduce((acc, r) => acc + r.amount, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-5xl h-[88vh] max-h-[850px] bg-tech-card clay-card border border-tech-lime/30 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-tech-header border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)]">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider text-white font-brand">
                  Bank Statement & CSV Importer
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-tech-lime/20 text-tech-lime border border-tech-lime/40">
                  AI Auto-Categorized
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bulk ingest credit card or bank statements with automatic category classification & duplicate detection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <div className="flex items-center bg-tech-inset p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-mono text-[11px] transition-all",
                    activeTab === 'upload' ? "bg-tech-card text-tech-lime font-bold shadow" : "text-slate-400 hover:text-white"
                  )}
                >
                  Source File
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "px-3 py-1 rounded-lg font-mono text-[11px] transition-all flex items-center gap-1.5",
                    activeTab === 'preview' ? "bg-tech-card text-tech-lime font-bold shadow" : "text-slate-400 hover:text-white"
                  )}
                >
                  <span>Review ({parsedRows.length})</span>
                  {duplicateCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400 text-[9px]">
                      {duplicateCount} dupes
                    </span>
                  )}
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TAB 1: UPLOAD / DRAG & DROP */}
        {activeTab === 'upload' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col justify-center">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-tech-lime/30 hover:border-tech-lime/70 bg-tech-inset/40 hover:bg-tech-inset/70 rounded-3xl p-10 text-center transition-all cursor-pointer group flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto w-full"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .tsv, .txt"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="p-4 rounded-3xl bg-tech-lime/10 border border-tech-lime/20 text-tech-lime group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(165,243,68,0.2)]">
                <Upload size={36} />
              </div>
              <div>
                <h4 className="text-base font-black text-white uppercase tracking-wider">
                  Drop Bank Statement CSV Here
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Supports Chase, Amex, Capital One, Wells Fargo, Bank of America, HDFC, Revolut, Monzo, and generic bank CSV files.
                </p>
              </div>
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl bg-tech-lime text-black font-black uppercase text-xs tracking-wider group-hover:brightness-110 transition-all shadow-[0_0_15px_rgba(165,243,68,0.2)]"
              >
                Browse CSV File
              </button>
            </div>

            {/* Quick Demo Pre-Loads */}
            <div className="max-w-xl mx-auto w-full space-y-3 pt-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono justify-center">
                <span>Or test immediately with built-in statement templates:</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => parseCsvText(SAMPLE_CSV_CHASE, 'chase_sample.csv')}
                  className="p-3.5 rounded-2xl bg-tech-card clay-card border border-white/10 hover:border-tech-lime/40 text-left transition-all group space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-tech-lime">
                      Chase Checking Sample
                    </span>
                    <Download size={14} className="text-slate-500 group-hover:text-tech-lime" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">8 Rows • Mixed Debit / Credit • Auto Headers</p>
                </button>

                <button
                  type="button"
                  onClick={() => parseCsvText(SAMPLE_CSV_AMEX, 'amex_sample.csv')}
                  className="p-3.5 rounded-2xl bg-tech-card clay-card border border-white/10 hover:border-tech-lime/40 text-left transition-all group space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white uppercase tracking-wider group-hover:text-tech-lime">
                      Amex Credit Card Sample
                    </span>
                    <Download size={14} className="text-slate-500 group-hover:text-tech-lime" />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">6 Rows • Cardholder Charges • Auto Headers</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW & AI CATEGORIZATION TABLE */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="px-6 py-3 bg-tech-inset/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{parsedRows.every(r => r.selected) ? 'Deselect All' : 'Select All'}</span>
                </button>

                {/* Filter pill buttons */}
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 text-[11px] font-mono">
                  <button
                    onClick={() => setFilterType('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors",
                      filterType === 'all' ? "bg-tech-card text-tech-lime font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors",
                      filterType === 'expense' ? "bg-tech-card text-rose-400 font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Expenses
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg transition-colors",
                      filterType === 'income' ? "bg-tech-card text-emerald-400 font-bold" : "text-slate-400 hover:text-white"
                    )}
                  >
                    Income
                  </button>
                  {duplicateCount > 0 && (
                    <button
                      onClick={() => setFilterType('duplicates')}
                      className={cn(
                        "px-2.5 py-1 rounded-lg transition-colors text-amber-400",
                        filterType === 'duplicates' ? "bg-tech-card font-bold" : "hover:text-amber-300"
                      )}
                    >
                      Duplicates ({duplicateCount})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search rows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-tech-card border border-white/10 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-tech-lime w-40 sm:w-52"
                  />
                </div>

                {/* AI Auto-Categorize Button */}
                <button
                  type="button"
                  onClick={handleAiAutoCategorize}
                  disabled={isCategorizingAi}
                  className="px-4 py-2 bg-tech-lime/20 border border-tech-lime/40 text-tech-lime hover:bg-tech-lime hover:text-black font-black uppercase text-xs tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(165,243,68,0.15)] disabled:opacity-50"
                >
                  {isCategorizingAi ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>AI Classifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Gemini Auto-Categorize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-tech-header/95 backdrop-blur border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Select</th>
                    <th className="py-3 px-4 w-28">Date</th>
                    <th className="py-3 px-4">Merchant / Description</th>
                    <th className="py-3 px-4 w-36">Category</th>
                    <th className="py-3 px-4 w-24">Type</th>
                    <th className="py-3 px-4 w-32 text-right">Amount</th>
                    <th className="py-3 px-4 w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-white/5 transition-colors group",
                        row.selected ? "bg-tech-lime/[0.02]" : "opacity-60",
                        row.isDuplicate && "bg-amber-500/[0.03]"
                      )}
                    >
                      {/* Select Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleToggleRow(row.id)}
                          className="w-4 h-4 rounded border-white/20 text-tech-lime focus:ring-0 focus:ring-offset-0 bg-tech-inset cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleUpdateRowField(row.id, 'date', e.target.value)}
                          className="bg-transparent text-slate-300 text-xs font-mono focus:outline-none focus:text-white"
                        />
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => handleUpdateRowField(row.id, 'description', e.target.value)}
                            className="bg-transparent text-white font-medium text-xs focus:outline-none focus:border-b focus:border-tech-lime w-full"
                          />
                          {row.isAiEnhanced && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-tech-lime/20 text-tech-lime border border-tech-lime/30 shrink-0">
                              AI Cleaned
                            </span>
                          )}
                          {row.isDuplicate && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 flex items-center gap-1">
                              <AlertTriangle size={9} /> Duplicate?
                            </span>
                          )}
                        </div>
                        {row.rawDescription !== row.description && (
                          <span className="text-[9px] text-slate-500 block truncate">
                            Raw: {row.rawDescription}
                          </span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <select
                          value={row.category}
                          onChange={(e) => handleUpdateRowField(row.id, 'category', e.target.value)}
                          className="px-2 py-1 bg-tech-inset border border-white/10 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-tech-lime"
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>

                      {/* Type toggle */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleUpdateRowField(row.id, 'type', row.type === 'expense' ? 'income' : 'expense')}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            row.type === 'expense'
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          )}
                        >
                          {row.type}
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className={cn(
                            "font-black text-sm",
                            row.type === 'expense' ? "text-slate-100" : "text-emerald-400"
                          )}>
                            {row.type === 'expense' ? '-' : '+'}${row.amount.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRows.length === 0 && (
                <div className="p-12 text-center text-slate-500 font-mono text-xs">
                  No statement transactions match the active filter.
                </div>
              )}
            </div>

            {/* Bottom Ingest Action Bar */}
            <div className="px-6 py-4 bg-tech-header border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Selected Rows</span>
                  <span className="text-white font-bold text-sm">
                    {selectedCount} of {parsedRows.length}
                  </span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Outflow</span>
                  <span className="text-rose-400 font-bold text-sm">
                    -${totalSelectedOutflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Total Inflow</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    +${totalSelectedInflow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Change File
                </button>
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={handleExecuteImport}
                  className="flex-1 sm:flex-initial px-6 py-2.5 bg-tech-lime text-black font-black uppercase text-xs tracking-wider rounded-xl hover:brightness-110 disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(165,243,68,0.3)] flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  <span>Import {selectedCount} Transactions to Ledger</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
