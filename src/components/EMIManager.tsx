import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ChevronRight,
  TrendingUp,
  History,
  Calculator,
  ArrowRight,
  Info,
  X,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { EMI, EMIPayment, OperationType, UserPreferences } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal';
import { PaymentReceiptModal } from './EMIModals';

interface EMIManagerProps {
  emis: EMI[];
  emiPayments: EMIPayment[];
  user: any;
  preferences: UserPreferences;
  handleFirestoreError: (error: any, operation: OperationType, path: string) => void;
  setShowAddEMIModal: (show: boolean) => void;
  setShowCreateEMIModal: (show: boolean) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export default function EMIManager({ 
  emis, 
  emiPayments, 
  user, 
  preferences,
  handleFirestoreError,
  setShowAddEMIModal,
  setShowCreateEMIModal
}: EMIManagerProps) {
  const [selectedEmi, setSelectedEmi] = useState<EMI | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [emiToDelete, setEmiToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<EMIPayment | null>(null);

  const activeEmis = emis.filter(e => e.status === 'active');
  const completedEmis = emis.filter(e => e.status === 'completed');

  const displayEmis = activeTab === 'active' ? activeEmis : completedEmis;

  const totalMonthlyEmi = activeEmis.reduce((sum, e) => sum + e.monthlyInstallment, 0);
  const totalRemainingAmount = activeEmis.reduce((sum, e) => {
    const paidAmount = emiPayments
      .filter(p => p.emiId === e.id)
      .reduce((s, p) => s + p.amount, 0);
    return sum + (e.totalAmount - paidAmount);
  }, 0);

  const handlePayInstallment = async (emi: EMI) => {
    if (!user) return;
    
    try {
      const installmentNumber = emi.paidInstallments + 1;
      const paymentDate = Timestamp.now();
      
      let paymentAmount = emi.monthlyInstallment;
      let nextDueDate = new Date(emi.nextDueDate.toDate());
      
      // Handle custom schedule if exists
      if (emi.monthlySchedule && emi.monthlySchedule.length > 0) {
        const currentInstallment = emi.monthlySchedule.find(s => s.installmentNumber === installmentNumber);
        if (currentInstallment) {
          paymentAmount = currentInstallment.amount;
        }
        
        const nextInstallment = emi.monthlySchedule.find(s => s.installmentNumber === installmentNumber + 1);
        if (nextInstallment) {
          nextDueDate = nextInstallment.dueDate.toDate();
        } else {
          // If no next installment in schedule, just increment month as fallback
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }
      } else {
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }
      
      // 1. Add payment record
      await addDoc(collection(db, 'emiPayments'), {
        emiId: emi.id,
        amount: paymentAmount,
        date: paymentDate,
        installmentNumber,
        uid: user.uid
      });

      // 2. Update EMI record
      const isCompleted = installmentNumber >= emi.tenure;

      await updateDoc(doc(db, 'emis', emi.id!), {
        paidInstallments: installmentNumber,
        nextDueDate: Timestamp.fromDate(nextDueDate),
        status: isCompleted ? 'completed' : 'active',
        // Update schedule status if exists
        ...(emi.monthlySchedule ? {
          monthlySchedule: emi.monthlySchedule.map(s => 
            s.installmentNumber === installmentNumber ? { ...s, status: 'paid' } : s
          )
        } : {})
      });

      // 3. Add to transactions as expense
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        amount: paymentAmount,
        category: 'EMI',
        date: paymentDate,
        description: `EMI Payment: ${emi.title} (${installmentNumber}/${emi.tenure})`,
        uid: user.uid
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'emiPayments');
    }
  };

  const handleDeleteEmi = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'emis', id));
      if (selectedEmi?.id === id) setSelectedEmi(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'emis');
    }
  };

  return (
    <div className="mt-12 md:mt-16 space-y-12">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h3 className="font-brand text-3xl md:text-5xl text-tech-white tracking-tighter leading-none mb-2">EMI Matrix</h3>
          <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Installment & Liability Management.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={() => setShowCreateEMIModal(true)}
            className="flex items-center gap-3 px-6 py-4 bg-tech-orange/10 hover:bg-tech-orange/20 text-tech-orange rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-tech-orange/20 shadow-lg"
          >
            <Calculator size={18} />
            Break into EMI
          </button>
          <button
            onClick={() => setShowAddEMIModal(true)}
            className="flex items-center gap-3 px-6 py-4 bg-tech-lime text-tech-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(165,243,68,0.3)] hover:scale-105 active:scale-95"
          >
            <Plus size={18} />
            Add Manual EMI
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-tech-card clay-card p-8 border-tech-lime/20 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-tech-lime/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Monthly Commitment</span>
            <h4 className="font-brand text-3xl md:text-4xl text-tech-lime tracking-tighter">{formatCurrency(totalMonthlyEmi)}</h4>
            <div className="mt-4 flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <Clock size={12} />
              <span>Next cycle in {format(new Date().setDate(1), 'MMM')}</span>
            </div>
          </div>
        </div>

        <div className="bg-tech-card clay-card p-8 border-tech-orange/20 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-tech-orange/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Outstanding</span>
            <h4 className="font-brand text-3xl md:text-4xl text-tech-orange tracking-tighter">{formatCurrency(totalRemainingAmount)}</h4>
            <div className="mt-4 flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <AlertCircle size={12} />
              <span>{activeEmis.length} Active Liabilities</span>
            </div>
          </div>
        </div>

        <div className="bg-tech-card clay-card p-8 border-white/5 relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-tech-white/5 rounded-full blur-3xl" />
          <div className="relative z-10">
            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Completed EMIs</span>
            <h4 className="font-brand text-3xl md:text-4xl text-tech-white tracking-tighter">{completedEmis.length}</h4>
            <div className="mt-4 flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <CheckCircle2 size={12} className="text-tech-lime" />
              <span>Financial Discipline</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* EMI List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveTab('active')}
                className={cn(
                  "font-brand text-xl tracking-tighter uppercase transition-all",
                  activeTab === 'active' ? "text-tech-white" : "text-slate-600 hover:text-slate-400"
                )}
              >
                Active Installments
              </button>
              <div className="w-1 h-1 rounded-full bg-slate-800" />
              <button 
                onClick={() => setActiveTab('completed')}
                className={cn(
                  "font-brand text-xl tracking-tighter uppercase transition-all",
                  activeTab === 'completed' ? "text-tech-white" : "text-slate-600 hover:text-slate-400"
                )}
              >
                Closed EMIs
              </button>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{displayEmis.length} Records</span>
          </div>

          <div className="space-y-4">
            {displayEmis.map(emi => {
              const paidAmount = emiPayments
                .filter(p => p.emiId === emi.id)
                .reduce((s, p) => s + p.amount, 0);
              const progress = (emi.paidInstallments / emi.tenure) * 100;

              return (
                <motion.div 
                  key={emi.id}
                  layoutId={emi.id}
                  onClick={() => setSelectedEmi(emi)}
                  className={cn(
                    "bg-tech-card clay-card p-6 border border-white/5 cursor-pointer transition-all group",
                    selectedEmi?.id === emi.id ? "border-tech-lime/50 ring-1 ring-tech-lime/20" : "hover:border-white/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-tech-inset flex items-center justify-center text-tech-lime border border-white/5 group-hover:scale-110 transition-transform">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h5 className="font-bold text-tech-white tracking-tight">{emi.title}</h5>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{emi.source}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-brand text-tech-white">{formatCurrency(emi.monthlyInstallment)}</div>
                      <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Monthly</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Repayment Progress</span>
                      <span className="text-tech-lime">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-tech-lime shadow-[0_0_10px_rgba(165,243,68,0.3)]"
                      />
                    </div>
                    <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
                      <span>{emi.paidInstallments} / {emi.tenure} Paid</span>
                      <span>Remaining: {formatCurrency(emi.totalAmount - paidAmount)}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Next Due: {format(emi.nextDueDate.toDate(), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePayInstallment(emi);
                      }}
                      className="px-4 py-2 bg-tech-lime/10 hover:bg-tech-lime text-tech-lime hover:text-tech-black rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border border-tech-lime/20"
                    >
                      Pay Installment
                    </button>
                  </div>
                </motion.div>
              );
            })}

            {displayEmis.length === 0 && (
              <div className="bg-tech-card clay-card p-12 text-center border-dashed border-2 border-white/5">
                <CreditCard size={48} className="text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No {activeTab} EMIs found.</p>
              </div>
            )}
          </div>
        </div>

        {/* EMI Details Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <AnimatePresence mode="wait">
            {selectedEmi ? (
              <motion.div 
                key={selectedEmi.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-tech-card clay-card p-8 border-tech-lime/20 sticky top-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-brand text-xl text-tech-white tracking-tighter uppercase">EMI Details</h4>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEmiToDelete(selectedEmi.id!);
                        setShowDeleteConfirm(true);
                      }} 
                      className="p-2 text-slate-500 hover:text-tech-red transition-colors bg-tech-gray/50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button 
                      onClick={() => setSelectedEmi(null)} 
                      className="p-2 text-slate-500 hover:text-tech-white transition-colors bg-tech-gray/50 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-tech-inset p-4 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Principal</span>
                      <span className="text-sm font-bold text-tech-white">{formatCurrency(selectedEmi.principalAmount)}</span>
                    </div>
                    <div className="bg-tech-inset p-4 rounded-xl border border-white/5">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Interest</span>
                      <span className="text-sm font-bold text-tech-orange">{formatCurrency(selectedEmi.interestAmount)}</span>
                    </div>
                  </div>

                  <div className="bg-tech-inset p-6 rounded-xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</span>
                      <span className="text-lg font-brand text-tech-white">{formatCurrency(selectedEmi.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tenure</span>
                      <span className="text-sm font-bold text-tech-white">{selectedEmi.tenure} Months</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</span>
                      <span className="text-sm font-bold text-tech-white">{format(selectedEmi.startDate.toDate(), 'dd MMM yyyy')}</span>
                    </div>
                  </div>

                  {selectedEmi.monthlySchedule && selectedEmi.monthlySchedule.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar size={16} className="text-tech-lime" />
                        <h5 className="text-[10px] font-black text-tech-white uppercase tracking-widest">Payment Schedule</h5>
                      </div>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                        {selectedEmi.monthlySchedule.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-tech-inset rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-tech-lime w-4">{item.installmentNumber}</span>
                              <span className="text-xs text-tech-white font-medium">{formatCurrency(item.amount)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-500">{format(item.dueDate.toDate(), 'dd MMM yyyy')}</span>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-full",
                                item.status === 'paid' ? "bg-tech-lime/20 text-tech-lime" : "bg-slate-800 text-slate-400"
                              )}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <History size={16} className="text-tech-lime" />
                      <h5 className="text-[10px] font-black text-tech-white uppercase tracking-widest">Payment History</h5>
                    </div>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                      {emiPayments
                        .filter(p => p.emiId === selectedEmi.id)
                        .map(payment => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-tech-inset rounded-lg border border-white/5">
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowReceipt(true);
                                }}
                                className="w-8 h-8 rounded-lg bg-tech-lime/10 flex items-center justify-center text-tech-lime hover:bg-tech-lime/20 transition-colors"
                                title="View Receipt"
                              >
                                <FileText size={14} />
                              </button>
                              <div>
                                <div className="text-[10px] font-black text-tech-white uppercase tracking-tight">Installment #{payment.installmentNumber}</div>
                                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{format(payment.date.toDate(), 'dd MMM yyyy')}</div>
                              </div>
                            </div>
                            <div className="text-[10px] font-black text-tech-lime">{formatCurrency(payment.amount)}</div>
                          </div>
                        ))}
                      {emiPayments.filter(p => p.emiId === selectedEmi.id).length === 0 && (
                        <p className="text-center py-4 text-[8px] font-black text-slate-600 uppercase tracking-widest">No payments recorded yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-tech-card clay-card p-12 text-center border-dashed border-2 border-white/5 sticky top-8">
                <Info size={40} className="text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Select an EMI to view detailed analytics and history.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmationModal 
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEmiToDelete(null);
        }}
        onConfirm={() => emiToDelete && handleDeleteEmi(emiToDelete)}
        title="Delete EMI Matrix"
        message="Are you sure you want to delete this EMI entry? This will not delete the associated payment history."
        confirmText="Delete Entry"
        type="danger"
      />

      {selectedEmi && selectedPayment && (
        <PaymentReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPayment(null);
          }}
          emi={selectedEmi}
          payment={selectedPayment}
          preferences={preferences}
        />
      )}
    </div>
  );
}
