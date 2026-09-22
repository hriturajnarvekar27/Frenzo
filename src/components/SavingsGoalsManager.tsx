import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, Plus, TrendingUp, Calendar, CheckCircle2, AlertCircle, 
  ArrowUpRight, ArrowDownLeft, Shield, Home, Car, Laptop, Plane, 
  Briefcase, PiggyBank, Sparkles, Filter, Trash2, Edit3, Flag, ChevronRight, 
  Clock, DollarSign, Award, Milestone, Layers
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { SavingsGoal, GoalContribution } from '../types';
import { cn } from '../lib/utils';

interface SavingsGoalsManagerProps {
  goals: SavingsGoal[];
  onAddGoal: (goal: Omit<SavingsGoal, 'id' | 'uid'>) => void;
  onUpdateGoal: (id: string, goal: Partial<SavingsGoal>) => void;
  onDeleteGoal: (id: string) => void;
  onDepositGoal: (goalId: string, amount: number, note?: string) => void;
  onWithdrawGoal: (goalId: string, amount: number, note?: string) => void;
}

const CATEGORIES = [
  { id: 'Emergency', label: 'Emergency Fund', icon: Shield, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { id: 'Housing', label: 'Housing / Down Payment', icon: Home, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { id: 'Vehicle', label: 'Vehicle / Transport', icon: Car, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { id: 'Tech', label: 'Tech & Gadgets', icon: Laptop, color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  { id: 'Travel', label: 'Vacation & Travel', icon: Plane, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { id: 'Investment', label: 'Investment Portfolio', icon: TrendingUp, color: 'text-tech-lime bg-tech-lime/10 border-tech-lime/30' },
  { id: 'Retirement', label: 'Retirement Fund', icon: Briefcase, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30' },
  { id: 'General', label: 'General Savings', icon: PiggyBank, color: 'text-slate-300 bg-slate-400/10 border-slate-400/30' },
];

export function SavingsGoalsManager({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onDepositGoal,
  onWithdrawGoal,
}: SavingsGoalsManagerProps) {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [activeDepositModalGoal, setActiveDepositModalGoal] = useState<{ goal: SavingsGoal; type: 'deposit' | 'withdraw' } | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositNote, setDepositNote] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'roadmap'>('roadmap');

  // New Goal Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<SavingsGoal['category']>('General');
  const [formTargetAmount, setFormTargetAmount] = useState('');
  const [formCurrentAmount, setFormCurrentAmount] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');
  const [formPriority, setFormPriority] = useState<SavingsGoal['priority']>('medium');
  const [formNotes, setFormNotes] = useState('');

  // Calculations
  const totalTarget = goals.reduce((acc, g) => acc + g.targetAmount, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Monthly contribution calculation across active goals
  const calculateRequiredMonthly = (goal: SavingsGoal) => {
    if (goal.status === 'achieved') return 0;
    const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
    if (remaining === 0) return 0;

    const targetTime = goal.targetDate.toDate ? goal.targetDate.toDate().getTime() : new Date().getTime();
    const now = new Date().getTime();
    const diffMonths = Math.max(1, (targetTime - now) / (1000 * 60 * 60 * 24 * 30.44));
    return Math.ceil(remaining / diffMonths);
  };

  const totalRequiredMonthly = goals.reduce((acc, g) => acc + calculateRequiredMonthly(g), 0);

  // Filtered Goals
  const filteredGoals = goals.filter(g => {
    if (activeCategoryFilter !== 'all' && g.category !== activeCategoryFilter) return false;
    return true;
  });

  // Sorted Goals for Roadmap (by Target Date ascending)
  const roadmapGoals = [...goals].sort((a, b) => {
    const timeA = a.targetDate.toDate ? a.targetDate.toDate().getTime() : 0;
    const timeB = b.targetDate.toDate ? b.targetDate.toDate().getTime() : 0;
    return timeA - timeB;
  });

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormCategory('General');
    setFormTargetAmount('');
    setFormCurrentAmount('0');
    // Default target date to 6 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setFormTargetDate(d.toISOString().split('T')[0]);
    setFormPriority('medium');
    setFormNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormCategory(goal.category);
    setFormTargetAmount(goal.targetAmount.toString());
    setFormCurrentAmount(goal.currentAmount.toString());
    const dateObj = goal.targetDate.toDate ? goal.targetDate.toDate() : new Date();
    setFormTargetDate(dateObj.toISOString().split('T')[0]);
    setFormPriority(goal.priority);
    setFormNotes(goal.notes || '');
    setShowAddModal(true);
  };

  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const targetAmt = parseFloat(formTargetAmount);
    const currAmt = parseFloat(formCurrentAmount || '0');
    if (isNaN(targetAmt) || targetAmt <= 0) return;

    const tDate = formTargetDate ? new Date(formTargetDate) : new Date();
    const status: SavingsGoal['status'] = currAmt >= targetAmt ? 'achieved' : 'active';

    if (editingGoal && editingGoal.id) {
      onUpdateGoal(editingGoal.id, {
        title: formTitle,
        category: formCategory,
        targetAmount: targetAmt,
        currentAmount: currAmt,
        targetDate: Timestamp.fromDate(tDate),
        priority: formPriority,
        notes: formNotes,
        status,
      });
    } else {
      onAddGoal({
        title: formTitle,
        category: formCategory,
        targetAmount: targetAmt,
        currentAmount: currAmt,
        targetDate: Timestamp.fromDate(tDate),
        priority: formPriority,
        notes: formNotes,
        status,
      });
    }

    setShowAddModal(false);
  };

  const handleConfirmDeposit = () => {
    if (!activeDepositModalGoal) return;
    const val = parseFloat(depositAmount);
    if (isNaN(val) || val <= 0) return;

    if (activeDepositModalGoal.type === 'deposit') {
      onDepositGoal(activeDepositModalGoal.goal.id!, val, depositNote);
    } else {
      onWithdrawGoal(activeDepositModalGoal.goal.id!, val, depositNote);
    }

    setActiveDepositModalGoal(null);
    setDepositAmount('');
    setDepositNote('');
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Accumulated */}
        <div className="p-5 rounded-2xl bg-tech-card clay-card border border-tech-lime/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
              Total Saved Capital
            </span>
            <div className="text-2xl font-black text-tech-lime tracking-tight font-brand">
              ${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Across {goals.length} active roadmap goals
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime">
            <PiggyBank size={24} />
          </div>
        </div>

        {/* Total Target */}
        <div className="p-5 rounded-2xl bg-tech-card clay-card border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
              Total Target Milestone
            </span>
            <div className="text-2xl font-black text-white tracking-tight font-brand">
              ${totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Combined financial roadmap target
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-300">
            <Target size={24} />
          </div>
        </div>

        {/* Overall Completion Progress */}
        <div className="p-5 rounded-2xl bg-tech-card clay-card border border-white/10 flex items-center justify-between">
          <div className="flex-1 pr-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Roadmap Progress
              </span>
              <span className="text-xs font-black text-tech-lime font-mono">{overallPercentage}%</span>
            </div>
            <div className="w-full bg-tech-inset h-2 rounded-full overflow-hidden border border-white/10 mt-2">
              <div 
                className="bg-gradient-to-r from-tech-lime via-emerald-400 to-cyan-400 h-full rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(165,243,68,0.3)]"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-2 block">
              ${(totalTarget - totalSaved).toLocaleString()} remaining to save
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-tech-lime/10 border border-tech-lime/20 text-tech-lime shrink-0">
            <Award size={24} />
          </div>
        </div>

        {/* Required Monthly Contribution */}
        <div className="p-5 rounded-2xl bg-tech-card clay-card border border-cyan-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
              Required Monthly Save
            </span>
            <div className="text-2xl font-black text-cyan-400 tracking-tight font-brand">
              ${totalRequiredMonthly.toLocaleString()}/mo
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Auto-calculated to hit targets on time
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Control Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-tech-header p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('roadmap')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border",
              viewMode === 'roadmap'
                ? "bg-tech-lime/15 text-tech-lime border-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)]"
                : "bg-tech-inset text-slate-400 border-white/5 hover:text-white"
            )}
          >
            <Milestone size={16} />
            Visual Roadmap View
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border",
              viewMode === 'grid'
                ? "bg-tech-lime/15 text-tech-lime border-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)]"
                : "bg-tech-inset text-slate-400 border-white/5 hover:text-white"
            )}
          >
            <Layers size={16} />
            Goals Cards Grid ({filteredGoals.length})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Category Filter dropdown */}
          <select
            value={activeCategoryFilter}
            onChange={(e) => setActiveCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-tech-inset border border-white/10 rounded-xl text-xs font-mono text-slate-300 focus:outline-none focus:border-tech-lime"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>

          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-tech-lime text-black font-black uppercase text-xs tracking-wider rounded-xl hover:brightness-110 shadow-[0_0_20px_rgba(165,243,68,0.3)] flex items-center gap-2 transition-all ml-auto sm:ml-0"
          >
            <Plus size={16} />
            New Savings Goal
          </button>
        </div>
      </div>

      {/* ROADMAP TIMELINE VIEW */}
      {viewMode === 'roadmap' && (
        <div className="p-6 rounded-3xl bg-tech-card clay-card border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Milestone className="text-tech-lime" size={20} />
                Financial Freedom Savings Roadmap
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Chronological timeline of your major target milestones & accumulation progress</p>
            </div>
            <span className="text-[10px] font-mono text-tech-lime px-3 py-1 rounded-full bg-tech-lime/10 border border-tech-lime/30 uppercase tracking-widest hidden md:inline-block">
              Interactive Timeline
            </span>
          </div>

          {roadmapGoals.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl space-y-3">
              <PiggyBank size={40} className="mx-auto text-slate-500" />
              <p className="text-sm font-bold text-slate-300">No savings goals set yet</p>
              <p className="text-xs text-slate-500">Create your first savings goal to initialize your visual financial roadmap.</p>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-tech-lime text-black font-bold text-xs rounded-xl inline-flex items-center gap-2"
              >
                <Plus size={14} /> Add First Goal
              </button>
            </div>
          ) : (
            <div className="relative pt-6 pb-4">
              {/* Timeline Connector Bar */}
              <div className="hidden md:block absolute top-1/2 left-4 right-4 h-1 bg-gradient-to-r from-tech-lime via-cyan-500 to-purple-500 rounded-full opacity-30 -translate-y-1/2 z-0" />

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
                {roadmapGoals.map((goal, idx) => {
                  const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                  const catObj = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[7];
                  const Icon = catObj.icon;
                  const targetDateStr = goal.targetDate.toDate ? goal.targetDate.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Future';
                  const monthly = calculateRequiredMonthly(goal);
                  const isAchieved = goal.status === 'achieved' || pct >= 100;

                  return (
                    <motion.div
                      key={goal.id || idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      className={cn(
                        "p-5 rounded-2xl bg-tech-inset border transition-all relative group flex flex-col justify-between space-y-4",
                        isAchieved 
                          ? "border-tech-lime/50 bg-tech-lime/5 shadow-[0_0_20px_rgba(165,243,68,0.15)]" 
                          : "border-white/10 hover:border-tech-lime/30"
                      )}
                    >
                      {/* Milestone Order Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase tracking-widest">
                          Step #{idx + 1}
                        </span>
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border",
                          goal.priority === 'high' ? "bg-rose-500/10 text-rose-400 border-rose-500/30" :
                          goal.priority === 'medium' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                          "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        )}>
                          {goal.priority} Priority
                        </span>
                      </div>

                      {/* Header with Category Icon */}
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2.5 rounded-xl border shrink-0", catObj.color)}>
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-black text-white truncate group-hover:text-tech-lime transition-colors">
                            {goal.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">Target: {targetDateStr}</span>
                        </div>
                      </div>

                      {/* Progress Metrics */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-bold">${goal.currentAmount.toLocaleString()}</span>
                          <span className="text-slate-200 font-black">${goal.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5 p-0.5">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              isAchieved ? "bg-tech-lime" : "bg-gradient-to-r from-tech-lime to-cyan-400"
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>{pct}% Completed</span>
                          {!isAchieved && (
                            <span className="text-cyan-400 font-bold">${monthly}/mo</span>
                          )}
                        </div>
                      </div>

                      {/* Milestone Checkpoints */}
                      <div className="grid grid-cols-4 gap-1 text-[8px] font-mono text-center pt-1 border-t border-white/5">
                        <div className={cn("py-1 rounded bg-white/5", pct >= 25 ? "text-tech-lime font-bold bg-tech-lime/10" : "text-slate-500")}>25%</div>
                        <div className={cn("py-1 rounded bg-white/5", pct >= 50 ? "text-tech-lime font-bold bg-tech-lime/10" : "text-slate-500")}>50%</div>
                        <div className={cn("py-1 rounded bg-white/5", pct >= 75 ? "text-tech-lime font-bold bg-tech-lime/10" : "text-slate-500")}>75%</div>
                        <div className={cn("py-1 rounded bg-white/5", pct >= 100 ? "text-tech-lime font-bold bg-tech-lime/10" : "text-slate-500")}>100%</div>
                      </div>

                      {/* Deposit / Edit Buttons */}
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => setActiveDepositModalGoal({ goal, type: 'deposit' })}
                          className="flex-1 py-2 rounded-xl bg-tech-lime/20 border border-tech-lime/40 text-tech-lime hover:bg-tech-lime hover:text-black font-black uppercase text-[10px] tracking-wider transition-all flex items-center justify-center gap-1"
                        >
                          <ArrowUpRight size={14} /> Deposit
                        </button>
                        <button
                          onClick={() => handleOpenEdit(goal)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => goal.id && onDeleteGoal(goal.id)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
            const catObj = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[7];
            const Icon = catObj.icon;
            const targetDateStr = goal.targetDate.toDate ? goal.targetDate.toDate().toLocaleDateString() : '';
            const monthly = calculateRequiredMonthly(goal);
            const isAchieved = goal.status === 'achieved' || pct >= 100;

            return (
              <div 
                key={goal.id}
                className={cn(
                  "p-6 rounded-3xl bg-tech-card clay-card border transition-all space-y-5 flex flex-col justify-between",
                  isAchieved ? "border-tech-lime/50 shadow-[0_0_20px_rgba(165,243,68,0.15)]" : "border-white/10 hover:border-white/20"
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-3 rounded-2xl border", catObj.color)}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white uppercase tracking-wider">{goal.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400 block">{catObj.label}</span>
                      </div>
                    </div>
                    {isAchieved ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-tech-lime/20 text-tech-lime border border-tech-lime/40 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Goal Achieved
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-slate-400 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        Target: {targetDateStr}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2 bg-tech-inset p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400">Accumulated</span>
                      <span className="text-sm font-black font-mono text-tech-lime">${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-black/50 h-3 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="bg-gradient-to-r from-tech-lime via-emerald-400 to-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">{pct}% Saved</span>
                      {!isAchieved && (
                        <span className="text-cyan-400 font-bold">${monthly}/month target</span>
                      )}
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-400 bg-white/5 p-3 rounded-xl border border-white/5 italic">
                      "{goal.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => setActiveDepositModalGoal({ goal, type: 'deposit' })}
                    className="flex-1 py-2.5 rounded-xl bg-tech-lime text-black font-black uppercase text-xs tracking-wider hover:brightness-110 flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(165,243,68,0.2)]"
                  >
                    <ArrowUpRight size={16} /> Deposit
                  </button>
                  <button
                    onClick={() => setActiveDepositModalGoal({ goal, type: 'withdraw' })}
                    className="py-2.5 px-3 rounded-xl bg-tech-inset border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all"
                    title="Withdraw Funds"
                  >
                    <ArrowDownLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(goal)}
                    className="p-2.5 rounded-xl bg-tech-inset border border-white/10 text-slate-400 hover:text-white transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => goal.id && onDeleteGoal(goal.id)}
                    className="p-2.5 rounded-xl bg-tech-inset border border-white/10 text-slate-400 hover:text-rose-400 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT GOAL MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-tech-card clay-card border border-tech-lime/30 rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-tech-lime/15 text-tech-lime border border-tech-lime/30">
                    <Target size={20} />
                  </div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    {editingGoal ? 'Edit Savings Goal' : 'Create Roadmap Goal'}
                  </h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitGoal} className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                    Goal Name / Milestone Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Emergency Fund, House Down Payment"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-tech-lime"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3 py-3 bg-tech-inset border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-tech-lime"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                      Priority
                    </label>
                    <select
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as any)}
                      className="w-full px-3 py-3 bg-tech-inset border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-tech-lime"
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                      Target Amount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="10000"
                      value={formTargetAmount}
                      onChange={(e) => setFormTargetAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-tech-lime"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                      Initial Saved ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formCurrentAmount}
                      onChange={(e) => setFormCurrentAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-tech-lime"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-tech-lime"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                    Notes / Motivation Strategy (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="What will achieving this milestone enable?"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-tech-lime"
                  />
                </div>

                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-tech-lime text-black font-black uppercase text-xs tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(165,243,68,0.3)]"
                  >
                    {editingGoal ? 'Update Goal' : 'Save Goal to Roadmap'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DEPOSIT / WITHDRAW MODAL */}
      <AnimatePresence>
        {activeDepositModalGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-tech-card clay-card border border-tech-lime/30 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    {activeDepositModalGoal.type === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
                  </h3>
                  <p className="text-xs text-slate-400">{activeDepositModalGoal.goal.title}</p>
                </div>
                <button onClick={() => setActiveDepositModalGoal(null)} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                    Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="Enter amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-lg font-mono font-bold text-tech-lime focus:outline-none focus:border-tech-lime"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-2">
                  {[50, 100, 250, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="flex-1 py-1.5 rounded-lg bg-tech-inset border border-white/10 text-xs font-mono font-bold text-slate-300 hover:border-tech-lime/40 hover:text-tech-lime"
                    >
                      +${amt}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                    Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Monthly auto-save, Bonus deposit"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    className="w-full px-4 py-2.5 bg-tech-inset border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-tech-lime"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveDepositModalGoal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeposit}
                  className="px-6 py-2.5 rounded-xl bg-tech-lime text-black font-black uppercase text-xs tracking-wider hover:brightness-110 shadow-[0_0_20px_rgba(165,243,68,0.3)]"
                >
                  Confirm {activeDepositModalGoal.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
