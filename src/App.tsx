import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

import EMIManager from './components/EMIManager';
import { AddEMIModal, CreateEMIModal } from './components/EMIModals';
import { AntigravityBackground, BACKGROUND_EFFECTS } from './components/AntigravityBackground';
import { PaymentProfileModal } from './components/PaymentProfileModal';
import { PaymentRequestModal } from './components/PaymentRequestModal';
import { PaymentRequestPassModal } from './components/PaymentRequestPassModal';
import { PaymentRequestsManager } from './components/PaymentRequestsManager';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error && (parsedError.error.includes("permissions") || parsedError.error.includes("insufficient"))) {
          errorMessage = "You don't have permission to access this data. Please check your account settings.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-candy-bg p-4">
          <div className="clay-card p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold text-candy-black mb-4">Oops!</h2>
            <p className="text-black/60 dark:text-white/60 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="clay-button bg-candy-black text-white px-6 py-2 rounded-xl font-bold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import { 
  onAuthStateChanged, 
  User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc,
  Timestamp
} from 'firebase/firestore';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  AreaChart, 
  Area, 
  CartesianGrid 
} from 'recharts';
import { auth, db } from './lib/firebase';
import { Transaction, Budget, Summary, TransactionType, OperationType, Debt, DebtType, Challenge, UserPreferences, EMI, EMIPayment, DebtPayment, PaymentProfile, PaymentRequest, SavingsGoal } from './types';
import { cn } from './lib/utils';
import { SavingsGoalsManager } from './components/SavingsGoalsManager';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { FinancialCopilotModal } from './components/FinancialCopilotModal';
import { CsvImporterModal } from './components/CsvImporterModal';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { 
  Bot,
  FileSpreadsheet,
  Plus, 
  Minus, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  LogOut, 
  LogIn, 
  LayoutDashboard,
  ArrowLeftRight,
  LineChart,
  Scan,
  Wrench,
  User as UserIcon,
  CreditCard,
  History,
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon,
  List, 
  Calendar,
  X,
  Trash2,
  DollarSign,
  IndianRupee,
  Search,
  Filter,
  Sparkles,
  QrCode,
  Square,
  Target,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Calculator,
  HandCoins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRightLeft,
  CalendarDays,
  RotateCcw,
  Check,
  FileText,
  Sun,
  Moon,
  Download,
  DownloadCloud,
  Share2,
  Image as ImageIcon,
  Camera,
  Eye,
  EyeOff,
  Edit2,
  Edit3,
  TypeIcon,
  ShieldCheck,
  Fingerprint,
  Lock,
  Unlock,
  Trophy,
  Activity,
  Zap,
  Flame,
  Settings,
  Palette,
  Layout,
  Dna,
  MoreHorizontal,
  Menu,
  ChevronDown
} from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

const signIn = () => signInWithPopup(auth, new GoogleAuthProvider());
const logOut = () => signOut(auth);

const handleFirestoreError = (error: any, operation: OperationType, path: string) => {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType: operation,
    path
  };
  
  if (errInfo.error.includes("permissions") || errInfo.error.includes("insufficient")) {
    console.error(`Firestore ${operation} error at ${path}:`, JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.error(`Firestore ${operation} error at ${path}:`, error);
  }
};

