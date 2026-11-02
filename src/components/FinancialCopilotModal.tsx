import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, Sparkles, Send, ArrowUpRight, ArrowDownLeft, X, 
  Target, CheckCircle2, AlertCircle, RefreshCw, Zap, 
  DollarSign, TrendingUp, ShieldAlert, ChevronRight, HelpCircle, 
  Cpu, CornerDownLeft
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Timestamp } from 'firebase/firestore';
import { Transaction, Budget, SavingsGoal, EMI, Debt } from '../types';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/secureApi';

interface FinancialCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  emis: EMI[];
  debts: Debt[];
  onAddTransaction: (tx: {
    amount: number;
    category: string;
    description: string;
    type: 'expense' | 'income';
    date: Timestamp;
  }) => void;
  onAddSavingsGoal?: (goal: Omit<SavingsGoal, 'id' | 'uid'>) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  actionProposal?: {
    type: 'add_transaction' | 'create_goal';
    label: string;
    transactionData?: {
      type: 'expense' | 'income';
      amount: number;
      category: string;
      description: string;
      date: string;
    };
    goalData?: {
      title: string;
      targetAmount: number;
      category: string;
      targetDate: string;
      priority: 'low' | 'medium' | 'high';
    };
  };
  suggestedQueries?: string[];
  executed?: boolean;
}

