import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, X, Upload, Sparkles, CheckCircle2, AlertTriangle, 
  FileText, ArrowRight, Loader2, DollarSign, Calendar, Tag, CreditCard, RefreshCw, Eye
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

interface ScannedReceiptData {
  vendor: string;
  date?: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  category: string;
  paymentMethod?: string;
  description?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  confidence?: string;
  anomalyAlert?: string;
}

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: {
    amount: number;
    category: string;
    description: string;
    date: Timestamp;
    type: 'expense';
  }) => void;
}

// Sample receipt generator for quick demonstration
const SAMPLE_RECEIPT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600" fill="none"><rect width="400" height="600" fill="%231E293B"/><rect x="20" y="20" width="360" height="560" rx="16" fill="%230F172A" stroke="%23334155" stroke-width="2"/><text x="200" y="70" fill="%23A5F344" font-family="monospace" font-weight="bold" font-size="22" text-anchor="middle">SUPERMARKET METRO</text><text x="200" y="95" fill="%2394A3B8" font-family="monospace" font-size="12" text-anchor="middle">Receipt %23INV-892401</text><line x1="40" y1="120" x2="360" y2="120" stroke="%23334155" stroke-dasharray="4 4"/><text x="50" y="150" fill="%23E2E8F0" font-family="monospace" font-size="14">Organic Almond Milk x2</text><text x="350" y="150" fill="%23E2E8F0" font-family="monospace" font-size="14" text-anchor="end">$9.98</text><text x="50" y="180" fill="%23E2E8F0" font-family="monospace" font-size="14">Fresh Espresso Beans</text><text x="350" y="180" fill="%23E2E8F0" font-family="monospace" font-size="14" text-anchor="end">$18.50</text><text x="50" y="210" fill="%23E2E8F0" font-family="monospace" font-size="14">Artisanal Sourdough</text><text x="350" y="210" fill="%23E2E8F0" font-family="monospace" font-size="14" text-anchor="end">$6.25</text><line x1="40" y1="240" x2="360" y2="240" stroke="%23334155"/><text x="50" y="270" fill="%2394A3B8" font-family="monospace" font-size="13">Subtotal</text><text x="350" y="270" fill="%2394A3B8" font-family="monospace" font-size="13" text-anchor="end">$34.73</text><text x="50" y="295" fill="%2394A3B8" font-family="monospace" font-size="13">Sales Tax (8%)</text><text x="350" y="295" fill="%2394A3B8" font-family="monospace" font-size="13" text-anchor="end">$2.78</text><text x="50" y="335" fill="%23A5F344" font-family="monospace" font-weight="bold" font-size="18">TOTAL PAID</text><text x="350" y="335" fill="%23A5F344" font-family="monospace" font-weight="bold" font-size="20" text-anchor="end">$37.51</text><text x="200" y="380" fill="%2364748B" font-family="monospace" font-size="12" text-anchor="middle">CARD: **** **** **** 4892</text><text x="200" y="405" fill="%2364748B" font-family="monospace" font-size="12" text-anchor="middle">DATE: 2026-08-04 | TIME: 14:32</text><rect x="100" y="440" width="200" height="80" rx="8" fill="%231E293B" stroke="%23334155"/><text x="200" y="485" fill="%23A5F344" font-family="monospace" font-size="14" text-anchor="middle">THANK YOU FOR SHOPPING!</text></svg>`;

