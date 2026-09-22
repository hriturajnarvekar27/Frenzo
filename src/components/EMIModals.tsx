import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  IndianRupee, 
  Calendar, 
  Clock, 
  Plus, 
  Calculator,
  TrendingUp,
  Building2,
  Smartphone,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  Trash2,
  Download,
  Share2,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OperationType, UserPreferences, EMIScheduleItem, EMI, EMIPayment } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';

interface ModalProps {
  onClose: () => void;
  uid: string;
  preferences: UserPreferences;
  handleFirestoreError: (error: any, operation: OperationType, path: string) => void;
}

interface ReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  emi: EMI;
  payment: EMIPayment;
  preferences: UserPreferences;
}

export function PaymentReceiptModal({ isOpen, onClose, emi, payment, preferences }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (receiptRef.current) {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `receipt-${emi.title.toLowerCase().replace(/\s+/g, '-')}-${payment.installmentNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  const handleShare = async () => {
    if (receiptRef.current) {
      try {
        const canvas = await html2canvas(receiptRef.current, {
          backgroundColor: '#0a0a0a',
          scale: 2,
          logging: false,
          useCORS: true,
        });

        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const file = new File([blob], 'receipt.png', { type: 'image/png' });
          
          // Check if sharing is supported and files can be shared
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'Payment Receipt',
                text: `Receipt for ${emi.title} - Installment #${payment.installmentNumber}`,
              });
            } catch (err) {
              if ((err as Error).name !== 'AbortError') {
                console.error('Error sharing:', err);
                handleDownload(); // Fallback to download
              }
            }
          } else {
            // Fallback: Download the image
            handleDownload();
            alert('Sharing not supported on this browser. Receipt has been downloaded instead.');
          }
        });
      } catch (error) {
        console.error('Canvas generation failed:', error);
        alert('Failed to generate receipt image. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg flex flex-col gap-6"
      >
        {/* Receipt Card */}
        <div 
          ref={receiptRef}
          className={cn(
            "bg-tech-card border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-10 space-y-8",
            preferences.glassMode && "bg-white/5 backdrop-blur-2xl"
          )}
        >
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-tech-lime/20 rounded-full flex items-center justify-center mx-auto border border-tech-lime/30">
              <CheckCircle2 className="w-10 h-10 text-tech-lime" />
            </div>
            <div>
              <h3 className="font-brand text-3xl text-tech-white tracking-tighter uppercase">Payment Receipt</h3>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Transaction Authorized & Verified</p>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/5" />
            <div className="w-2 h-2 rounded-full bg-tech-lime/50 shadow-[0_0_10px_rgba(165,243,68,0.5)]" />
            <div className="h-px flex-1 bg-white/5" />
          </div>

          {/* Details Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">EMI Title</p>
                <p className="text-sm font-bold text-tech-white">{emi.title}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Installment</p>
                <p className="text-sm font-bold text-tech-lime">#{payment.installmentNumber} of {emi.tenure}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Source</p>
                <p className="text-sm font-bold text-tech-white">{emi.source}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Payment Date</p>
                <p className="text-sm font-bold text-tech-white">{format(payment.date.toDate(), 'dd MMM yyyy')}</p>
              </div>
            </div>

            <div className="bg-tech-inset p-6 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Amount Paid</p>
                <p className="text-3xl font-brand text-tech-lime">₹{payment.amount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                <p className="text-xs font-black text-tech-lime uppercase tracking-widest">Success</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-white/5">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Generated by FinTech Matrix v2.0</p>
            <p className="text-[6px] text-slate-700 mt-1 uppercase tracking-widest">Ref: {payment.id?.slice(-12).toUpperCase()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-tech-gray/50 hover:bg-tech-gray text-tech-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-white/5 order-3 sm:order-1"
          >
            Close
          </button>
          
          <button
            onClick={handleShare}
            className="flex-1 py-4 bg-tech-orange/20 text-tech-orange rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-tech-orange/30 transition-all border border-tech-orange/30 flex items-center justify-center gap-2 order-2"
          >
            <Share2 size={14} />
            Share Receipt
          </button>

          <button
            onClick={handleDownload}
            className="flex-1 py-4 bg-tech-lime text-tech-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)] flex items-center justify-center gap-2 order-1 sm:order-3"
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function AddEMIModal({ onClose, uid, preferences, handleFirestoreError }: ModalProps) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('Bank');
  const [principal, setPrincipal] = useState('');
  const [interest, setInterest] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [customSchedule, setCustomSchedule] = useState<EMIScheduleItem[]>([]);

  const sources = [
    { id: 'Bank', icon: Building2, label: 'Bank' },
    { id: 'App', icon: Smartphone, label: 'App' },
    { id: 'Person', icon: User, label: 'Person' },
    { id: 'Other', icon: CreditCard, label: 'Other' }
  ];

  useEffect(() => {
    if (isCustomSchedule && tenure) {
      const t = parseInt(tenure);
      if (isNaN(t) || t <= 0) return;

      // Only re-initialize if tenure changed or schedule is empty
      if (customSchedule.length !== t) {
        const p = parseFloat(principal || '0');
        const i = parseFloat(interest || '0');
        const total = p + i;
        const monthly = Math.round(total / t);
        
        const newSchedule: EMIScheduleItem[] = [];
        const start = new Date(startDate);
        
        for (let j = 1; j <= t; j++) {
          const dueDate = new Date(start);
          dueDate.setMonth(dueDate.getMonth() + j);
          newSchedule.push({
            installmentNumber: j,
            amount: monthly,
            dueDate: Timestamp.fromDate(dueDate),
            status: 'pending'
          });
        }
        setCustomSchedule(newSchedule);
      }
    } else if (!isCustomSchedule) {
      setCustomSchedule([]);
    }
  }, [isCustomSchedule, tenure, principal, interest, startDate]);

  const handleScheduleAmountChange = (index: number, amount: string) => {
    const newSchedule = [...customSchedule];
    newSchedule[index].amount = parseFloat(amount) || 0;
    setCustomSchedule(newSchedule);
  };

  const handleScheduleDateChange = (index: number, date: string) => {
    const newSchedule = [...customSchedule];
    newSchedule[index].dueDate = Timestamp.fromDate(new Date(date));
    setCustomSchedule(newSchedule);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !principal || !tenure) return;

    setIsSubmitting(true);
    try {
      const p = parseFloat(principal);
      const i = parseFloat(interest || '0');
      const t = parseInt(tenure);
      
      let total = p + i;
      let monthly = total / t;
      
      if (isCustomSchedule) {
        total = customSchedule.reduce((sum, item) => sum + item.amount, 0);
        monthly = customSchedule[0]?.amount || 0;
      }
      
      const start = new Date(startDate);
      const nextDue = isCustomSchedule && customSchedule[0] 
        ? customSchedule[0].dueDate.toDate()
        : new Date(startDate);
      
      if (!isCustomSchedule) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      await addDoc(collection(db, 'emis'), {
        title,
        source,
        principalAmount: p,
        interestAmount: i,
        totalAmount: total,
        monthlyInstallment: monthly,
        tenure: t,
        paidInstallments: 0,
        startDate: Timestamp.fromDate(start),
        nextDueDate: Timestamp.fromDate(nextDue),
        status: 'active',
        uid,
        ...(isCustomSchedule ? { monthlySchedule: customSchedule } : {})
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'emis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          "relative w-full max-w-2xl bg-tech-card border border-white/10 overflow-hidden shadow-2xl rounded-[2.5rem] max-h-[90vh] flex flex-col",
          preferences.glassMode && "bg-white/5 backdrop-blur-2xl"
        )}
      >
        <div className="p-8 md:p-10 border-b border-white/5 bg-tech-gray/30 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-brand text-3xl md:text-4xl text-tech-white tracking-tighter leading-none mb-2">Manual <span className="text-tech-lime">EMI</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Initialize manual installment log</p>
          </div>
          <button onClick={onClose} className="p-3 bg-tech-gray/50 hover:bg-tech-red/20 text-slate-500 hover:text-tech-red rounded-2xl transition-all border border-white/5">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
          <form id="emi-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">EMI Title</label>
                <div className="relative">
                  <CreditCard size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Home Loan, iPhone EMI"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Source</label>
                <div className="grid grid-cols-4 gap-2">
                  {sources.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSource(s.id)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all",
                        source === s.id 
                          ? "bg-tech-lime text-tech-black border-tech-lime shadow-lg shadow-tech-lime/20" 
                          : "bg-tech-inset text-slate-500 border-white/5 hover:border-white/20"
                      )}
                    >
                      <s.icon size={16} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Principal</label>
                <div className="relative">
                  <IndianRupee size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={principal}
                    onChange={(e) => setPrincipal(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Total Interest</label>
                <div className="relative">
                  <TrendingUp size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Tenure (Months)</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    placeholder="12"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Start Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                  required
                />
              </div>
            </div>

            {/* Custom Schedule Toggle */}
            <div className="flex items-center justify-between p-6 bg-tech-inset rounded-2xl border border-white/5">
              <div>
                <h4 className="text-sm font-bold text-tech-white tracking-tight">Custom Monthly Schedule</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Define different amounts for each month</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomSchedule(!isCustomSchedule)}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300",
                  isCustomSchedule ? "bg-tech-lime" : "bg-tech-gray"
                )}
              >
                <motion.div
                  animate={{ x: isCustomSchedule ? 24 : 4 }}
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
                />
              </button>
            </div>

            {/* Custom Schedule List */}
            <AnimatePresence>
              {isCustomSchedule && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Monthly Breakdown</label>
                  <div className="space-y-3">
                    {customSchedule.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1 text-center font-brand text-tech-lime text-lg">
                          {item.installmentNumber}
                        </div>
                        <div className="col-span-6 relative">
                          <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleScheduleAmountChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white text-xs"
                          />
                        </div>
                        <div className="col-span-5 relative">
                          <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="date"
                            value={item.dueDate.toDate().toISOString().split('T')[0]}
                            onChange={(e) => handleScheduleDateChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-tech-lime/5 p-6 rounded-2xl border border-tech-lime/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-tech-lime/10 rounded-xl text-tech-lime">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    {isCustomSchedule ? 'First Installment' : 'Estimated Monthly Installment'}
                  </p>
                  <p className="text-2xl font-brand text-tech-lime">
                    ₹{isCustomSchedule 
                      ? (customSchedule[0]?.amount || 0).toLocaleString()
                      : (principal && tenure ? Math.round((parseFloat(principal) + parseFloat(interest || '0')) / parseInt(tenure)).toLocaleString() : '0')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Liability</p>
                <p className="text-lg font-brand text-tech-white">
                  ₹{isCustomSchedule 
                    ? customSchedule.reduce((sum, item) => sum + item.amount, 0).toLocaleString()
                    : (principal ? (parseFloat(principal) + parseFloat(interest || '0')).toLocaleString() : '0')}
                </p>
              </div>
            </div>
          </form>
        </div>

        <div className="p-8 md:p-10 border-t border-white/5 shrink-0">
          <button
            form="emi-form"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-tech-lime text-tech-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_40px_rgba(165,243,68,0.25)] flex items-center justify-center gap-4"
          >
            {isSubmitting ? 'Initializing Matrix...' : 'Authorize EMI Entry'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CreateEMIModal({ onClose, uid, preferences, handleFirestoreError }: ModalProps) {
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('Person');
  const [amount, setAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenure, setTenure] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [customSchedule, setCustomSchedule] = useState<EMIScheduleItem[]>([]);

  const calculateEMI = () => {
    const P = parseFloat(amount);
    const R = parseFloat(interestRate) / 12 / 100;
    const N = parseInt(tenure);
    
    if (!P || !N) return 0;
    if (!R) return P / N;
    
    const emi = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
    return Math.round(emi);
  };

  const emiValue = calculateEMI();
  const totalAmount = emiValue * parseInt(tenure || '0');
  const totalInterest = totalAmount - parseFloat(amount || '0');

  useEffect(() => {
    if (isCustomSchedule && tenure) {
      const t = parseInt(tenure);
      if (isNaN(t) || t <= 0) return;

      // Only re-initialize if tenure changed or schedule is empty
      if (customSchedule.length !== t) {
        const monthly = emiValue;
        
        const newSchedule: EMIScheduleItem[] = [];
        const start = new Date(startDate);
        
        for (let j = 1; j <= t; j++) {
          const dueDate = new Date(start);
          dueDate.setMonth(dueDate.getMonth() + j);
          newSchedule.push({
            installmentNumber: j,
            amount: monthly,
            dueDate: Timestamp.fromDate(dueDate),
            status: 'pending'
          });
        }
        setCustomSchedule(newSchedule);
      }
    } else if (!isCustomSchedule) {
      setCustomSchedule([]);
    }
  }, [isCustomSchedule, tenure, emiValue, startDate]);

  const handleScheduleAmountChange = (index: number, amount: string) => {
    const newSchedule = [...customSchedule];
    newSchedule[index].amount = parseFloat(amount) || 0;
    setCustomSchedule(newSchedule);
  };

  const handleScheduleDateChange = (index: number, date: string) => {
    const newSchedule = [...customSchedule];
    newSchedule[index].dueDate = Timestamp.fromDate(new Date(date));
    setCustomSchedule(newSchedule);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !tenure) return;

    setIsSubmitting(true);
    try {
      const start = new Date(startDate);
      const nextDue = isCustomSchedule && customSchedule[0] 
        ? customSchedule[0].dueDate.toDate()
        : new Date(startDate);
      
      if (!isCustomSchedule) {
        nextDue.setMonth(nextDue.getMonth() + 1);
      }

      const finalTotal = isCustomSchedule 
        ? customSchedule.reduce((sum, item) => sum + item.amount, 0)
        : totalAmount;

      await addDoc(collection(db, 'emis'), {
        title,
        source,
        principalAmount: parseFloat(amount),
        interestAmount: isCustomSchedule ? (finalTotal - parseFloat(amount)) : totalInterest,
        totalAmount: finalTotal,
        monthlyInstallment: isCustomSchedule ? (customSchedule[0]?.amount || emiValue) : emiValue,
        tenure: parseInt(tenure),
        paidInstallments: 0,
        startDate: Timestamp.fromDate(start),
        nextDueDate: Timestamp.fromDate(nextDue),
        status: 'active',
        uid,
        ...(isCustomSchedule ? { monthlySchedule: customSchedule } : {})
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'emis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={cn(
          "relative w-full max-w-2xl bg-tech-card border border-white/10 overflow-hidden shadow-2xl rounded-[2.5rem] max-h-[90vh] flex flex-col",
          preferences.glassMode && "bg-white/5 backdrop-blur-2xl"
        )}
      >
        <div className="p-8 md:p-10 border-b border-white/5 bg-tech-gray/30 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-brand text-3xl md:text-4xl text-tech-white tracking-tighter leading-none mb-2">Break into <span className="text-tech-orange">EMI</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Convert liability into installments</p>
          </div>
          <button onClick={onClose} className="p-3 bg-tech-gray/50 hover:bg-tech-red/20 text-slate-500 hover:text-tech-red rounded-2xl transition-all border border-white/5">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar">
          <form id="create-emi-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Liability Title</label>
                <div className="relative">
                  <Info size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Loan from Friend"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Source</label>
                <div className="relative">
                  <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="e.g. Rahul, HDFC"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Total Amount</label>
                <div className="relative">
                  <IndianRupee size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Interest Rate (%)</label>
                <div className="relative">
                  <TrendingUp size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    placeholder="10"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Tenure (Months)</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    value={tenure}
                    onChange={(e) => setTenure(e.target.value)}
                    placeholder="12"
                    className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Start Date</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                  required
                />
              </div>
            </div>

            {/* Custom Schedule Toggle */}
            <div className="flex items-center justify-between p-6 bg-tech-inset rounded-2xl border border-white/5">
              <div>
                <h4 className="text-sm font-bold text-tech-white tracking-tight">Custom Monthly Schedule</h4>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Define different amounts for each month</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomSchedule(!isCustomSchedule)}
                className={cn(
                  "w-14 h-8 rounded-full relative transition-all duration-300",
                  isCustomSchedule ? "bg-tech-lime" : "bg-tech-gray"
                )}
              >
                <motion.div
                  animate={{ x: isCustomSchedule ? 24 : 4 }}
                  className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-lg"
                />
              </button>
            </div>

            {/* Custom Schedule List */}
            <AnimatePresence>
              {isCustomSchedule && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Monthly Breakdown</label>
                  <div className="space-y-3">
                    {customSchedule.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-1 text-center font-brand text-tech-lime text-lg">
                          {item.installmentNumber}
                        </div>
                        <div className="col-span-6 relative">
                          <IndianRupee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => handleScheduleAmountChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-xl outline-none transition-all font-black text-tech-white text-xs"
                          />
                        </div>
                        <div className="col-span-5 relative">
                          <Calendar size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="date"
                            value={item.dueDate.toDate().toISOString().split('T')[0]}
                            onChange={(e) => handleScheduleDateChange(index, e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-xl outline-none transition-all font-black text-tech-white text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-tech-orange/5 p-6 rounded-2xl border border-tech-orange/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-tech-orange/10 rounded-xl text-tech-orange">
                  <Calculator size={20} />
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                    {isCustomSchedule ? 'First Installment' : 'Calculated Monthly EMI'}
                  </p>
                  <p className="text-2xl font-brand text-tech-orange">
                    ₹{isCustomSchedule 
                      ? (customSchedule[0]?.amount || 0).toLocaleString()
                      : emiValue.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Repayment</p>
                <p className="text-lg font-brand text-tech-white">
                  ₹{isCustomSchedule 
                    ? customSchedule.reduce((sum, item) => sum + item.amount, 0).toLocaleString()
                    : totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </form>
        </div>

        <div className="p-8 md:p-10 border-t border-white/5 shrink-0">
          <button
            form="create-emi-form"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-6 bg-tech-orange text-tech-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_40px_rgba(255,107,0,0.25)] flex items-center justify-center gap-4"
          >
            {isSubmitting ? 'Breaking Matrix...' : 'Confirm EMI Breakdown'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