const handleDeleteTransaction = async (id: string) => {
  try {
    await deleteDoc(doc(db, 'transactions', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'transactions');
  }
};

function DynamicBackground({ theme, backgroundEffect }: { theme: string; backgroundEffect?: string }) {
  return <AntigravityBackground theme={theme} backgroundEffect={backgroundEffect} />;
}

function FinancialHealthScore({ 
  transactions, 
  budgets, 
  summary 
}: { 
  transactions: Transaction[], 
  budgets: Budget[], 
  summary: Summary 
}) {
  const calculateScore = () => {
    // 1. Savings Rate (40 points)
    const savingsRate = summary.totalIncome > 0 
      ? Math.max(0, (summary.totalIncome - summary.totalExpenses) / summary.totalIncome) 
      : 0;
    const savingsScore = Math.min(savingsRate * 100, 40);

    // 2. Budget Adherence (30 points)
    let budgetScore = 30;
    if (budgets.length > 0) {
      const exceededBudgets = budgets.filter(budget => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === budget.category)
          .reduce((sum, t) => sum + t.amount, 0);
        return spent > budget.amount;
      }).length;
      budgetScore = Math.max(0, 30 - (exceededBudgets / budgets.length) * 30);
    }

    // 3. Consistency (30 points)
    const last7Days = transactions.filter(t => {
      const diff = Date.now() - t.date.toDate().getTime();
      return diff < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const consistencyScore = Math.min(last7Days * 3, 30);

    return Math.round(savingsScore + budgetScore + consistencyScore);
  };

  const score = calculateScore();
  const getStatus = (s: number) => {
    if (s >= 80) return { label: 'Optimal', color: 'text-tech-lime', bg: 'bg-tech-lime' };
    if (s >= 60) return { label: 'Stable', color: 'text-tech-orange', bg: 'bg-tech-orange' };
    return { label: 'Critical', color: 'text-tech-red', bg: 'bg-tech-red' };
  };

  const status = getStatus(score);

  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className={cn("p-4 rounded-2xl shadow-lg", status.bg, "text-tech-black")}>
            <Activity size={24} />
          </div>
          <div>
            <h3 className="font-brand text-2xl md:text-4xl text-tech-white tracking-tighter">System Health</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Financial Vitality Index</p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn("text-4xl md:text-6xl font-brand tracking-tighter", status.color)}>{score}</span>
          <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest block">/ 100</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-8">
        <div className="relative h-4 bg-tech-inset rounded-full overflow-hidden border border-white/5 p-1">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            className={cn("h-full rounded-full shadow-lg transition-all", status.bg)}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Status', value: status.label, color: status.color },
            { label: 'Efficiency', value: `${Math.round((summary.totalIncome - summary.totalExpenses) / (summary.totalIncome || 1) * 100)}%`, color: 'text-tech-white' },
            { label: 'Risk', value: score < 50 ? 'High' : 'Low', color: score < 50 ? 'text-tech-red' : 'text-tech-lime' }
          ].map((stat, i) => (
            <div key={i} className="bg-tech-inset p-4 rounded-2xl border border-white/5 text-center">
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className={cn("text-xs md:text-lg font-black uppercase tracking-tight", stat.color)}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-10 p-4 bg-tech-lime/5 border border-tech-lime/10 rounded-2xl">
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
          {score >= 80 ? "System operating at peak efficiency. All parameters within optimal range." : 
           score >= 60 ? "System stable, but minor optimizations recommended in budget adherence." : 
           "Critical alert: High burn rate detected. Immediate operational adjustment required."}
        </p>
      </div>
    </div>
  );
}