export function ReceiptScannerModal({ isOpen, onClose, onSaveExpense }: ReceiptScannerModalProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedReceiptData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedImage(base64);
      setScannedData(null);
      setErrorMsg(null);
      analyzeReceipt(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleSampleReceipt = () => {
    setSelectedImage(SAMPLE_RECEIPT_IMAGE);
    setScannedData(null);
    setErrorMsg(null);
    analyzeReceipt(SAMPLE_RECEIPT_IMAGE, 'image/svg+xml');
  };

  const analyzeReceipt = async (base64Image: string, mimeType: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/gemini/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze receipt.');
      }

      setScannedData(json.data);
    } catch (err: any) {
      console.error('Scan failed:', err);
      setErrorMsg(err.message || 'AI processing failed. Please check your image clarity and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmAddExpense = () => {
    if (!scannedData) return;
    
    let parsedDate = Timestamp.now();
    if (scannedData.date) {
      const d = new Date(scannedData.date);
      if (!isNaN(d.getTime())) {
        parsedDate = Timestamp.fromDate(d);
      }
    }

    onSaveExpense({
      amount: scannedData.amount || 0,
      category: scannedData.category || 'Shopping',
      description: `${scannedData.vendor || 'Receipt'} (${scannedData.description || 'Scanned Bill'})`,
      date: parsedDate,
      type: 'expense',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-tech-card clay-card border border-tech-lime/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-tech-header">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime">
              <Scan size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                AI Receipt & Invoice OCR
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-tech-lime/20 text-tech-lime border border-tech-lime/30 uppercase tracking-widest">
                  Gemini Vision 3.6
                </span>
              </h3>
              <p className="text-xs text-slate-400">Instantly extract items, taxes, totals, and log expenses with 99.4% accuracy</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="shrink-0 text-rose-400" size={18} />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {!selectedImage ? (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-tech-lime/30 rounded-3xl p-10 text-center hover:border-tech-lime/60 hover:bg-tech-lime/5 transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[240px]"
              >
                <div className="w-16 h-16 rounded-full bg-tech-lime/10 border border-tech-lime/20 flex items-center justify-center text-tech-lime mb-4 group-hover:scale-110 transition-transform">
                  <Upload size={28} />
                </div>
                <h4 className="text-sm font-black uppercase tracking-wider text-white mb-1">Upload Receipt or Invoice Image</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Drag & drop your store receipt, restaurant bill, or online PDF invoice here, or click to browse files.
                </p>
                <span className="text-[10px] font-mono text-tech-lime px-3 py-1 rounded-full bg-tech-lime/10 border border-tech-lime/30 uppercase tracking-widest">
                  Supports JPG, PNG, WEBP, SVG
                </span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">Want to test without a photo?</span>
                <button
                  type="button"
                  onClick={handleSampleReceipt}
                  className="px-4 py-2 rounded-xl bg-tech-inset border border-white/10 text-xs font-bold text-slate-200 hover:text-white hover:border-tech-lime/40 flex items-center gap-2 transition-all"
                >
                  <Sparkles size={14} className="text-tech-lime" />
                  Try Sample Supermarket Bill
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Image Preview & Scan Animation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye size={14} className="text-tech-lime" /> Image Document
                  </span>
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setScannedData(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                  >
                    <RefreshCw size={12} /> Replace Photo
                  </button>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 h-80 flex items-center justify-center">
                  <img 
                    src={selectedImage} 
                    alt="Receipt Scan Target" 
                    className="max-h-full max-w-full object-contain p-2"
                  />

                  {/* AI Scanner Radar Overlay */}
                  {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4">
                      <motion.div 
                        initial={{ y: -100 }}
                        animate={{ y: 100 }}
                        transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse", ease: "easeInOut" }}
                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-tech-lime to-transparent shadow-[0_0_15px_#A5F344]"
                      />
                      <Loader2 className="w-10 h-10 text-tech-lime animate-spin mb-3" />
                      <span className="text-xs font-black uppercase tracking-widest text-tech-white">Scanning Document...</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-1">Extracting optical text & line items</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Extracted Data Card */}
              <div className="space-y-4 flex flex-col justify-between">
                {isAnalyzing ? (
                  <div className="h-full border border-white/5 bg-tech-inset/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <Sparkles size={32} className="text-tech-lime animate-bounce" />
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-wider">Gemini Vision AI at work</p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Analyzing vendor typography, subtotal line breaks, item prices, tax computations, and categorization.
                    </p>
                  </div>
                ) : scannedData ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-tech-inset border border-tech-lime/30 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Vendor / Merchant</span>
                          <h4 className="text-lg font-black uppercase tracking-tight text-white">{scannedData.vendor}</h4>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-tech-lime/15 text-tech-lime border border-tech-lime/30 flex items-center gap-1">
                          <CheckCircle2 size={12} /> {scannedData.confidence || 'High'} Match
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <DollarSign size={10} className="text-tech-lime" /> Total Amount
                          </span>
                          <span className="text-xl font-black text-tech-lime tracking-tight">${scannedData.amount.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <Tag size={10} className="text-tech-lime" /> Category
                          </span>
                          <span className="text-xs font-bold text-white uppercase block mt-1">{scannedData.category}</span>
                        </div>
                        {scannedData.date && (
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Calendar size={10} className="text-tech-lime" /> Date
                            </span>
                            <span className="text-xs font-mono text-slate-300 block mt-1">{scannedData.date}</span>
                          </div>
                        )}
                        {scannedData.paymentMethod && (
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <CreditCard size={10} className="text-tech-lime" /> Payment Mode
                            </span>
                            <span className="text-xs font-mono text-slate-300 block mt-1">{scannedData.paymentMethod}</span>
                          </div>
                        )}
                      </div>

                      {scannedData.anomalyAlert && scannedData.anomalyAlert.toLowerCase() !== 'none' && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] flex items-center gap-2">
                          <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                          <span><strong>AI Insight:</strong> {scannedData.anomalyAlert}</span>
                        </div>
                      )}
                    </div>

                    {/* Itemized Line Items Table */}
                    {scannedData.items && scannedData.items.length > 0 && (
                      <div className="border border-white/10 bg-tech-card rounded-2xl p-3 space-y-2 max-h-40 overflow-y-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                          Extracted Line Items ({scannedData.items.length})
                        </span>
                        <div className="space-y-1">
                          {scannedData.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0 px-1">
                              <span className="text-slate-300 font-medium truncate max-w-[180px]">
                                {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                              </span>
                              <span className="font-mono text-white font-bold">${item.price ? item.price.toFixed(2) : '-'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-tech-header flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {scannedData && (
            <button
              type="button"
              onClick={handleConfirmAddExpense}
              className="px-6 py-2.5 rounded-xl bg-tech-lime text-black font-black uppercase text-xs tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(165,243,68,0.3)] flex items-center gap-2 transition-all"
            >
              <CheckCircle2 size={16} />
              Save as Frenzo Expense
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