export function FinancialCopilotModal({
  isOpen,
  onClose,
  transactions,
  budgets,
  savingsGoals,
  emis,
  debts,
  onAddTransaction,
  onAddSavingsGoal,
}: FinancialCopilotModalProps) {
  // Quick natural language input state
  const [quickInput, setQuickInput] = useState('');
  const [isParsingQuick, setIsParsingQuick] = useState(false);
  const [quickParseResult, setQuickParseResult] = useState<any | null>(null);

  // Conversational Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "👋 **Frenzo Financial Copilot Online.**\n\nI have indexed your active telemetry: balances, monthly burn rates, category budgets, and savings roadmaps.\n\nAsk me anything about your cash flow, run purchase affordability simulations, or type natural commands like *\"Spent $38 on gas at Shell\"* or *\"Can I afford a $450 gadget today?\"*",
      timestamp: new Date(),
      suggestedQueries: [
        "Can I afford a $350 impulse buy?",
        "Where am I leaking the most money this month?",
        "Will I hit my savings goals on time?",
        "Log $42 for dinner with friends"
      ],
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Financial Telemetry calculations
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalBalance = totalIncome - totalExpenses;

  // Build telemetry context
  const getFinancialContext = () => {
    // Recent 15 transactions
    const recent = transactions.slice(0, 15).map(t => ({
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date?.toDate ? t.date.toDate().toISOString().split('T')[0] : 'Recent'
    }));

    // Category spending summary
    const categorySpending: Record<string, number> = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

    const budgetStatus = budgets.map(b => ({
      category: b.category,
      limit: b.amount,
      spent: categorySpending[b.category] || 0
    }));

    const goalsSummary = savingsGoals.map(g => ({
      title: g.title,
      target: g.targetAmount,
      saved: g.currentAmount,
      category: g.category,
      targetDate: g.targetDate?.toDate ? g.targetDate.toDate().toISOString().split('T')[0] : 'Unknown'
    }));

    const emisSummary = emis.map(e => ({
      name: e.title,
      monthlyAmount: e.monthlyInstallment,
      remainingTenure: e.tenure - e.paidInstallments
    }));

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      netSavingsRate: totalIncome > 0 ? `${Math.round(((totalIncome - totalExpenses) / totalIncome) * 100)}%` : '0%',
      categorySpending,
      budgets: budgetStatus,
      savingsGoals: goalsSummary,
      activeEMIs: emisSummary,
      debtCount: debts.length,
      recentTransactions: recent
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Handle Quick Action Parser
  const handleParseQuickAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickInput.trim()) return;

    setIsParsingQuick(true);
    setQuickParseResult(null);

    try {
      const res = await apiFetch('/api/gemini/parse-quick-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: quickInput })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setQuickParseResult(json.data);
      } else {
        // Fallback simple parser
        fallbackQuickParse(quickInput);
      }
    } catch (err) {
      console.warn("AI quick parse failed, falling back to local regex:", err);
      fallbackQuickParse(quickInput);
    } finally {
      setIsParsingQuick(false);
    }
  };

  const fallbackQuickParse = (input: string) => {
    const amountMatch = input.match(/\$?(\d+(\.\d{1,2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
    const isIncome = /earned|salary|received|income|deposit|\+/i.test(input);
    const category = /coffee|lunch|dinner|food|groceries|snack|burger/i.test(input) ? 'Food'
      : /uber|gas|fuel|bus|flight|train|metro/i.test(input) ? 'Transport'
      : /rent|utility|wifi|electric/i.test(input) ? 'Rent'
      : /movie|game|netflix|spotify/i.test(input) ? 'Entertainment'
      : isIncome ? 'Income' : 'Other';

    setQuickParseResult({
      actionType: 'transaction',
      summary: `Parsed $${amount} ${category} entry`,
      transaction: {
        type: isIncome ? 'income' : 'expense',
        amount: amount || 10,
        category,
        description: input,
        date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleExecuteQuickParsed = () => {
    if (!quickParseResult) return;

    if (quickParseResult.actionType === 'transaction' && quickParseResult.transaction) {
      const tx = quickParseResult.transaction;
      onAddTransaction({
        amount: tx.amount,
        category: tx.category || 'Other',
        description: tx.description || 'Quick entry',
        type: tx.type || 'expense',
        date: tx.date ? Timestamp.fromDate(new Date(tx.date)) : Timestamp.now()
      });
      setQuickInput('');
      setQuickParseResult(null);
      // Also add confirmation to chat history
      setMessages(prev => [
        ...prev,
        {
          id: 'quick_' + Date.now(),
          role: 'model',
          text: `✅ **Recorded entry:** Added **$${tx.amount.toFixed(2)}** (${tx.category}) to your ledger via Quick Command.`,
          timestamp: new Date()
        }
      ]);
    } else if (quickParseResult.actionType === 'goal' && quickParseResult.goal && onAddSavingsGoal) {
      const g = quickParseResult.goal;
      onAddSavingsGoal({
        title: g.title || 'New Savings Target',
        targetAmount: g.targetAmount || 1000,
        currentAmount: 0,
        category: (g.category as any) || 'General',
        targetDate: g.targetDate ? Timestamp.fromDate(new Date(g.targetDate)) : Timestamp.fromDate(new Date(Date.now() + 180 * 86400000)),
        priority: g.priority || 'medium',
        status: 'active',
        notes: 'Created via Frenzo Copilot'
      });
      setQuickInput('');
      setQuickParseResult(null);
      setMessages(prev => [
        ...prev,
        {
          id: 'quick_' + Date.now(),
          role: 'model',
          text: `🎯 **Milestone created:** Added **${g.title}** ($${g.targetAmount.toLocaleString()}) to your visual Savings Roadmap.`,
          timestamp: new Date()
        }
      ]);
    }
  };

  // Handle Conversational Chat submission
  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || inputMessage;
    if (!text.trim() || isThinking) return;

    const userMsg: ChatMessage = {
      id: 'user_' + Date.now(),
      role: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsThinking(true);

    try {
      const context = getFinancialContext();
      const history = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await apiFetch('/api/gemini/copilot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          financialContext: context
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        const replyMsg: ChatMessage = {
          id: 'model_' + Date.now(),
          role: 'model',
          text: json.data.reply || "I've analyzed your telemetry and updated calculations.",
          actionProposal: json.data.actionProposal?.type !== 'none' ? json.data.actionProposal : undefined,
          suggestedQueries: json.data.suggestedQueries,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, replyMsg]);
      } else {
        throw new Error(json.error || 'Copilot service returned an error');
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'model',
          text: `⚠️ **Copilot System Notice:** ${err.message || 'Unable to reach Copilot engine.'}\n\n*Your telemetry is safely cached locally. You can continue using quick entry commands.*`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleExecuteChatAction = (msgId: string, proposal: ChatMessage['actionProposal']) => {
    if (!proposal) return;

    if (proposal.type === 'add_transaction' && proposal.transactionData) {
      const tx = proposal.transactionData;
      onAddTransaction({
        amount: tx.amount,
        category: tx.category || 'Other',
        description: tx.description || 'Copilot Entry',
        type: tx.type || 'expense',
        date: tx.date ? Timestamp.fromDate(new Date(tx.date)) : Timestamp.now()
      });
    } else if (proposal.type === 'create_goal' && proposal.goalData && onAddSavingsGoal) {
      const g = proposal.goalData;
      onAddSavingsGoal({
        title: g.title,
        targetAmount: g.targetAmount,
        currentAmount: 0,
        category: (g.category as any) || 'General',
        targetDate: g.targetDate ? Timestamp.fromDate(new Date(g.targetDate)) : Timestamp.fromDate(new Date(Date.now() + 180 * 86400000)),
        priority: g.priority || 'medium',
        status: 'active',
        notes: 'Created via Copilot proposal'
      });
    }

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, executed: true } : m));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl h-[88vh] max-h-[850px] bg-tech-card clay-card border border-tech-lime/30 rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-tech-header border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)]">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black uppercase tracking-wider text-white font-brand">
                  Frenzo Financial Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-tech-lime/20 text-tech-lime border border-tech-lime/40">
                  Gemini 3.6 Flash
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-0.5">
                <span>Balance: <strong className="text-tech-lime">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>•</span>
                <span>{savingsGoals.length} Goals Active</span>
                <span>•</span>
                <span>{budgets.length} Budgets</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Action NLP Entry Bar */}
        <div className="px-6 py-3 bg-tech-inset/60 border-b border-white/5 shrink-0">
          <form onSubmit={handleParseQuickAction} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tech-lime">
                <Zap size={16} />
              </div>
              <input
                type="text"
                placeholder="Natural entry command: e.g. 'Spent $42.50 at Whole Foods' or 'Save $2500 for Tokyo by Dec'..."
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-tech-card border border-white/10 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-tech-lime"
              />
              <button
                type="submit"
                disabled={isParsingQuick || !quickInput.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-tech-lime text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1"
              >
                {isParsingQuick ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Quick AI
              </button>
            </div>
          </form>

          {/* Quick Parse Result Execution Banner */}
          <AnimatePresence>
            {quickParseResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2.5 p-3 rounded-xl bg-tech-lime/10 border border-tech-lime/30 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 text-xs font-mono min-w-0">
                  <CheckCircle2 size={16} className="text-tech-lime shrink-0" />
                  <span className="text-slate-200 truncate">{quickParseResult.summary}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setQuickParseResult(null)}
                    className="px-2.5 py-1 text-[10px] font-mono text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleExecuteQuickParsed}
                    className="px-3.5 py-1 bg-tech-lime text-black font-black uppercase text-[10px] tracking-wider rounded-lg hover:brightness-110 shadow-[0_0_10px_rgba(165,243,68,0.3)] flex items-center gap-1"
                  >
                    Execute Command
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((msg) => {
            const isModel = msg.role === 'model';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex items-start gap-3",
                  isModel ? "justify-start" : "justify-end"
                )}
              >
                {isModel && (
                  <div className="p-2 rounded-xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime shrink-0 mt-0.5">
                    <Bot size={18} />
                  </div>
                )}

                <div className={cn(
                  "max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed space-y-3",
                  isModel
                    ? "bg-tech-inset border border-white/10 text-slate-200 shadow-md"
                    : "bg-tech-lime text-black font-medium font-mono shadow-[0_0_20px_rgba(165,243,68,0.15)]"
                )}>
                  {/* Message Content */}
                  <div className={cn(
                    "prose prose-invert max-w-none text-xs",
                    !isModel && "text-black prose-p:text-black prose-strong:text-black font-bold"
                  )}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>

                  {/* Interactive Action Proposal Card */}
                  {msg.actionProposal && (
                    <div className="p-3.5 rounded-xl bg-black/40 border border-tech-lime/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-tech-lime uppercase tracking-widest font-bold flex items-center gap-1.5">
                          <Cpu size={12} /> Proposed Action
                        </span>
                        {msg.executed && (
                          <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Applied to Ledger
                          </span>
                        )}
                      </div>

                      {msg.actionProposal.transactionData && (
                        <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                          <span>
                            {msg.actionProposal.transactionData.description} ({msg.actionProposal.transactionData.category})
                          </span>
                          <span className="font-bold text-tech-lime">
                            ${msg.actionProposal.transactionData.amount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {msg.actionProposal.goalData && (
                        <div className="text-xs font-mono text-slate-300 flex items-center justify-between">
                          <span>Roadmap: {msg.actionProposal.goalData.title}</span>
                          <span className="font-bold text-cyan-400">
                            Target: ${msg.actionProposal.goalData.targetAmount.toLocaleString()}
                          </span>
                        </div>
                      )}

                      {!msg.executed && (
                        <button
                          onClick={() => handleExecuteChatAction(msg.id, msg.actionProposal)}
                          className="w-full py-2 rounded-lg bg-tech-lime text-black font-black uppercase text-[10px] tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(165,243,68,0.2)]"
                        >
                          <CornerDownLeft size={12} />
                          {msg.actionProposal.label || 'Apply to Ledger / Roadmap'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Suggested Follow-up Queries */}
                  {msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">
                        Recommended Next Inquiries:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.suggestedQueries.map((query, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSendMessage(query)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-tech-lime/40 text-[10px] text-slate-300 hover:text-tech-lime font-mono transition-all text-left flex items-center gap-1"
                          >
                            <span>{query}</span>
                            <ChevronRight size={10} className="shrink-0 opacity-60" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="text-[9px] font-mono text-slate-500 block text-right pt-1 opacity-60">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="p-2 rounded-xl bg-tech-lime/15 border border-tech-lime/30 text-tech-lime">
                <Bot size={18} />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-tech-inset border border-white/10 text-xs font-mono text-tech-lime flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin" />
                <span>Computing telemetry & running scenario simulation...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-tech-header border-t border-white/10 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              placeholder="Ask Copilot anything about your finances or request actions..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isThinking}
              className="flex-1 px-4 py-3 bg-tech-inset border border-white/10 rounded-xl text-xs font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-tech-lime disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isThinking}
              className="px-5 py-3 bg-tech-lime text-black font-black uppercase text-xs tracking-wider rounded-xl hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(165,243,68,0.25)]"
            >
              <Send size={15} />
              Ask
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
