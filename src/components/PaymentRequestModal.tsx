import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Users, User as UserIcon, QrCode, CreditCard, DollarSign, Plus, Trash2, Check, ArrowRight, Edit3, HandCoins } from 'lucide-react';
import { PaymentProfile, PaymentRequest, SplitPerson } from '../types';

interface PaymentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PaymentProfile | null;
  onEditProfile: () => void;
  onSubmit: (requestData: Omit<PaymentRequest, 'id' | 'uid' | 'date'>, createDebtsAlso: boolean) => Promise<void>;
}

export function PaymentRequestModal({ isOpen, onClose, profile, onEditProfile, onSubmit }: PaymentRequestModalProps) {
  const [requestType, setRequestType] = useState<'single' | 'split'>('single');
  const [title, setTitle] = useState('');
  const [singleAmount, setSingleAmount] = useState('');
  const [payerName, setPayerName] = useState('');

  // Split Payment state
  const [totalSplitAmount, setTotalSplitAmount] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number>(3);
  const [splitParticipants, setSplitParticipants] = useState<SplitPerson[]>([]);
  const [isEvenSplit, setIsEvenSplit] = useState(true);

  // Sync with debts option
  const [createDebtsAlso, setCreateDebtsAlso] = useState(true);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setSingleAmount('');
      setPayerName('');
      setTotalSplitAmount('');
      setNumberOfPeople(3);
      setNote('');
      updateSplitBreakdown(3, '');

      if (profile?.accounts && profile.accounts.length > 0) {
        const def = profile.accounts.find(a => a.isDefault) || profile.accounts[0];
        setSelectedAccountId(def.id);
      } else {
        setSelectedAccountId('');
      }
    }
  }, [isOpen, profile]);

  // Derive chosen account details or fallback to root profile
  const chosenAccount = profile?.accounts && profile.accounts.length > 0
    ? (profile.accounts.find(a => a.id === selectedAccountId) || profile.accounts[0])
    : null;

  const targetUpiId = chosenAccount ? chosenAccount.upiId : (profile?.upiId || '');
  const targetHolderName = chosenAccount ? chosenAccount.accountHolderName : (profile?.accountHolderName || '');
  const targetBankName = chosenAccount ? chosenAccount.bankName : profile?.bankName;
  const targetAccountNumber = chosenAccount ? chosenAccount.accountNumber : profile?.accountNumber;
  const targetIfscCode = chosenAccount ? chosenAccount.ifscCode : profile?.ifscCode;
  const targetQrImageUrl = chosenAccount ? chosenAccount.qrImageUrl : profile?.qrImageUrl;

  const updateSplitBreakdown = (count: number, totalAmtStr: string) => {
    const total = parseFloat(totalAmtStr) || 0;
    const perPerson = count > 0 ? Math.round((total / count) * 100) / 100 : 0;

    const currentNames = splitParticipants.map(p => p.name);
    const updated: SplitPerson[] = Array.from({ length: count }, (_, i) => ({
      name: currentNames[i] || `Person ${i + 1}`,
      amount: perPerson,
      status: 'pending'
    }));
    setSplitParticipants(updated);
  };

  const handleTotalSplitAmountChange = (val: string) => {
    setTotalSplitAmount(val);
    if (isEvenSplit) {
      updateSplitBreakdown(numberOfPeople, val);
    }
  };

  const handleNumberOfPeopleChange = (val: number) => {
    const num = Math.max(2, Math.min(20, val));
    setNumberOfPeople(num);
    if (isEvenSplit) {
      updateSplitBreakdown(num, totalSplitAmount);
    }
  };

  const handleParticipantNameChange = (index: number, name: string) => {
    setSplitParticipants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name };
      return copy;
    });
  };

  const handleParticipantAmountChange = (index: number, amountStr: string) => {
    const amt = parseFloat(amountStr) || 0;
    setSplitParticipants(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], amount: amt };
      return copy;
    });
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile || !profile.upiId) {
      alert("Please set up your Bank / UPI ID details first!");
      onEditProfile();
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title or purpose for this payment request.");
      return;
    }

    let calculatedTotal = 0;
    let perPerson = 0;

    if (requestType === 'single') {
      calculatedTotal = parseFloat(singleAmount) || 0;
      if (calculatedTotal <= 0) {
        alert("Please enter a valid payment amount.");
        return;
      }
    } else {
      calculatedTotal = parseFloat(totalSplitAmount) || 0;
      if (calculatedTotal <= 0) {
        alert("Please enter a valid bill amount to split.");
        return;
      }
      perPerson = Math.round((calculatedTotal / (numberOfPeople || 1)) * 100) / 100;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        {
          title: title.trim(),
          totalAmount: calculatedTotal,
          requestType,
          payerName: requestType === 'single' ? payerName.trim() : undefined,
          numberOfPeople: requestType === 'split' ? numberOfPeople : undefined,
          perPersonAmount: requestType === 'split' ? perPerson : undefined,
          splitBreakdown: requestType === 'split' ? splitParticipants : undefined,
          upiId: targetUpiId,
          accountHolderName: targetHolderName,
          bankName: targetBankName,
          accountNumber: targetAccountNumber,
          ifscCode: targetIfscCode,
          qrImageUrl: targetQrImageUrl,
          note: note.trim(),
          status: 'pending'
        },
        createDebtsAlso
      );
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to create payment request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg bg-tech-gray/95 border border-tech-lime/30 rounded-3xl p-6 md:p-8 shadow-2xl z-10 my-8 text-tech-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-tech-lime/10 border border-tech-lime/30 flex items-center justify-center text-tech-lime">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-brand font-black text-tech-white tracking-tight">Create Payment Request</h3>
                <p className="text-xs text-slate-400">Request payment or split expenses with QR code pass</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stored Credentials Banner / Account Selector */}
          <div className="mb-6 p-4 bg-tech-black/60 border border-white/10 rounded-2xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-tech-lime" />
                Receiving Bank / UPI Account
              </span>
              <button
                type="button"
                onClick={onEditProfile}
                className="text-[11px] font-bold text-tech-lime hover:underline flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" />
                <span>{profile?.accounts && profile.accounts.length > 0 ? 'Manage Accounts' : 'Setup Bank'}</span>
              </button>
            </div>

            {profile?.accounts && profile.accounts.length > 1 ? (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-tech-black border border-tech-lime/40 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-tech-lime cursor-pointer"
              >
                {profile.accounts.map(acc => (
                  <option key={acc.id} value={acc.id} className="bg-tech-gray text-white">
                    {acc.accountLabel} — {acc.upiId} ({acc.bankName || 'UPI'})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex items-center justify-between min-w-0">
                {targetUpiId ? (
                  <div>
                    <p className="text-xs font-extrabold text-tech-white truncate">
                      {targetHolderName} <span className="text-tech-lime font-mono">({targetUpiId})</span>
                    </p>
                    {targetBankName && <p className="text-[10px] text-slate-400">{targetBankName}</p>}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-tech-orange">No saved UPI/Bank ID found</p>
                )}
              </div>
            )}
          </div>

          {/* Request Type Selector (Single vs Split) */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-tech-black/50 border border-white/10 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => setRequestType('single')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                requestType === 'single'
                  ? 'bg-tech-lime text-tech-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>Single Request</span>
            </button>
            <button
              type="button"
              onClick={() => setRequestType('split')}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                requestType === 'split'
                  ? 'bg-tech-lime text-tech-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Split Bill (Multi-person)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title / Purpose */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Title / Purpose <span className="text-tech-lime">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={requestType === 'split' ? "e.g. Weekend Trip Expenses or Team Dinner" : "e.g. Movie Ticket Share or Lunch"}
                className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-tech-lime transition-all placeholder:text-slate-600"
              />
            </div>

            {/* SINGLE REQUEST FORM */}
            {requestType === 'single' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Amount (₹) <span className="text-tech-lime">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-tech-lime transition-all font-mono placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Payer Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Marcus"
                    className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-tech-lime transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            {/* SPLIT BILL FORM */}
            {requestType === 'split' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Total Expense Amount (₹) <span className="text-tech-lime">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={totalSplitAmount}
                      onChange={(e) => handleTotalSplitAmountChange(e.target.value)}
                      placeholder="e.g. 2400"
                      className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-tech-lime transition-all font-mono placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Number of People <span className="text-tech-lime">*</span>
                    </label>
                    <input
                      type="number"
                      min="2"
                      max="20"
                      required
                      value={numberOfPeople}
                      onChange={(e) => handleNumberOfPeopleChange(parseInt(e.target.value) || 2)}
                      className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-tech-lime transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Per Person Calculation Card */}
                {parseFloat(totalSplitAmount) > 0 && (
                  <div className="p-4 bg-tech-lime/10 border border-tech-lime/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-tech-lime">Share Per Person</span>
                      <p className="text-2xl font-black text-white font-mono">
                        ₹{Math.round((parseFloat(totalSplitAmount) / (numberOfPeople || 1)) * 100) / 100}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                      <span>{numberOfPeople} equal shares</span>
                    </div>
                  </div>
                )}

                {/* Participant Names List */}
                <div className="p-4 bg-tech-black/40 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Participants List</span>
                    <button
                      type="button"
                      onClick={() => setIsEvenSplit(!isEvenSplit)}
                      className="text-[10px] text-tech-lime font-bold hover:underline"
                    >
                      {isEvenSplit ? 'Custom Shares' : 'Even Shares'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {splitParticipants.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handleParticipantNameChange(idx, e.target.value)}
                          placeholder={`Person ${idx + 1}`}
                          className="flex-1 bg-tech-black/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-tech-lime"
                        />
                        <div className="w-24 relative">
                          <span className="absolute left-2.5 top-2 text-[10px] text-slate-500 font-mono">₹</span>
                          <input
                            type="number"
                            readOnly={isEvenSplit}
                            value={p.amount}
                            onChange={(e) => handleParticipantAmountChange(idx, e.target.value)}
                            className={`w-full bg-tech-black/80 border border-white/10 rounded-xl pl-6 pr-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-tech-lime ${isEvenSplit ? 'opacity-80' : ''}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Note / Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Note / Instructions (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Please share screenshot after payment"
                className="w-full bg-tech-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-tech-lime transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Sync to Debt Tracker Toggle */}
            <label className="p-3 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-2.5">
                <HandCoins className="w-4 h-4 text-tech-lime" />
                <div>
                  <p className="text-xs font-bold text-white">Log into Debt Tracker automatically</p>
                  <p className="text-[10px] text-slate-400">Creates lending entry in your debts manager</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={createDebtsAlso}
                onChange={(e) => setCreateDebtsAlso(e.target.checked)}
                className="w-4 h-4 accent-tech-lime rounded cursor-pointer"
              />
            </label>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-tech-lime text-tech-black rounded-2xl font-black text-xs hover:opacity-90 transition-all shadow-[0_0_20px_rgba(165,243,68,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Generating...' : 'Generate Request Pass'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
