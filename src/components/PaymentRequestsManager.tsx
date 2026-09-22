import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Plus, 
  Users, 
  User as UserIcon, 
  QrCode, 
  Copy, 
  Check, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  CreditCard, 
  Building, 
  Edit3, 
  FileText,
  Share2,
  DollarSign,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { PaymentProfile, PaymentRequest } from '../types';

interface PaymentRequestsManagerProps {
  requests: PaymentRequest[];
  profile: PaymentProfile | null;
  onOpenNewRequestModal: () => void;
  onOpenProfileModal: () => void;
  onViewRequestPass: (request: PaymentRequest) => void;
  onMarkAsPaid: (request: PaymentRequest) => Promise<void>;
  onDeleteRequest: (requestId: string) => Promise<void>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export function PaymentRequestsManager({
  requests,
  profile,
  onOpenNewRequestModal,
  onOpenProfileModal,
  onViewRequestPass,
  onMarkAsPaid,
  onDeleteRequest
}: PaymentRequestsManagerProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'settled' | 'split'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.payerName && req.payerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      req.upiId.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'pending') return req.status !== 'paid';
    if (activeFilter === 'settled') return req.status === 'paid';
    if (activeFilter === 'split') return req.requestType === 'split';

    return true;
  });

  const totalPendingAmount = requests
    .filter(r => r.status !== 'paid')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const totalSettledAmount = requests
    .filter(r => r.status === 'paid')
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const splitCount = requests.filter(r => r.requestType === 'split').length;

  const handleCopyUpi = (upiId: string, reqId?: string) => {
    navigator.clipboard.writeText(upiId);
    if (reqId) {
      setCopiedId(reqId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner & Quick Actions */}
      <div className="bg-tech-card clay-card rounded-3xl p-6 md:p-8 border-tech-lime/20 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-tech-lime/10 border border-tech-lime/30 text-tech-lime text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Payment & Split Request Hub
              </span>
            </div>
            <h2 className="text-2xl md:text-4xl font-brand font-black text-tech-white tracking-tight">
              Payment Request Cards & Logs
            </h2>
            <p className="text-xs md:text-sm text-slate-400 max-w-xl mt-1">
              Store your Bank / UPI credentials, generate custom QR payment cards, split bills with groups, and track request logs seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenProfileModal}
              className="px-4 py-3 bg-white/5 border border-white/10 hover:border-tech-lime text-slate-200 hover:text-tech-lime rounded-2xl font-bold text-xs transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>{profile?.upiId ? 'My UPI & QR Details' : 'Setup Bank & UPI'}</span>
            </button>

            <button
              onClick={onOpenNewRequestModal}
              className="px-5 py-3 bg-tech-lime text-tech-black hover:opacity-90 rounded-2xl font-black text-xs transition-all shadow-[0_0_20px_rgba(165,243,68,0.3)] flex items-center gap-2"
            >
              <Plus className="w-4.5 h-4.5 stroke-[3]" />
              <span>Create Payment Request</span>
            </button>
          </div>
        </div>

        {/* Credentials Bar Preview */}
        {profile && profile.upiId && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 font-bold">Default Payment Details:</span>
              <span className="font-mono bg-tech-black/60 px-3 py-1 rounded-lg border border-white/10 text-tech-lime font-bold">
                {profile.upiId}
              </span>
              <span className="font-bold text-white">{profile.accountHolderName}</span>
              {profile.bankName && (
                <span className="text-slate-400 hidden sm:inline">• {profile.bankName}</span>
              )}
            </div>
            {profile.qrImageUrl && (
              <span className="text-[10px] font-bold text-tech-lime bg-tech-lime/10 px-2.5 py-1 rounded-full border border-tech-lime/20 flex items-center gap-1">
                <QrCode className="w-3 h-3" /> Custom QR Attached
              </span>
            )}
          </div>
        )}
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-tech-card clay-card rounded-2xl border-tech-orange/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-tech-orange">Pending Requests</p>
            <p className="text-2xl font-black text-tech-white mt-1 font-mono">{formatCurrency(totalPendingAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {requests.filter(r => r.status !== 'paid').length} active requests
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tech-orange/10 border border-tech-orange/30 flex items-center justify-center text-tech-orange">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-tech-card clay-card rounded-2xl border-tech-lime/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-tech-lime">Total Settled</p>
            <p className="text-2xl font-black text-tech-white mt-1 font-mono">{formatCurrency(totalSettledAmount)}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {requests.filter(r => r.status === 'paid').length} requests collected
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tech-lime/10 border border-tech-lime/30 flex items-center justify-center text-tech-lime">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 bg-tech-card clay-card rounded-2xl border-tech-cyan/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-tech-cyan">Split Bill Logs</p>
            <p className="text-2xl font-black text-tech-white mt-1 font-mono">{splitCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Multi-person split bills</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-tech-cyan/10 border border-tech-cyan/30 flex items-center justify-center text-tech-cyan">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-tech-card clay-card p-4 rounded-2xl border-white/10">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'pending', 'settled', 'split'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                activeFilter === tab
                  ? 'bg-tech-lime text-tech-black font-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'all' ? 'All Logs' : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search request logs..."
            className="w-full bg-tech-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-tech-lime"
          />
        </div>
      </div>

      {/* Requests Logs Grid */}
      {filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-tech-card clay-card rounded-3xl border border-white/10">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-white mb-1">No payment requests found</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
            Create your first payment request card or split bill with your friends to store and manage request logs.
          </p>
          <button
            onClick={onOpenNewRequestModal}
            className="px-5 py-2.5 bg-tech-lime text-tech-black font-black text-xs rounded-xl shadow-md inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Payment Request</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRequests.map(req => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-tech-card clay-card rounded-2xl p-5 border-white/10 flex flex-col justify-between hover:border-tech-lime/30 transition-all group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      req.requestType === 'split' ? 'bg-tech-cyan/20 text-tech-cyan' : 'bg-tech-lime/20 text-tech-lime'
                    }`}>
                      {req.requestType === 'split' ? <Users className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white truncate max-w-[150px]">{req.title}</h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {req.date ? format(req.date.toDate(), 'dd MMM yyyy') : 'Recent'}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    req.status === 'paid'
                      ? 'bg-tech-lime/10 text-tech-lime border-tech-lime/30'
                      : 'bg-tech-orange/10 text-tech-orange border-tech-orange/30'
                  }`}>
                    {req.status === 'paid' ? 'SETTLED' : 'PENDING'}
                  </span>
                </div>

                {/* Amount display */}
                <div className="p-3 bg-tech-black/50 border border-white/5 rounded-xl my-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Amount</span>
                    <span className="text-lg font-black text-white font-mono">{formatCurrency(req.totalAmount)}</span>
                  </div>

                  {req.requestType === 'split' && req.perPersonAmount && (
                    <div className="mt-1 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px]">
                      <span className="text-tech-cyan font-bold">{req.numberOfPeople || req.splitBreakdown?.length} Split Shares</span>
                      <span className="font-extrabold text-tech-lime font-mono">{formatCurrency(req.perPersonAmount)} / person</span>
                    </div>
                  )}
                </div>

                {/* Details info */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  {req.payerName && (
                    <p className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Payer:</span>
                      <span className="font-bold text-white">{req.payerName}</span>
                    </p>
                  )}
                  <p className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">UPI ID:</span>
                    <span className="font-mono text-tech-lime font-bold">{req.upiId}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2">
                <button
                  onClick={() => onViewRequestPass(req)}
                  className="flex-1 py-2 px-3 bg-tech-lime/10 hover:bg-tech-lime/20 border border-tech-lime/30 text-tech-lime rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Pass</span>
                </button>

                {req.status !== 'paid' && (
                  <button
                    onClick={() => onMarkAsPaid(req)}
                    className="py-2 px-3 bg-tech-lime text-tech-black font-black text-xs rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-1"
                    title="Mark as Settled"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleCopyUpi(req.upiId, req.id)}
                  className="py-2 px-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs transition-all"
                  title="Copy UPI ID"
                >
                  {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-tech-lime" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {req.id && (
                  <button
                    onClick={() => onDeleteRequest(req.id!)}
                    className="py-2 px-2.5 bg-tech-red/10 hover:bg-tech-red/20 border border-tech-red/30 text-tech-red rounded-xl text-xs transition-all"
                    title="Delete Log"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