function RecentActivity({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex items-center justify-between mb-8">
        <h4 className="font-brand text-xl text-tech-white tracking-tighter">Recent Activity</h4>
        <Activity size={18} className="text-tech-lime" />
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
        {transactions.slice(0, 5).map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-3 bg-tech-inset rounded-xl border border-white/5 hover:border-tech-lime/30 transition-all">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black",
                tx.type === 'income' ? "bg-tech-lime/10 text-tech-lime" : "bg-tech-orange/10 text-tech-orange"
              )}>
                {tx.type === 'income' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </div>
              <div>
                <div className="text-[10px] font-black text-tech-white uppercase tracking-tight truncate max-w-[120px]">{tx.description}</div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{tx.category}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("text-[10px] font-black", tx.type === 'income' ? "text-tech-lime" : "text-tech-orange")}>
                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
              </div>
              <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                {tx.date.toDate().toLocaleDateString()}
              </div>
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No recent activity.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChallengesWidget({ challenges }: { challenges: Challenge[] }) {
  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex items-center justify-between mb-8">
        <h4 className="font-brand text-xl text-tech-white tracking-tighter">Active Goals</h4>
        <Trophy size={18} className="text-tech-lime" />
      </div>
      <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
        {challenges.map(challenge => (
          <div key={challenge.id} className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-400">{challenge.title}</span>
              <span className="text-tech-white">{Math.round((challenge.currentAmount / challenge.targetAmount) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-tech-inset rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(challenge.currentAmount / challenge.targetAmount) * 100}%` }}
                className="h-full bg-tech-lime shadow-[0_0_10px_rgba(165,243,68,0.3)]"
              />
            </div>
            <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <span>{formatCurrency(challenge.currentAmount)}</span>
              <span>Target: {formatCurrency(challenge.targetAmount)}</span>
            </div>
          </div>
        ))}
        {challenges.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No active goals.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DebtMatrix({ debts }: { debts: Debt[] }) {
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
  const percentPaid = totalDebt > 0 ? (totalPaid / totalDebt) * 100 : 0;

  return (
    <div className="flex flex-col h-full relative z-10">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-tech-orange/10 rounded-xl border border-tech-orange/20 text-tech-orange">
          <HandCoins size={20} />
        </div>
        <div>
          <h3 className="font-brand text-xl md:text-3xl text-tech-white tracking-tighter leading-none">Debt Matrix</h3>
          <p className="text-slate-500 text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Liability Tracking</p>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <div className="bg-tech-inset p-6 rounded-2xl border border-white/5">
          <div className="flex justify-between items-end mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Liability</span>
            <span className="text-xl font-brand text-tech-white">{formatCurrency(totalDebt - totalPaid)}</span>
          </div>
          <div className="h-2 bg-tech-bg rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${percentPaid}%` }}
              className="h-full bg-tech-orange shadow-[0_0_10px_rgba(255,107,0,0.5)]"
            />
          </div>
          <div className="flex justify-between mt-2 text-[8px] font-black text-slate-600 uppercase tracking-widest">
            <span>{Math.round(percentPaid)}% Resolved</span>
            <span>{formatCurrency(totalPaid)} Paid</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
          {debts.length > 0 ? (
            debts.map(debt => (
              <div key={debt.id} className="flex items-center justify-between p-3 bg-tech-inset rounded-xl border border-white/5 hover:border-tech-orange/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-tech-gray flex items-center justify-center text-[10px] font-black text-tech-orange">
                    {debt.person[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-tech-white uppercase tracking-tight">{debt.person}</div>
                    <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                      {debt.dueDate ? `Due ${debt.dueDate.toDate().toLocaleDateString()}` : 'No due date'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-tech-white">{formatCurrency(debt.amount - (debt.paidAmount || 0))}</div>
                  <div className="text-[8px] text-tech-orange font-black uppercase tracking-widest">{debt.type}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-dashed border-white/5 rounded-xl">
              No active liabilities.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastLoginDate) {
          parsed.lastLoginDate = new Timestamp(parsed.lastLoginDate.seconds, parsed.lastLoginDate.nanoseconds);
        }
        // Ensure new properties have defaults
        if (parsed.glassMode === undefined) parsed.glassMode = false;
        if (parsed.isDynamicTheme === undefined) parsed.isDynamicTheme = true;
        if (parsed.backgroundEffect === undefined) parsed.backgroundEffect = 'antigravity';
        return parsed;
      }
    }
    return {
      theme: 'emerald',
      mode: 'dark',
      glassMode: false,
      motivationStyle: 'challenges',
      streakCount: 0,
      lastLoginDate: Timestamp.now(),
      isDynamicTheme: true,
      backgroundEffect: 'antigravity'
    };
  });

  const handleUpdatePreferences = (p: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...p }));
  };

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [emis, setEmis] = useState<EMI[]>([]);
  const [emiPayments, setEmiPayments] = useState<EMIPayment[]>([]);
  
  // Savings Goals & Receipt Scanner States
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('user_savings_goals');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      {
        id: 'goal_1',
        title: 'Emergency Fund (6 Months)',
        category: 'Emergency',
        targetAmount: 15000,
        currentAmount: 9200,
        targetDate: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)),
        priority: 'high',
        notes: 'Safe liquidity cushion for unforeseen expenses',
        status: 'active',
        uid: 'demo'
      },
      {
        id: 'goal_2',
        title: 'Tech Upgrade & Workstation',
        category: 'Tech',
        targetAmount: 3500,
        currentAmount: 2450,
        targetDate: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        priority: 'medium',
        notes: 'High-performance workstation setup',
        status: 'active',
        uid: 'demo'
      },
      {
        id: 'goal_3',
        title: 'Tokyo & Kyoto Vacation',
        category: 'Travel',
        targetAmount: 5000,
        currentAmount: 5000,
        targetDate: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
        priority: 'medium',
        notes: 'Autumn travel and bullet train pass',
        status: 'achieved',
        uid: 'demo'
      }
    ];
  });
  const [showReceiptScannerModal, setShowReceiptScannerModal] = useState(false);
  const [showFinancialCopilotModal, setShowFinancialCopilotModal] = useState(false);
  const [showCsvImporterModal, setShowCsvImporterModal] = useState(false);

  // Payment Request & UPI QR States
  const [paymentProfile, setPaymentProfile] = useState<PaymentProfile | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [showPaymentProfileModal, setShowPaymentProfileModal] = useState(false);
  const [showPaymentRequestModal, setShowPaymentRequestModal] = useState(false);
  const [selectedPaymentRequestForPass, setSelectedPaymentRequestForPass] = useState<PaymentRequest | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showAddEMIModal, setShowAddEMIModal] = useState(false);
  const [showCreateEMIModal, setShowCreateEMIModal] = useState(false);
  const [showUpdateDebtModal, setShowUpdateDebtModal] = useState(false);
  const [selectedDebtForUpdate, setSelectedDebtForUpdate] = useState<Debt | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'tools' | 'debts' | 'emis' | 'analysis' | 'settings' | 'profile' | 'requests' | 'goals'>('dashboard');
  
  // Biometric Lock State
  const [isBiometricEnabled, setIsBiometricEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('biometric_enabled') === 'true';
    }
    return false;
  });
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isBiometricSupported, setIsBiometricSupported] = useState<boolean>(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // AI Insights State
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth Error:", error);
      let message = "Authentication failed.";
      if (error.code === 'auth/user-not-found') message = "No operator found with this email.";
      if (error.code === 'auth/wrong-password') message = "Incorrect password.";
      if (error.code === 'auth/email-already-in-use') message = "Email already registered. Try signing in instead.";
      if (error.code === 'auth/weak-password') message = "Password too weak. Must be at least 6 characters.";
      if (error.code === 'auth/operation-not-allowed') message = "CRITICAL: Email/Password sign-in is disabled in Firebase Console > Authentication > Sign-in method.";
      if (error.code === 'auth/unauthorized-domain') message = "CRITICAL: Domain not authorized. Add this URL to 'Authorized domains' in Firebase Console > Authentication > Settings.";
      if (error.code === 'auth/invalid-credential') message = "Invalid email or password credentials.";
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          const provider = new GoogleAuthProvider();
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error("Redirect Google Auth Error:", redirectError);
        }
      }
      
      let message = "Google Sign-In failed.";
      if (error.code === 'auth/popup-blocked') {
        message = "Popup blocked by browser. Redirecting to Google...";
      } else if (error.code === 'auth/popup-closed-by-user') {
        message = "Google Sign-In popup was closed before completing.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Domain not authorized in Firebase Console. Add this domain to Authorized Domains in Firebase Console > Authentication > Settings.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google Sign-In provider is disabled. Enable Google in Firebase Console > Authentication > Sign-in method.";
      } else if (error.message) {
        message = `Google Login Error: ${error.message}`;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleDemoAuth = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    const demoEmail = 'operator.demo@frenzo.app';
    const demoPass = 'frenzo2026demo';
    try {
      await signInWithEmailAndPassword(auth, demoEmail, demoPass);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPass);
        } catch (createErr: any) {
          setAuthError("Could not create demo session. Try Guest Access instead.");
        }
      } else {
        setAuthError("Demo access error. Using Guest mode...");
        await handleGuestAuth();
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error: any) {
      console.error("Guest Auth Error:", error);
      let message = "Guest Access sign-in failed.";
      if (error.code === 'auth/operation-not-allowed') {
        message = "Anonymous sign-in disabled. Enable 'Anonymous' in Firebase Console > Authentication > Sign-in method.";
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute('data-theme', preferences.theme);
    root.setAttribute('data-mode', preferences.mode);
    root.setAttribute('data-glass', preferences.glassMode ? 'true' : 'false');
    localStorage.setItem('user_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'challenges'), where('uid', '==', user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setChallenges(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Challenge)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'challenges'));
      return () => unsubscribe();
    }
  }, [user]);

  // Streak Logic
  useEffect(() => {
    if (user && !loading) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastLogin = preferences.lastLoginDate.toDate();
      lastLogin.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - lastLogin.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        setPreferences(prev => ({
          ...prev,
          streakCount: prev.streakCount + 1,
          lastLoginDate: Timestamp.now()
        }));
      } else if (diffDays > 1) {
        setPreferences(prev => ({
          ...prev,
          streakCount: 1,
          lastLoginDate: Timestamp.now()
        }));
      } else if (diffDays === 0 && preferences.streakCount === 0) {
        setPreferences(prev => ({
          ...prev,
          streakCount: 1,
          lastLoginDate: Timestamp.now()
        }));
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
    
    if (isBiometricEnabled) {
      setIsLocked(true);
    }
  }, [isBiometricEnabled]);

  const handleUnlock = async () => {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: []
        }
      });
      
      setIsLocked(false);
    } catch (error) {
      console.error("Biometric unlock failed:", error);
      // Fallback or just stay locked
    }
  };

  const toggleBiometric = async () => {
    if (!isBiometricEnabled) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        // Simple registration to verify biometric capability
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Pure Finance" },
            user: {
              id: new Uint8Array(16),
              name: user?.email || "user",
              displayName: user?.email || "User"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            timeout: 60000,
            attestation: "none",
            authenticatorSelection: {
              userVerification: "required",
              residentKey: "required"
            }
          }
        });
        
        setIsBiometricEnabled(true);
        localStorage.setItem('biometric_enabled', 'true');
      } catch (error) {
        console.error("Biometric registration failed:", error);
      }
    } else {
      setIsBiometricEnabled(false);
      localStorage.setItem('biometric_enabled', 'false');
    }
  };

  const toggleTheme = () => {
    setPreferences(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light'
    }));
  };

  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setBudgets([]);
      return;
    }

    // Transactions listener
    const qTxs = query(
      collection(db, 'transactions'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeTxs = onSnapshot(qTxs, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date as Timestamp
      })) as Transaction[];
      setTransactions(txs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    // Budgets listener
    const qBudgets = query(
      collection(db, 'budgets'),
      where('uid', '==', user.uid)
    );

    const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
      const bgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Budget[];
      setBudgets(bgs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'budgets');
    });

    // Debts listener
    const qDebts = query(
      collection(db, 'debts'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc')
    );

    const unsubscribeDebts = onSnapshot(qDebts, (snapshot) => {
      const dbs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Debt[];
      setDebts(dbs);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'debts');
    });

    // Debt Payments listener
    const qDebtPayments = query(
      collection(db, 'debtPayments'),
      where('uid', '==', user.uid)
    );

    const unsubscribeDebtPayments = onSnapshot(qDebtPayments, (snapshot) => {
      const dps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date as Timestamp
      })) as DebtPayment[];
      dps.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setDebtPayments(dps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'debtPayments');
    });

    // EMIs listener
    const qEmis = query(
      collection(db, 'emis'),
      where('uid', '==', user.uid)
    );

    const unsubscribeEmis = onSnapshot(qEmis, (snapshot) => {
      const ems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate as Timestamp,
        nextDueDate: doc.data().nextDueDate as Timestamp
      })) as EMI[];
      ems.sort((a, b) => b.startDate.toMillis() - a.startDate.toMillis());
      setEmis(ems);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'emis');
    });

    // EMI Payments listener
    const qEmiPayments = query(
      collection(db, 'emiPayments'),
      where('uid', '==', user.uid)
    );

    const unsubscribeEmiPayments = onSnapshot(qEmiPayments, (snapshot) => {
      const eps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date as Timestamp
      })) as EMIPayment[];
      eps.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setEmiPayments(eps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'emiPayments');
    });

    // Payment Profile listener
    const qPaymentProfiles = query(
      collection(db, 'payment_profiles'),
      where('uid', '==', user.uid)
    );
    const unsubscribePaymentProfiles = onSnapshot(qPaymentProfiles, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        const loadedProfile = { id: docData.id, ...docData.data() } as PaymentProfile;
        setPaymentProfile(loadedProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_payment_profile', JSON.stringify(loadedProfile));
        }
      }
    }, (error) => {
      console.warn("Payment profiles listener warning:", error);
    });

    // Payment Requests listener
    const qPaymentRequests = query(
      collection(db, 'payment_requests'),
      where('uid', '==', user.uid)
    );
    const unsubscribePaymentRequests = onSnapshot(qPaymentRequests, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date as Timestamp
      })) as PaymentRequest[];
      reqs.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0));
      setPaymentRequests(reqs);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_payment_requests', JSON.stringify(reqs));
      }
    }, (error) => {
      console.warn("Payment requests listener warning:", error);
    });

    // Savings Goals listener
    const qSavingsGoals = query(
      collection(db, 'savings_goals'),
      where('uid', '==', user.uid)
    );
    const unsubscribeSavingsGoals = onSnapshot(qSavingsGoals, (snapshot) => {
      if (!snapshot.empty) {
        const goalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          targetDate: doc.data().targetDate as Timestamp
        })) as SavingsGoal[];
        setSavingsGoals(goalsData);
        if (typeof window !== 'undefined') {
          localStorage.setItem('user_savings_goals', JSON.stringify(goalsData));
        }
      }
    }, (error) => {
      console.warn("Savings goals listener warning:", error);
    });

    return () => {
      unsubscribeTxs();
      unsubscribeBudgets();
      unsubscribeDebts();
      unsubscribeDebtPayments();
      unsubscribeEmis();
      unsubscribeEmiPayments();
      unsubscribePaymentProfiles();
      unsubscribePaymentRequests();
      unsubscribeSavingsGoals();
    };
  }, [user]);

  // Local Storage initialization for guest / offline mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfile = localStorage.getItem('user_payment_profile');
      if (savedProfile) {
        try {
          setPaymentProfile(JSON.parse(savedProfile));
        } catch (e) {}
      }
      const savedRequests = localStorage.getItem('user_payment_requests');
      if (savedRequests) {
        try {
          const parsed = JSON.parse(savedRequests);
          setPaymentRequests(parsed.map((r: any) => ({
            ...r,
            date: r.date?.seconds ? new Timestamp(r.date.seconds, r.date.nanoseconds) : Timestamp.now()
          })));
        } catch (e) {}
      }
    }
  }, []);

  const handleSavePaymentProfile = async (updatedData: Partial<PaymentProfile>) => {
    const uid = user ? user.uid : 'guest';
    const newProfile: PaymentProfile = {
      uid,
      upiId: updatedData.upiId || '',
      accountHolderName: updatedData.accountHolderName || '',
      bankName: updatedData.bankName || '',
      accountNumber: updatedData.accountNumber || '',
      ifscCode: updatedData.ifscCode || '',
      qrImageUrl: updatedData.qrImageUrl || '',
      updatedAt: Timestamp.now()
    };

    setPaymentProfile(newProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_payment_profile', JSON.stringify(newProfile));
    }

    if (user) {
      try {
        if (paymentProfile?.id) {
          await updateDoc(doc(db, 'payment_profiles', paymentProfile.id), newProfile as any);
        } else {
          const docRef = await addDoc(collection(db, 'payment_profiles'), newProfile);
          setPaymentProfile({ ...newProfile, id: docRef.id });
        }
      } catch (err) {
        console.error("Error saving payment profile to Firestore:", err);
      }
    }
  };

  const handleCreatePaymentRequest = async (
    requestData: Omit<PaymentRequest, 'id' | 'uid' | 'date'>,
    createDebtsAlso: boolean
  ) => {
    const uid = user ? user.uid : 'guest';
    const newReq: PaymentRequest = {
      ...requestData,
      uid,
      date: Timestamp.now(),
      status: 'pending'
    };

    let createdId = 'req_' + Date.now();
    if (user) {
      try {
        const docRef = await addDoc(collection(db, 'payment_requests'), newReq);
        createdId = docRef.id;
        newReq.id = createdId;
      } catch (err) {
        console.error("Error adding payment request to Firestore:", err);
        newReq.id = createdId;
      }
    } else {
      newReq.id = createdId;
    }

    setPaymentRequests(prev => [newReq, ...prev]);
    if (typeof window !== 'undefined') {
      const updatedList = [newReq, ...paymentRequests];
      localStorage.setItem('user_payment_requests', JSON.stringify(updatedList));
    }

    // Automatically create lending entries in Debts if requested
    if (createDebtsAlso && user) {
      try {
        if (newReq.requestType === 'single') {
          const personName = newReq.payerName || 'Payer';
          const debtData: Omit<Debt, 'id'> = {
            type: 'lend',
            person: personName,
            amount: newReq.totalAmount,
            status: 'pending',
            uid: user.uid,
            description: `Payment Request: ${newReq.title}`,
            date: Timestamp.now(),
            paidAmount: 0
          };
          await addDoc(collection(db, 'debts'), debtData);
        } else if (newReq.requestType === 'split' && newReq.splitBreakdown) {
          for (const p of newReq.splitBreakdown) {
            const debtData: Omit<Debt, 'id'> = {
              type: 'lend',
              person: p.name,
              amount: p.amount,
              status: 'pending',
              uid: user.uid,
              description: `Split Bill: ${newReq.title}`,
              date: Timestamp.now(),
              paidAmount: 0
            };
            await addDoc(collection(db, 'debts'), debtData);
          }
        }
      } catch (debtErr) {
        console.error("Error creating linked debts:", debtErr);
      }
    }

    // Pop up the request voucher pass modal immediately!
    setSelectedPaymentRequestForPass(newReq);
  };

  const handleMarkPaymentRequestAsPaid = async (request: PaymentRequest) => {
    if (!request.id) return;
    const updated = { ...request, status: 'paid' as const };
    setPaymentRequests(prev => prev.map(r => r.id === request.id ? updated : r));
    if (selectedPaymentRequestForPass?.id === request.id) {
      setSelectedPaymentRequestForPass(updated);
    }

    if (user && request.id && !request.id.startsWith('req_')) {
      try {
        await updateDoc(doc(db, 'payment_requests', request.id), { status: 'paid' });
      } catch (err) {
        console.error("Error updating payment request status in Firestore:", err);
      }
    }
  };

  const handleDeletePaymentRequest = async (requestId: string) => {
    setPaymentRequests(prev => prev.filter(r => r.id !== requestId));
    if (user && !requestId.startsWith('req_')) {
      try {
        await deleteDoc(doc(db, 'payment_requests', requestId));
      } catch (err) {
        console.error("Error deleting payment request from Firestore:", err);
      }
    }
  };

  const summary: Summary = transactions.reduce((acc, tx) => {
    if (tx.type === 'income') {
      acc.totalIncome += tx.amount;
      acc.totalBalance += tx.amount;
    } else {
      acc.totalExpenses += tx.amount;
      acc.totalBalance -= tx.amount;
    }
    return acc;
  }, { totalBalance: 0, totalIncome: 0, totalExpenses: 0 });

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.description.toLowerCase().includes(searc
