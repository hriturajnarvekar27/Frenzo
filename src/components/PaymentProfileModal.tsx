import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, QrCode, CreditCard, Building, User as UserIcon, Check, Upload, Trash2, Sparkles, Plus, Edit3, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { PaymentProfile, PaymentAccount } from '../types';

interface PaymentProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PaymentProfile | null;
  onSave: (updatedProfile: Partial<PaymentProfile>) => Promise<void>;
}

export function PaymentProfileModal({ isOpen, onClose, profile, onSave }: PaymentProfileModalProps) {
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form State for editing/adding account
  const [accountLabel, setAccountLabel] = useState('');
  const [upiId, setUpiId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (profile && isOpen) {
      if (profile.accounts && profile.accounts.length > 0) {
        setAccounts(profile.accounts);
      } else if (profile.upiId) {
        // Migration: create initial default account from legacy profile
        const legacyAccount: PaymentAccount = {
          id: 'acc-1',
          accountLabel: profile.bankName ? `${profile.bankName} Account` : 'Primary UPI',
          upiId: profile.upiId,
          accountHolderName: profile.accountHolderName || '',
          bankName: profile.bankName || '',
          accountNumber: profile.accountNumber || '',
          ifscCode: profile.ifscCode || '',
          qrImageUrl: profile.qrImageUrl || '',
          isDefault: true
        };
        setAccounts([legacyAccount]);
      } else {
        setAccounts([]);
        setIsAddingNew(true);
      }
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setAccountLabel('');
    setUpiId('');
    setAccountHolderName('');
    setBankName('');
    setAccountNumber('');
    setIfscCode('');
    setQrImageUrl('');
    setActiveEditingId(null);
    setIsAddingNew(false);
  };

  const handleStartEdit = (acc: PaymentAccount) => {
    setActiveEditingId(acc.id);
    setIsAddingNew(false);
    setAccountLabel(acc.accountLabel || '');
    setUpiId(acc.upiId || '');
    setAccountHolderName(acc.accountHolderName || '');
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setIfscCode(acc.ifscCode || '');
    setQrImageUrl(acc.qrImageUrl || '');
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
    setAccountLabel(`Bank Account ${accounts.length + 1}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image size should be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAccountForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiId.trim() || !accountHolderName.trim()) {
      alert("Please enter at least your UPI ID and Account Holder Name.");
      return;
    }

    if (isAddingNew) {
      const newAcc: PaymentAccount = {
        id: `acc-${Date.now()}`,
        accountLabel: accountLabel.trim() || `Account ${accounts.length + 1}`,
        upiId: upiId.trim(),
        accountHolderName: accountHolderName.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        qrImageUrl: qrImageUrl,
        isDefault: accounts.length === 0
      };
      setAccounts(prev => [...prev, newAcc]);
    } else if (activeEditingId) {
      setAccounts(prev =>
        prev.map(acc =>
          acc.id === activeEditingId
            ? {
                ...acc,
                accountLabel: accountLabel.trim() || acc.accountLabel,
                upiId: upiId.trim(),
                accountHolderName: accountHolderName.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                ifscCode: ifscCode.trim(),
                qrImageUrl: qrImageUrl
              }
            : acc
        )
      );
    }
    resetForm();
  };

  const handleSetDefault = (id: string) => {
    setAccounts(prev =>
      prev.map(acc => ({
        ...acc,
        isDefault: acc.id === id
      }))
    );
  };

  const handleDeleteAccount = (id: string) => {
    if (accounts.length <= 1) {
      if (!confirm("Deleting this account will remove your last saved bank details. Continue?")) return;
    }
    setAccounts(prev => {
      const filtered = prev.filter(acc => acc.id !== id);
      if (filtered.length > 0 && !filtered.some(a => a.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const handleFinalSubmit = async () => {
    if (accounts.length === 0) {
      alert("Please add at least one bank / UPI account!");
      return;
    }

    const defaultAcc = accounts.find(a => a.isDefault) || accounts[0];

    setIsSubmitting(true);
    try {
      await onSave({
        upiId: defaultAcc.upiId,
        accountHolderName: defaultAcc.accountHolderName,
        bankName: defaultAcc.bankName,
        accountNumber: defaultAcc.accountNumber,
        ifscCode: defaultAcc.ifscCode,
        qrImageUrl: defaultAcc.qrImageUrl,
        accounts: accounts
      });
      setSuccessMsg("Payment accounts updated successfully!");
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } catch (err) {
      console.error(err);
      alert("Failed to save payment profiles. Please try again.");
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
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-xl bg-tech-gray/95 border border-purple-500/30 rounded-3xl p-6 md:p-8 shadow-2xl z-10 my-8 text-tech-white overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-brand font-black text-tech-white tracking-tight">Saved Banks & UPI Accounts</h3>
                <p className="text-xs text-slate-400">Manage multiple receiving bank accounts & QR codes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 shrink-0">
              <Check className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="overflow-y-auto pr-1 flex-1 space-y-6">
            {/* Accounts List View */}
            {!isAddingNew && !activeEditingId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                    Your Saved Accounts ({accounts.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add Bank / UPI</span>
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-white/10 rounded-2xl bg-tech-black/40">
                    <QrCode className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-300">No bank accounts saved yet</p>
                    <p className="text-[11px] text-slate-500 mt-1 mb-4">Add your Kotak, HDFC, SBI, or Paytm UPI accounts to receive payments easily.</p>
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-lg"
                    >
                      + Add First Account
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accounts.map(acc => (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          acc.isDefault
                            ? 'bg-purple-950/30 border-purple-500/50 shadow-lg'
                            : 'bg-tech-black/50 border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white truncate">{acc.accountLabel}</span>
                              {acc.isDefault && (
                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-purple-400" /> Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-300">
                              Holder: <span className="text-white">{acc.accountHolderName}</span>
                            </p>
                            <p className="text-xs font-mono text-purple-300 font-extrabold truncate">
                              UPI: {acc.upiId}
                            </p>
                            {acc.bankName && (
                              <p className="text-[11px] text-slate-400">
                                {acc.bankName} {acc.accountNumber ? `• Acc: ${acc.accountNumber}` : ''} {acc.ifscCode ? `• IFSC: ${acc.ifscCode}` : ''}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!acc.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefault(acc.id)}
                                className="px-2.5 py-1.5 bg-white/5 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 rounded-xl text-[10px] font-bold border border-white/10 transition-all"
                                title="Set as default receiving account"
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(acc)}
                              className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-all"
                              title="Edit Account"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAccount(acc.id)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Account Form (Add or Edit) */}
            {(isAddingNew || activeEditingId) && (
              <form onSubmit={handleSaveAccountForm} className="space-y-4 bg-tech-black/60 p-5 rounded-2xl border border-purple-500/30">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                    {isAddingNew ? 'Add New Bank Account' : 'Edit Bank Account'}
                  </span>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Back to list
                  </button>
                </div>

                {/* Account Label */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Account Nickname / Label <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountLabel}
                    onChange={(e) => setAccountLabel(e.target.value)}
                    placeholder="e.g. Kotak Mahindra, HDFC Salary, GPay Personal"
                    className="w-full bg-tech-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* UPI ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    UPI ID / VPA <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 8999686327@kotakbank or john@paytm"
                    className="w-full bg-tech-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Account Holder Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Account Holder Name <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="e.g. Hrituraj Narvekar"
                    className="w-full bg-tech-black border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Bank Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-tech-black/40 border border-white/5 rounded-xl">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. Kotak Mahindra Bank"
                      className="w-full bg-tech-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 0248806549"
                      className="w-full bg-tech-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KKBK0002043"
                      className="w-full bg-tech-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Custom QR Code */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>Custom QR Image (Optional)</span>
                    {qrImageUrl && (
                      <button
                        type="button"
                        onClick={() => setQrImageUrl('')}
                        className="text-[10px] text-red-400 hover:underline"
                      >
                        Remove QR
                      </button>
                    )}
                  </label>
                  {qrImageUrl ? (
                    <div className="p-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
                      <img src={qrImageUrl} alt="QR" className="w-14 h-14 object-contain rounded-lg bg-white p-1" />
                      <p className="text-[11px] text-purple-300 font-medium">Custom QR Image attached</p>
                    </div>
                  ) : (
                    <div className="relative border border-dashed border-white/20 rounded-xl p-3 text-center bg-tech-black/40">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-[11px] font-bold text-slate-300">Upload custom bank QR image</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2 px-3 bg-white/5 text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg"
                  >
                    Save Account
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Submit */}
          {!isAddingNew && !activeEditingId && (
            <div className="pt-4 border-t border-white/10 shrink-0 flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-white/5 border border-white/10 rounded-2xl font-bold text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting || accounts.length === 0}
                className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
              >
                {isSubmitting ? 'Saving All...' : 'Save Profiles'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
