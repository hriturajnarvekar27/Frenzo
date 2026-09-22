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
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { 
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

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
    const matchesSearch = tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || tx.type === filterType;
    const matchesCategory = filterCategory === 'all' || tx.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const filteredStats = filteredTransactions.reduce((acc, tx) => {
    if (tx.type === 'income') acc.income += tx.amount;
    else acc.expense += tx.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const generateAIInsights = async () => {
    if (transactions.length === 0) return;
    setIsGeneratingAI(true);
    try {
      const txData = transactions.slice(0, 20).map(t => ({
        type: t.type,
        amount: t.amount,
        category: t.category,
        date: format(t.date.toDate(), 'yyyy-MM-dd')
      }));

      const result = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{
          role: 'user',
          parts: [{
            text: `Analyze my recent transactions and give me 3 brief, actionable financial tips. 
            Format the response in Markdown with a friendly tone.
            Transactions: ${JSON.stringify(txData)}`
          }]
        }]
      });
      setAiInsight(result.text);
    } catch (error) {
      console.error("AI Insight Error:", error);
      setAiInsight("Unable to generate insights at this time. Please try again later.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    
    const headers = ['Date', 'Description', 'Category', 'Type', 'Amount'];
    const rows = transactions.map(tx => [
      format(tx.date.toDate(), 'yyyy-MM-dd HH:mm:ss'),
      tx.description,
      tx.category,
      tx.type,
      tx.amount
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `frenzo_export_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Savings Goal Handlers
  const handleAddSavingsGoal = async (goalData: Omit<SavingsGoal, 'id' | 'uid'>) => {
    if (!user) {
      const fallbackGoal: SavingsGoal = {
        id: 'goal_' + Date.now(),
        ...goalData,
        uid: 'demo'
      };
      setSavingsGoals(prev => [...prev, fallbackGoal]);
      return;
    }
    try {
      const newDoc = {
        ...goalData,
        uid: user.uid,
      };
      const docRef = await addDoc(collection(db, 'savings_goals'), newDoc);
      setSavingsGoals(prev => [...prev, { id: docRef.id, ...newDoc }]);
    } catch (err) {
      console.error("Failed to add savings goal:", err);
      const fallbackGoal: SavingsGoal = {
        id: 'goal_' + Date.now(),
        ...goalData,
        uid: user.uid
      };
      setSavingsGoals(prev => [...prev, fallbackGoal]);
    }
  };

  const handleUpdateSavingsGoal = async (id: string, goalUpdates: Partial<SavingsGoal>) => {
    setSavingsGoals(prev => prev.map(g => g.id === id ? { ...g, ...goalUpdates } : g));
    if (!user) return;
    try {
      const docRef = doc(db, 'savings_goals', id);
      await updateDoc(docRef, goalUpdates);
    } catch (err) {
      console.error("Failed to update savings goal:", err);
    }
  };

  const handleDeleteSavingsGoal = async (id: string) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'savings_goals', id));
    } catch (err) {
      console.error("Failed to delete savings goal:", err);
    }
  };

  const handleDepositSavingsGoal = async (goalId: string, amount: number, note?: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    const newAmount = goal.currentAmount + amount;
    const isAchieved = newAmount >= goal.targetAmount;
    await handleUpdateSavingsGoal(goalId, {
      currentAmount: newAmount,
      status: isAchieved ? 'achieved' : goal.status,
    });
  };

  const handleWithdrawSavingsGoal = async (goalId: string, amount: number, note?: string) => {
    const goal = savingsGoals.find(g => g.id === goalId);
    if (!goal) return;
    const newAmount = Math.max(0, goal.currentAmount - amount);
    await handleUpdateSavingsGoal(goalId, {
      currentAmount: newAmount,
      status: 'active',
    });
  };

  const handleAddExpenseFromScan = async (expenseData: {
    amount: number;
    category: string;
    description: string;
    date: Timestamp;
    type: 'expense';
  }) => {
    if (user) {
      try {
        await addDoc(collection(db, 'transactions'), {
          ...expenseData,
          uid: user.uid,
        });
      } catch (e) {
        console.error("Failed to save scanned transaction:", e);
      }
    } else {
      setTransactions(prev => [{
        id: 'tx_scan_' + Date.now(),
        ...expenseData,
        uid: 'demo'
      }, ...prev]);
    }
    setShowReceiptScannerModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tech-bg flex items-center justify-center">
        <div className="animate-pulse rounded-full h-20 w-20 bg-tech-lime flex items-center justify-center shadow-[0_0_50px_rgba(165,243,68,0.3)]">
          <Wallet className="text-tech-black w-10 h-10" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-tech-bg flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
        <AntigravityBackground theme="emerald" backgroundEffect={preferences?.backgroundEffect || 'antigravity'} />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-tech-card clay-card p-8 md:p-12 text-center relative overflow-hidden group border border-white/10"
        >
          {/* Decorative Elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-tech-lime/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-tech-orange/5 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-tech-lime rounded-2xl flex items-center justify-center mx-auto mb-8 md:mb-10 shadow-[0_0_40px_rgba(165,243,68,0.2)] relative group-hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 border-4 border-white/20 rounded-2xl animate-pulse" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-2 bg-tech-black rounded-full" />
                <div className="w-10 h-2 bg-tech-black rounded-full ml-2" />
                <div className="w-6 h-2 bg-tech-black rounded-full mr-4" />
              </div>
            </div>
            <h1 className="font-brand text-5xl md:text-8xl text-tech-white mb-2 md:mb-4 tracking-tighter">Frenzo</h1>
            <p className="text-slate-500 mb-8 md:mb-12 text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">Operational Financial Intelligence.</p>
            
            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-tech-black/50 border border-white/10 rounded-xl px-4 py-4 text-tech-white text-xs font-black tracking-widest focus:outline-none focus:border-tech-lime transition-colors"
                  required
                />
                
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="PASSWORD"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-tech-black/50 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-tech-white text-xs font-black tracking-widest focus:outline-none focus:border-tech-lime transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-tech-lime p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} className="text-tech-lime" /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              {authError && (
                <div className="p-3 bg-tech-orange/10 border border-tech-orange/30 rounded-xl space-y-2 text-left">
                  <p className="text-tech-orange text-[10px] font-black uppercase tracking-widest leading-relaxed">{authError}</p>
                  <a 
                    href="https://console.firebase.google.com/project/_/authentication/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block text-[8px] text-slate-400 hover:text-tech-lime underline underline-offset-4 transition-colors font-black uppercase tracking-widest"
                  >
                    Firebase Auth Settings
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full py-4 bg-tech-white text-tech-black rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
              >
                {isAuthLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/5"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-[0.3em]">
                <span className="bg-tech-card px-4 text-slate-600">MORE LOGIN OPTIONS</span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isAuthLoading}
                className="w-full py-4 bg-tech-black border border-white/10 text-tech-white rounded-xl font-black flex items-center justify-center gap-4 hover:bg-white/5 hover:border-tech-lime/30 transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Google Access</span>
              </button>

              <button
                type="button"
                onClick={handleDemoAuth}
                disabled={isAuthLoading}
                className="w-full py-4 bg-tech-inset border border-tech-lime/40 text-tech-lime rounded-xl font-black flex items-center justify-center gap-3 hover:bg-tech-lime/10 transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50 shadow-[0_0_20px_rgba(165,243,68,0.15)]"
              >
                <Sparkles size={18} className="shrink-0 text-tech-lime" />
                <span>1-Click Demo Operator Log</span>
              </button>

              <button
                type="button"
                onClick={handleGuestAuth}
                disabled={isAuthLoading}
                className="w-full py-4 bg-tech-gray/50 border border-white/10 text-slate-300 rounded-xl font-black flex items-center justify-center gap-3 hover:bg-white/5 transition-all active:scale-95 uppercase tracking-widest text-xs disabled:opacity-50"
              >
                <Zap size={18} className="shrink-0 text-tech-orange" />
                <span>Instant Guest Access</span>
              </button>
            </div>

            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="mt-6 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-tech-lime transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : 'New operator? Create Account'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        className="min-h-screen bg-tech-bg text-tech-white font-sans selection:bg-tech-lime selection:text-tech-black pb-20"
        data-theme={preferences.theme}
        data-mode={preferences.mode}
        data-glass={preferences.glassMode}
      >
      {(preferences.isDynamicTheme ?? true) && <DynamicBackground theme={preferences.theme} backgroundEffect={preferences.backgroundEffect} />}
      {/* Header */}
      <header className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 md:gap-4 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-tech-lime rounded-lg md:rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(165,243,68,0.3)] relative overflow-hidden group-hover:scale-110 transition-transform">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-4 h-0.5 md:w-5 md:h-1 bg-tech-black rounded-full" />
              <div className="w-4 h-0.5 md:w-5 md:h-1 bg-tech-black rounded-full ml-1" />
              <div className="w-2 h-0.5 md:w-3 md:h-1 bg-tech-black rounded-full mr-2" />
            </div>
          </div>
          <span className="font-brand text-xl md:text-3xl text-tech-white tracking-tighter group-hover:text-tech-lime transition-colors">Frenzo</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {/* Quick Live Theme Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
              className={cn(
                "p-2 md:p-3.5 bg-tech-card clay-card rounded-full transition-all border-tech-lime/20 flex items-center gap-1.5",
                showBackgroundPicker ? "text-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)] border-tech-lime" : "text-slate-400 hover:text-tech-lime"
              )}
              title="Change Live Background Theme"
            >
              <Sparkles size={18} className="md:w-5 md:h-5 text-tech-lime animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider hidden lg:inline text-tech-white">
                {BACKGROUND_EFFECTS.find(e => e.id === (preferences.backgroundEffect || 'antigravity'))?.icon || '🪐'}
              </span>
            </button>

            <AnimatePresence>
              {showBackgroundPicker && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowBackgroundPicker(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-80 bg-tech-card clay-card border border-tech-lime/30 p-4 rounded-2xl shadow-2xl z-50 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-tech-lime" />
                        <span className="text-xs font-black uppercase tracking-widest text-tech-white">Live Background Themes</span>
                      </div>
                      <button 
                        onClick={() => setShowBackgroundPicker(false)}
                        className="text-slate-400 hover:text-white p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {BACKGROUND_EFFECTS.map(effect => {
                        const isSelected = (preferences.backgroundEffect || 'antigravity') === effect.id;
                        return (
                          <button
                            key={effect.id}
                            onClick={() => {
                              handleUpdatePreferences({ backgroundEffect: effect.id as any });
                              setShowBackgroundPicker(false);
                            }}
                            className={cn(
                              "w-full p-2.5 rounded-xl text-left transition-all flex items-center gap-3 border",
                              isSelected 
                                ? "bg-tech-lime/15 border-tech-lime text-tech-white shadow-[0_0_12px_rgba(165,243,68,0.2)]" 
                                : "bg-tech-inset/60 border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                            )}
                          >
                            <span className="text-xl shrink-0 p-1 bg-white/5 rounded-lg">{effect.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-black uppercase tracking-wider truncate flex items-center justify-between">
                                <span>{effect.label}</span>
                                {isSelected && <Check size={12} className="text-tech-lime" />}
                              </div>
                              <p className="text-[9px] text-slate-500 font-medium truncate">{effect.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "p-2 md:p-3.5 bg-tech-card clay-card rounded-full transition-all border-tech-lime/20",
              activeTab === 'settings' ? "text-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.2)]" : "text-slate-400 hover:text-tech-lime"
            )}
            title="Settings"
          >
            <Settings size={18} className="md:w-5 md:h-5" />
          </button>
          <div 
            className="flex items-center gap-2 md:gap-3 bg-tech-card clay-card px-3 md:px-5 py-1.5 md:py-2.5 rounded-full border-tech-lime/20 cursor-pointer hover:border-tech-lime/50 transition-all group"
            onClick={() => setActiveTab('profile')}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-tech-lime group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 border-tech-lime bg-tech-gray flex items-center justify-center text-[8px] md:text-[10px] font-black group-hover:scale-110 transition-transform">
                {(user.displayName || user.email || (user.isAnonymous ? 'Guest' : 'U')).charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs md:text-sm font-bold hidden sm:inline text-tech-white group-hover:text-tech-lime transition-colors">
              {user.displayName || user.email?.split('@')[0] || (user.isAnonymous ? 'Guest Operator' : 'Operator')}
            </span>
          </div>
          <button
            onClick={logOut}
            className="p-2 md:p-3.5 bg-tech-card clay-card rounded-full text-slate-400 hover:text-tech-red transition-all border-tech-red/20"
            title="Logout"
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center p-4 md:p-8 z-50 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-center gap-4 w-full max-w-lg">
          {/* More Menu Popover */}
          <nav className="floating-nav !relative !bottom-0 !left-0 !transform-none shadow-2xl !px-2 md:!px-6">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
              { id: 'transactions', icon: ArrowLeftRight, label: 'Ledger' },
              { id: 'goals', icon: Target, label: 'Roadmap' },
              { id: 'emis', icon: CreditCard, label: 'EMI' },
              { id: 'debts', icon: HandCoins, label: 'Lending' },
              { id: 'requests', icon: QrCode, label: 'Requests' },
              { id: 'analysis', icon: LineChart, label: 'Analysis' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                }}
                className={cn(
                  "nav-pod",
                  activeTab === item.id ? "active" : "text-slate-500 hover:text-tech-white"
                )}
              >
                <item.icon size={20} className="md:w-6 md:h-6" />
                <span className="text-[7px] md:text-[9px] font-bold uppercase tracking-tighter mt-1">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6">
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="mb-12 md:mb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8 md:gap-12">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-4 md:gap-8 mb-6 md:mb-10">
                  <h2 className="font-brand text-5xl md:text-7xl text-tech-white tracking-tighter leading-[0.75]">
                    Hi, <span className="text-tech-lime">{user.displayName?.split(' ')[0] || user.email?.split('@')[0] || (user.isAnonymous ? 'Guest' : 'Operator')}</span>
                  </h2>
                  {preferences.streakCount > 0 && (
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-2 md:py-3 bg-tech-orange/10 text-tech-orange rounded-2xl border border-tech-orange/20 shadow-[0_0_30px_rgba(255,107,0,0.2)]"
                    >
                      <Flame className="w-5 h-5 md:w-8 md:h-8" fill="currentColor" />
                      <div className="flex flex-col">
                        <span className="text-sm md:text-xl font-black tracking-tighter leading-none">{preferences.streakCount} DAY</span>
                        <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Operational Streak</span>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="w-1.5 md:w-2 h-12 md:h-20 bg-tech-lime rounded-full shadow-[0_0_20px_rgba(165,243,68,0.5)]" />
                  <div className="max-w-xl">
                    <p className="text-slate-500 text-lg md:text-3xl font-medium tracking-tight leading-tight">
                      System <span className="text-tech-white">Synchronized</span>. <br />
                      Operational dashboard ready for <span className="text-tech-lime italic">diagnostics</span>.
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={generateAIInsights}
                disabled={isGeneratingAI || transactions.length === 0}
                className="w-full lg:w-auto flex items-center justify-center gap-4 md:gap-6 px-8 md:px-12 py-4 md:py-6 bg-tech-lime text-tech-black rounded-2xl font-black uppercase tracking-tighter hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.3)] disabled:opacity-50 text-sm md:text-lg group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <Sparkles className={cn("w-5 h-5 md:w-8 md:h-8 group-hover:rotate-12 transition-transform", isGeneratingAI && "animate-pulse")} />
                <span>{isGeneratingAI ? "Processing..." : "Run Diagnostics"}</span>
              </button>
            </div>

            {/* AI Insights Display */}
            <AnimatePresence>
              {aiInsight && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-12 p-8 bg-tech-card clay-card relative overflow-hidden group border-tech-lime/30"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-tech-lime animate-pulse" />
                  
                  <button 
                    onClick={() => setAiInsight(null)}
                    className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors z-20 text-tech-white"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex items-start gap-5 relative z-10">
                    <div className="p-4 bg-tech-lime text-tech-black rounded-xl shrink-0 shadow-[0_0_20px_rgba(165,243,68,0.3)]">
                      <Sparkles size={24} />
                    </div>
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>{aiInsight}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Challenges Section - Gamification */}
            {preferences.motivationStyle === 'challenges' && (
              <div className="mb-16">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Trophy className="text-tech-lime" size={24} />
                    <h3 className="font-brand text-2xl md:text-3xl text-tech-white tracking-tighter uppercase">Active Challenges</h3>
                  </div>
                  <button 
                    onClick={() => setActiveTab('settings')}
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-tech-lime transition-colors"
                  >
                    Manage Goals
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {challenges.length === 0 ? (
                    <div className="md:col-span-3 bg-tech-card clay-card p-10 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5">
                      <Zap size={40} className="text-slate-700 mb-4" />
                      <p className="text-slate-500 font-black uppercase tracking-widest text-xs">No active challenges. Start one in settings.</p>
                    </div>
                  ) : (
                    challenges.map(challenge => (
                      <div key={challenge.id} className="bg-tech-card clay-card p-6 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Trophy size={48} />
                        </div>
                        <div className="relative z-10">
                          <div className="text-[10px] font-black text-tech-lime uppercase tracking-widest mb-2">{challenge.type}</div>
                          <h4 className="font-bold text-tech-white mb-4">{challenge.title}</h4>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                              <span className="text-slate-500">Progress</span>
                              <span className="text-tech-white">{Math.round((challenge.currentAmount / challenge.targetAmount) * 100)}%</span>
                            </div>
                            <div className="h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(challenge.currentAmount / challenge.targetAmount) * 100}%` }}
                                className="h-full bg-tech-lime shadow-[0_0_10px_rgba(165,243,68,0.5)]"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-end">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {formatCurrency(challenge.currentAmount)} / {formatCurrency(challenge.targetAmount)}
                            </div>
                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                              Ends {challenge.endDate.toDate().toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Bento Grid - Structured */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16"
            >
              {/* Total Balance - Large */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6 bg-tech-card clay-card p-8 md:p-12 flex flex-col min-h-[350px] md:min-h-[450px] relative overflow-hidden group border-tech-lime/20 dot-matrix shadow-2xl"
              >
                <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-tech-lime/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:scale-110 transition-transform duration-1000" />
                
                <div className="flex items-center justify-between relative z-10 mb-12 md:mb-16">
                  <div className="p-4 md:p-6 bg-tech-lime text-tech-black rounded-3xl shadow-[0_0_30px_rgba(165,243,68,0.4)]">
                    <Wallet size={24} className="md:w-10 md:h-10" />
                  </div>
                  <div className="text-right">
                    <span className="font-brand text-2xl md:text-4xl text-tech-lime block leading-none tracking-tighter">System Balance</span>
                    <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 block">Operational Liquidity</span>
                  </div>
                </div>
                <div className="relative z-10 mt-auto">
                  <h3 className="font-brand text-6xl md:text-8xl tracking-tighter mb-6 text-tech-white leading-none">
                    {formatCurrency(summary.totalBalance)}
                  </h3>
                  <div className="flex items-center gap-4 text-tech-lime font-black uppercase text-xs md:text-lg tracking-[0.2em]">
                    <div className="p-2 bg-tech-lime/10 rounded-xl border border-tech-lime/20">
                      <TrendingUp size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div className="flex flex-col">
                      <span>+2.4% Efficiency</span>
                      <span className="text-[7px] md:text-[9px] text-slate-500">vs Previous Cycle</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Currency Converter - Resized to match System Health */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6"
              >
                <CurrencyConverter />
              </motion.div>

              {/* Income & Expenses - Stacked */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6 flex flex-col gap-6 md:gap-8 min-h-[300px] md:min-h-[400px]"
              >
                <div className="flex-1 bg-tech-inset clay-card p-8 md:p-10 flex items-center justify-between relative overflow-hidden group border-tech-lime/10 shadow-xl">
                  <div className="relative z-10">
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 block mb-2">Inflow</span>
                    <h4 className="font-brand text-3xl md:text-5xl text-tech-lime leading-none tracking-tighter">{formatCurrency(summary.totalIncome)}</h4>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-tech-lime/10 border border-tech-lime/30 rounded-2xl flex items-center justify-center relative z-10 text-tech-lime shadow-[0_0_30px_rgba(165,243,68,0.15)]">
                    <TrendingUp size={20} className="md:w-8 md:h-8" />
                  </div>
                </div>
                <div className="flex-1 bg-tech-inset clay-card p-8 md:p-10 flex items-center justify-between relative overflow-hidden group border-tech-orange/10 shadow-xl">
                  <div className="relative z-10">
                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 block mb-2">Outflow</span>
                    <h4 className="font-brand text-3xl md:text-5xl text-tech-orange leading-none tracking-tighter">{formatCurrency(summary.totalExpenses)}</h4>
                  </div>
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-tech-orange/10 border border-tech-orange/30 rounded-2xl flex items-center justify-center relative z-10 text-tech-orange shadow-[0_0_30px_rgba(255,107,0,0.15)]">
                    <TrendingDown size={20} className="md:w-8 md:h-8" />
                  </div>
                </div>
              </motion.div>

              {/* Financial Health Score - Wide */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6 bg-tech-card clay-card p-6 md:p-10 flex flex-col border-white/5 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-tech-orange/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                
                <FinancialHealthScore 
                  transactions={transactions} 
                  budgets={budgets} 
                  summary={summary} 
                />
              </motion.div>

              {/* Debt Matrix - Medium */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-8 bg-tech-card clay-card p-8 md:p-10 flex flex-col border-white/5 shadow-xl relative overflow-hidden group"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-tech-orange/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                
                <DebtMatrix debts={debts} />
              </motion.div>

              {/* Budget Progress - Small */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-4 bg-tech-card clay-card p-8 md:p-10 flex flex-col border-white/5 shadow-xl relative overflow-hidden group"
              >
                <div className="flex items-center justify-between mb-8">
                  <h4 className="font-brand text-xl text-tech-white tracking-tighter">Budget Status</h4>
                  <Target size={18} className="text-tech-lime" />
                </div>
                <div className="space-y-6">
                  {budgets.slice(0, 3).map(budget => {
                    const spent = transactions
                      .filter(t => t.type === 'expense' && t.category === budget.category)
                      .reduce((sum, t) => sum + t.amount, 0);
                    const percent = Math.min(100, (spent / budget.amount) * 100);
                    return (
                      <div key={budget.id} className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                          <span className="text-slate-400">{budget.category}</span>
                          <span className={cn(percent > 90 ? "text-tech-orange" : "text-tech-lime")}>{Math.round(percent)}%</span>
                        </div>
                        <div className="h-1.5 bg-tech-inset rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            className={cn("h-full transition-colors", percent > 90 ? "bg-tech-orange" : "bg-tech-lime")}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {budgets.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">No limits set.</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Recent Activity - Medium */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6 bg-tech-card clay-card p-8 md:p-10 flex flex-col border-white/5 shadow-xl relative overflow-hidden group"
              >
                <RecentActivity transactions={transactions} />
              </motion.div>

              {/* Active Goals - Medium */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-6 bg-tech-card clay-card p-8 md:p-10 flex flex-col border-white/5 shadow-xl relative overflow-hidden group"
              >
                <ChallengesWidget challenges={challenges} />
              </motion.div>

              {/* Quick Actions - Small */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                className="md:col-span-12 bg-tech-card clay-card p-6 md:p-10 border border-tech-lime/20"
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                  <div className="shrink-0 text-center md:text-left">
                    <h3 className="font-brand text-xl md:text-3xl mb-2 text-tech-white tracking-tighter">Quick Commands</h3>
                    <p className="text-slate-500 text-[8px] md:text-xs font-black uppercase tracking-[0.2em]">Execute financial operations.</p>
                  </div>
                  <div className="grid grid-cols-3 md:flex md:flex-wrap justify-center md:justify-end gap-3 md:gap-6 w-full md:w-auto">
                    {[
                      { id: 'add-tx', icon: Plus, label: 'Add Entry', color: 'bg-tech-lime text-tech-black', onClick: () => setShowAddModal(true) },
                      { id: 'scan-receipt', icon: Scan, label: 'AI OCR Scan', color: 'bg-emerald-400 text-tech-black', onClick: () => setShowReceiptScannerModal(true) },
                      { id: 'add-goal', icon: Target, label: 'Roadmap', color: 'bg-cyan-400 text-tech-black', onClick: () => setActiveTab('goals') },
                      { id: 'add-budget', icon: Target, label: 'Set Limit', color: 'bg-tech-orange text-tech-black', onClick: () => setShowBudgetModal(true) },
                      { id: 'add-debt', icon: HandCoins, label: 'Add Debt', color: 'bg-tech-white text-tech-black', onClick: () => setShowDebtModal(true) },
                    ].map((action) => (
                      <button 
                        key={action.id}
                        onClick={action.onClick}
                        className="flex flex-col items-center gap-2 md:gap-3 px-3 md:px-6 py-4 md:py-6 bg-tech-inset hover:bg-tech-gray rounded-xl md:rounded-2xl transition-all group border border-white/5 hover:border-tech-lime/30"
                      >
                        <div className={cn("p-2.5 md:p-4 rounded-lg md:rounded-xl group-hover:scale-110 transition-transform shadow-lg", action.color)}>
                          <action.icon size={18} className="md:w-6 md:h-6" />
                        </div>
                        <span className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-tech-white transition-colors text-center">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="mt-12 md:mt-16 space-y-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h3 className="font-brand text-3xl md:text-5xl text-tech-white tracking-tighter leading-none mb-2">Data Logs</h3>
                <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.3em]">Complete Transaction History.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 md:gap-6">
                <div className="relative flex-1 md:flex-none">
                  <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-tech-lime/50" />
                  <input 
                    type="text" 
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-tech-inset border border-white/10 pl-12 pr-6 py-4 rounded-xl text-sm outline-none focus:border-tech-lime transition-all w-full md:w-80 text-tech-white font-mono"
                  />
                </div>

                <div className="flex p-1 bg-tech-inset rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
                  {(['all', 'income', 'expense'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        filterType === type ? "bg-tech-lime text-tech-black shadow-lg" : "text-slate-500 hover:text-tech-white"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-tech-inset border border-white/10 px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-tech-white outline-none focus:border-tech-lime transition-all"
                >
                  <option value="all">All Categories</option>
                  {Array.from(new Set(transactions.map(t => t.category))).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-3 px-6 py-4 bg-tech-gray hover:bg-tech-lime hover:text-tech-black text-tech-lime rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-tech-lime/20 shadow-lg"
                >
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-tech-card clay-card p-6 border border-tech-lime/20 relative overflow-hidden group">
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-tech-lime/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                <div className="flex items-center gap-3 mb-4 text-tech-lime">
                  <ArrowUpRight size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Filtered Inflow</span>
                </div>
                <div className="text-3xl font-brand text-tech-white tracking-tighter">{formatCurrency(filteredStats.income)}</div>
              </div>
              
              <div className="bg-tech-card clay-card p-6 border border-tech-orange/20 relative overflow-hidden group">
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-tech-orange/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
                <div className="flex items-center gap-3 mb-4 text-tech-orange">
                  <ArrowDownRight size={20} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Filtered Outflow</span>
                </div>
                <div className="text-3xl font-brand text-tech-white tracking-tighter">{formatCurrency(filteredStats.expense)}</div>
              </div>

              <div className="bg-tech-card clay-card p-6 border border-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-tech-inset/50 opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 text-slate-400">
                    <Activity size={20} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Net Change</span>
                  </div>
                  <div className={cn(
                    "text-3xl font-brand tracking-tighter",
                    filteredStats.income - filteredStats.expense >= 0 ? "text-tech-lime" : "text-tech-orange"
                  )}>
                    {formatCurrency(filteredStats.income - filteredStats.expense)}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-tech-card clay-card p-6 md:p-12 overflow-hidden border-white/5 shadow-2xl">
              <TransactionList transactions={filteredTransactions} onDelete={handleDeleteTransaction} />
            </div>
          </div>
        )}

        {activeTab === 'profile' && user && (
          <ProfileSection 
            user={user} 
            preferences={preferences} 
            transactions={transactions} 
            challenges={challenges} 
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisSection transactions={transactions} />
        )}

        {activeTab === 'debts' && (
          <BorrowLendSection 
            debts={debts} 
            debtPayments={debtPayments}
            theme={preferences.theme}
            onAdd={() => setShowDebtModal(true)} 
            onDelete={async (id) => {
              try {
                await deleteDoc(doc(db, 'debts', id));
              } catch (error) {
                handleFirestoreError(error, OperationType.DELETE, 'debts');
              }
            }}
            onToggleStatus={async (id, currentStatus) => {
              const targetDebt = debts.find(d => d.id === id);
              if (!targetDebt) return;
              try {
                if (currentStatus === 'pending') {
                  const remaining = targetDebt.amount - (targetDebt.paidAmount || 0);
                  if (remaining > 0) {
                    await addDoc(collection(db, 'debtPayments'), {
                      debtId: id,
                      amount: remaining,
                      type: 'pay',
                      date: Timestamp.now(),
                      note: 'Full settlement payment',
                      uid: targetDebt.uid
                    });
                  }
                  await updateDoc(doc(db, 'debts', id), { 
                    status: 'paid',
                    paidAmount: targetDebt.amount
                  });
                } else {
                  await updateDoc(doc(db, 'debts', id), { 
                    status: 'pending' 
                  });
                }
              } catch (error) {
                handleFirestoreError(error, OperationType.UPDATE, 'debts');
              }
            }}
            onUpdate={(debt) => {
              setSelectedDebtForUpdate(debt);
              setShowUpdateDebtModal(true);
            }}
          />
        )}

        {activeTab === 'emis' && (
          <EMIManager 
            emis={emis}
            emiPayments={emiPayments}
            user={user}
            preferences={preferences}
            handleFirestoreError={handleFirestoreError}
            setShowAddEMIModal={setShowAddEMIModal}
            setShowCreateEMIModal={setShowCreateEMIModal}
          />
        )}

        {activeTab === 'requests' && (
          <PaymentRequestsManager
            requests={paymentRequests}
            profile={paymentProfile}
            onOpenNewRequestModal={() => setShowPaymentRequestModal(true)}
            onOpenProfileModal={() => setShowPaymentProfileModal(true)}
            onViewRequestPass={(req) => setSelectedPaymentRequestForPass(req)}
            onMarkAsPaid={handleMarkPaymentRequestAsPaid}
            onDeleteRequest={handleDeletePaymentRequest}
          />
        )}

        {activeTab === 'goals' && (
          <SavingsGoalsManager
            goals={savingsGoals}
            onAddGoal={handleAddSavingsGoal}
            onUpdateGoal={handleUpdateSavingsGoal}
            onDeleteGoal={handleDeleteSavingsGoal}
            onDepositGoal={handleDepositSavingsGoal}
            onWithdrawGoal={handleWithdrawSavingsGoal}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsSection 
            preferences={preferences}
            onUpdatePreferences={(p) => setPreferences(prev => ({ ...prev, ...p }))}
          />
        )}
      </main>

      {/* AI Powered Receipt Scanner OCR Modal */}
      <ReceiptScannerModal
        isOpen={showReceiptScannerModal}
        onClose={() => setShowReceiptScannerModal(false)}
        onSaveExpense={handleAddExpenseFromScan}
      />

      {/* Biometric Lock Screen */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-tech-bg flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="absolute inset-0 bg-tech-black/50 backdrop-blur-3xl" />
            <div className="relative z-10 max-w-sm w-full">
              <div className="w-24 h-24 bg-tech-lime/10 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-tech-lime/20 shadow-[0_0_50px_rgba(165,243,68,0.1)]">
                <Lock size={48} className="text-tech-lime animate-pulse" />
              </div>
              <h2 className="font-brand text-4xl md:text-6xl text-tech-white mb-4 tracking-tighter">System Locked</h2>
              <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mb-12">Biometric authentication required for access.</p>
              
              <button
                onClick={handleUnlock}
                className="w-full py-6 bg-tech-lime text-tech-black rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.3)] flex items-center justify-center gap-4"
              >
                <Fingerprint size={24} />
                Unlock System
              </button>
              
              <button
                onClick={logOut}
                className="mt-8 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-tech-orange transition-colors"
              >
                Switch Operator / Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-32 right-8 w-16 h-16 bg-tech-lime text-tech-black rounded-xl shadow-[0_0_30px_rgba(165,243,68,0.3)] flex items-center justify-center hover:scale-110 transition-all active:scale-95 z-30 border border-tech-lime/50"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <AddTransactionModal 
            onClose={() => setShowAddModal(false)} 
            uid={user.uid} 
            preferences={preferences}
          />
        )}
        {showBudgetModal && (
          <AddBudgetModal 
            onClose={() => setShowBudgetModal(false)} 
            uid={user.uid} 
          />
        )}
        {showDebtModal && (
          <AddDebtModal 
            onClose={() => setShowDebtModal(false)} 
            uid={user.uid} 
          />
        )}
        {showUpdateDebtModal && selectedDebtForUpdate && (
          <UpdateDebtModal 
            debt={selectedDebtForUpdate}
            onClose={() => {
              setShowUpdateDebtModal(false);
              setSelectedDebtForUpdate(null);
            }} 
          />
        )}
        {showAddEMIModal && (
          <AddEMIModal 
            onClose={() => setShowAddEMIModal(false)}
            uid={user.uid}
            preferences={preferences}
            handleFirestoreError={handleFirestoreError}
          />
        )}
        {showPaymentProfileModal && (
          <PaymentProfileModal
            isOpen={showPaymentProfileModal}
            onClose={() => setShowPaymentProfileModal(false)}
            profile={paymentProfile}
            onSave={handleSavePaymentProfile}
          />
        )}
        {showPaymentRequestModal && (
          <PaymentRequestModal
            isOpen={showPaymentRequestModal}
            onClose={() => setShowPaymentRequestModal(false)}
            profile={paymentProfile}
            onEditProfile={() => {
              setShowPaymentRequestModal(false);
              setShowPaymentProfileModal(true);
            }}
            onSubmit={handleCreatePaymentRequest}
          />
        )}
        {selectedPaymentRequestForPass && (
          <PaymentRequestPassModal
            isOpen={!!selectedPaymentRequestForPass}
            onClose={() => setSelectedPaymentRequestForPass(null)}
            request={selectedPaymentRequestForPass}
            onMarkAsPaid={handleMarkPaymentRequestAsPaid}
            appTheme={preferences?.theme || 'cyberpunk'}
          />
        )}
        {showCreateEMIModal && (
          <CreateEMIModal 
            onClose={() => setShowCreateEMIModal(false)}
            uid={user.uid}
            preferences={preferences}
            handleFirestoreError={handleFirestoreError}
          />
        )}
      </AnimatePresence>
    </div>
    </ErrorBoundary>
  );
}

function ProfileSection({ user, preferences, transactions, challenges }: { 
  user: User, 
  preferences: UserPreferences, 
  transactions: Transaction[],
  challenges: Challenge[]
}) {
  const stats = useMemo(() => {
    const totalTransactions = transactions.length;
    const activeChallenges = challenges.filter(c => c.status === 'active').length;
    const completedChallenges = challenges.filter(c => c.status === 'completed').length;
    const totalSpent = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { totalTransactions, activeChallenges, completedChallenges, totalSpent };
  }, [transactions, challenges]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="max-w-xl">
          <h2 className="font-brand text-5xl md:text-8xl mb-4 text-tech-white tracking-tighter leading-none">
            Operator <span className="text-tech-lime">Profile</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-xl font-medium tracking-widest uppercase">System Identity & Performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-tech-card clay-card p-8 md:p-10 border border-white/5 relative overflow-hidden group text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-tech-lime" />
            <div className="relative z-10">
              <div className="w-24 h-24 md:w-32 md:h-32 mx-auto mb-6 relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-full h-full rounded-full border-4 border-tech-lime shadow-2xl" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full rounded-full border-4 border-tech-lime bg-tech-gray flex items-center justify-center text-4xl font-black">
                    <UserIcon size={48} />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-tech-lime text-tech-black p-2 rounded-full shadow-lg">
                  <Activity size={20} />
                </div>
              </div>
              <h3 className="font-brand text-2xl md:text-3xl text-tech-white tracking-tighter mb-1">{user.displayName}</h3>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-6">{user.email}</p>
              
              <div className="flex items-center justify-center gap-4">
                <div className="px-4 py-2 bg-tech-inset rounded-xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Streak</div>
                  <div className="text-xl font-brand text-tech-lime flex items-center justify-center gap-2">
                    <Flame size={16} />
                    {preferences.streakCount}
                  </div>
                </div>
                <div className="px-4 py-2 bg-tech-inset rounded-xl border border-white/5">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Level</div>
                  <div className="text-xl font-brand text-tech-white">Lvl {Math.floor(stats.totalTransactions / 10) + 1}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-tech-card clay-card p-8 border border-white/5 space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Account Actions</h4>
            <div className="space-y-3">
              <button 
                onClick={() => auth.signOut()}
                className="w-full py-4 bg-tech-red/10 text-tech-red border border-tech-red/20 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-tech-red hover:text-tech-white transition-all"
              >
                <LogOut size={16} />
                Terminate Session
              </button>
            </div>
          </div>
        </div>

        {/* Stats & Activity */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Total Operations', value: stats.totalTransactions, icon: History, color: 'text-tech-lime' },
              { label: 'Cumulative Outflow', value: formatCurrency(stats.totalSpent), icon: TrendingDown, color: 'text-tech-orange' },
              { label: 'Active Objectives', value: stats.activeChallenges, icon: Target, color: 'text-tech-lime' },
              { label: 'Successful Goals', value: stats.completedChallenges, icon: Trophy, color: 'text-tech-white' },
            ].map((stat, i) => (
              <div key={i} className="bg-tech-card clay-card p-6 border border-white/5 flex items-center gap-6">
                <div className={cn("p-4 rounded-xl bg-tech-gray border border-white/5", stat.color)}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className={cn("text-2xl font-brand tracking-tighter", stat.color)}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-tech-card clay-card p-8 md:p-10 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5">
              <Activity size={200} />
            </div>
            <div className="relative z-10">
              <h3 className="font-brand text-2xl text-tech-white tracking-tighter mb-8 flex items-center gap-3">
                <Activity className="text-tech-lime" size={20} />
                Operational Status
              </h3>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financial Discipline</span>
                    <span className="text-xs font-brand text-tech-lime">85%</span>
                  </div>
                  <div className="h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '85%' }}
                      className="h-full bg-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.5)]"
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Adherence</span>
                    <span className="text-xs font-brand text-tech-orange">62%</span>
                  </div>
                  <div className="h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '62%' }}
                      className="h-full bg-tech-orange shadow-[0_0_15px_rgba(255,107,0,0.5)]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Savings Efficiency</span>
                    <span className="text-xs font-brand text-tech-white">74%</span>
                  </div>
                  <div className="h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '74%' }}
                      className="h-full bg-tech-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ 
  preferences, 
  onUpdatePreferences 
}: { 
  preferences: UserPreferences, 
  onUpdatePreferences: (p: Partial<UserPreferences>) => void 
}) {
  const [showChallengeModal, setShowChallengeModal] = useState(false);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="max-w-xl">
          <h2 className="font-brand text-5xl md:text-8xl mb-4 text-tech-white tracking-tighter leading-none">
            System <span className="text-tech-lime">Personalization</span>
          </h2>
          <p className="text-slate-500 text-sm md:text-xl font-medium tracking-widest uppercase">Configure Operational Environment.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Theme & Mode */}
        <div className="bg-tech-card clay-card p-8 md:p-10 border border-white/5 space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Palette className="text-tech-lime" size={20} />
              <h3 className="font-brand text-xl text-tech-white tracking-tighter uppercase">Visual Identity</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { id: 'emerald', label: 'Emerald', color: '#A5F344' },
                { id: 'royal', label: 'Royal Blue', color: '#3B82F6' },
                { id: 'purple', label: 'Modern Purple', color: '#A855F7' },
                { id: 'monochrome', label: 'Monochrome', color: '#FFFFFF' },
                { id: 'sunset', label: 'Sunset', color: '#FF6B00' },
                { id: 'forest', label: 'Forest', color: '#22C55E' },
                { id: 'cyberpunk', label: 'Cyberpunk', color: '#FF00FF' },
                { id: 'gold', label: 'Gold', color: '#FBBF24' },
                { id: 'ruby', label: 'Ruby', color: '#E11D48' },
                { id: 'ocean', label: 'Ocean', color: '#0EA5E9' },
                { id: 'midnight', label: 'Midnight', color: '#1E293B' },
                { id: 'lava', label: 'Lava', color: '#EF4444' },
                { id: 'mint', label: 'Mint', color: '#10B981' },
                { id: 'lavender', label: 'Lavender', color: '#8B5CF6' },
                { id: 'slate', label: 'Slate', color: '#64748B' }
              ].map(theme => (
                <button
                  key={theme.id}
                  onClick={() => onUpdatePreferences({ theme: theme.id as any })}
                  className={cn(
                    "p-4 rounded-xl border transition-all flex flex-col items-center gap-3",
                    preferences.theme === theme.id 
                      ? "bg-tech-lime/10 border-tech-lime text-tech-white" 
                      : "bg-tech-inset border-white/5 text-slate-500 hover:border-white/20"
                  )}
                >
                  <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: theme.color }} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="text-tech-lime" size={20} />
              <h3 className="font-brand text-xl text-tech-white tracking-tighter uppercase">Visual Effects</h3>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => onUpdatePreferences({ glassMode: !preferences.glassMode })}
                className={cn(
                  "w-full p-6 rounded-xl border transition-all flex items-center justify-between",
                  preferences.glassMode 
                    ? "bg-tech-lime/10 border-tech-lime" 
                    : "bg-tech-inset border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    preferences.glassMode ? "bg-tech-lime text-tech-black" : "bg-tech-gray text-slate-500"
                  )}>
                    <Sparkles size={20} />
                  </div>
                  <div className="text-left">
                    <div className={cn(
                      "text-xs font-black uppercase tracking-widest mb-1",
                      preferences.glassMode ? "text-tech-white" : "text-slate-400"
                    )}>
                      Glassmorphism
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Enable frosted glass effects across UI.</p>
                  </div>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  preferences.glassMode ? "bg-tech-lime" : "bg-tech-gray"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    preferences.glassMode ? "right-1" : "left-1"
                  )} />
                </div>
              </button>

              <button
                onClick={() => onUpdatePreferences({ isDynamicTheme: !preferences.isDynamicTheme })}
                className={cn(
                  "w-full p-6 rounded-xl border transition-all flex items-center justify-between",
                  preferences.isDynamicTheme 
                    ? "bg-tech-lime/10 border-tech-lime" 
                    : "bg-tech-inset border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    preferences.isDynamicTheme ? "bg-tech-lime text-tech-black" : "bg-tech-gray text-slate-500"
                  )}>
                    <Zap size={20} />
                  </div>
                  <div className="text-left">
                    <div className={cn(
                      "text-xs font-black uppercase tracking-widest mb-1",
                      preferences.isDynamicTheme ? "text-tech-white" : "text-slate-400"
                    )}>
                      Dynamic Themes
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Live background effects and animations.</p>
                  </div>
                </div>
                <div className={cn(
                  "w-12 h-6 rounded-full relative transition-all",
                  preferences.isDynamicTheme ? "bg-tech-lime" : "bg-tech-gray"
                )}>
                  <div className={cn(
                    "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                    preferences.isDynamicTheme ? "right-1" : "left-1"
                  )} />
                </div>
              </button>

              {preferences.isDynamicTheme && (
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-tech-lime" size={16} />
                      <h4 className="text-xs font-black uppercase tracking-widest text-tech-white">Live Background Engine</h4>
                    </div>
                    <span className="text-[9px] font-mono font-bold text-tech-lime px-2 py-0.5 rounded bg-tech-lime/10 border border-tech-lime/20 uppercase tracking-widest">
                      {BACKGROUND_EFFECTS.find(e => e.id === (preferences.backgroundEffect || 'antigravity'))?.label || 'Antigravity'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BACKGROUND_EFFECTS.map(effect => {
                      const isSelected = (preferences.backgroundEffect || 'antigravity') === effect.id;
                      return (
                        <button
                          key={effect.id}
                          onClick={() => onUpdatePreferences({ backgroundEffect: effect.id as any })}
                          className={cn(
                            "p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 relative overflow-hidden group",
                            isSelected
                              ? "bg-tech-lime/10 border-tech-lime text-tech-white shadow-[0_0_20px_rgba(165,243,68,0.15)]"
                              : "bg-tech-inset border-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                          )}
                        >
                          <div className={cn(
                            "text-xl p-2 rounded-lg transition-transform group-hover:scale-110 shrink-0",
                            isSelected ? "bg-tech-lime/20" : "bg-white/5"
                          )}>
                            {effect.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={cn(
                                "text-[11px] font-black uppercase tracking-wider truncate",
                                isSelected ? "text-tech-white" : "text-slate-300"
                              )}>
                                {effect.label}
                              </span>
                              {isSelected && (
                                <Check className="text-tech-lime shrink-0" size={14} />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium line-clamp-2 leading-tight">
                              {effect.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <Layout className="text-tech-lime" size={20} />
              <h3 className="font-brand text-xl text-tech-white tracking-tighter uppercase">Interface Mode</h3>
            </div>
            
            <div className="flex p-1 bg-tech-inset rounded-xl border border-white/5">
              <button
                onClick={() => onUpdatePreferences({ mode: 'dark' })}
                className={cn(
                  "flex-1 py-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  preferences.mode === 'dark' ? "bg-tech-lime text-tech-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Moon size={14} />
                Dark Mode
              </button>
              <button
                onClick={() => onUpdatePreferences({ mode: 'light' })}
                className={cn(
                  "flex-1 py-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                  preferences.mode === 'light' ? "bg-tech-lime text-tech-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Sun size={14} />
                Light Mode
              </button>
            </div>
          </div>
        </div>

        {/* Motivation Style */}
        <div className="bg-tech-card clay-card p-8 md:p-10 border border-white/5 space-y-10">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Dna className="text-tech-lime" size={20} />
              <h3 className="font-brand text-xl text-tech-white tracking-tighter uppercase">Motivation Engine</h3>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'challenges', label: 'Challenges', desc: 'Set specific goals and track progress.', icon: Trophy },
                { id: 'streaks', label: 'Streaks', desc: 'Maintain daily activity to build habits.', icon: Flame },
                { id: 'rewards', label: 'Rewards', desc: 'Unlock achievements for financial milestones.', icon: Zap }
              ].map(style => (
                <button
                  key={style.id}
                  onClick={() => onUpdatePreferences({ motivationStyle: style.id as any })}
                  className={cn(
                    "w-full p-6 rounded-xl border transition-all flex items-start gap-5 text-left",
                    preferences.motivationStyle === style.id 
                      ? "bg-tech-lime/10 border-tech-lime" 
                      : "bg-tech-inset border-white/5 hover:border-white/20"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-lg shrink-0",
                    preferences.motivationStyle === style.id ? "bg-tech-lime text-tech-black" : "bg-tech-gray text-slate-500"
                  )}>
                    <style.icon size={20} />
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs font-black uppercase tracking-widest mb-1",
                      preferences.motivationStyle === style.id ? "text-tech-white" : "text-slate-400"
                    )}>
                      {style.label}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{style.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {preferences.motivationStyle === 'challenges' && (
            <button
              onClick={() => setShowChallengeModal(true)}
              className="w-full py-5 bg-tech-lime text-tech-black rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)]"
            >
              Initialize New Challenge
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showChallengeModal && (
          <CreateChallengeModal onClose={() => setShowChallengeModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateChallengeModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [type, setType] = useState<'no-spend' | 'savings' | 'budget'>('savings');
  const [days, setDays] = useState('30');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    setIsSubmitting(true);
    try {
      const startDate = Timestamp.now();
      const endDate = Timestamp.fromDate(new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000));
      
      await addDoc(collection(db, 'challenges'), {
        title,
        targetAmount: parseFloat(targetAmount),
        currentAmount: 0,
        type,
        startDate,
        endDate,
        status: 'active',
        uid: auth.currentUser?.uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'challenges');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-md bg-tech-card clay-card p-8 md:p-10 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-brand text-2xl md:text-3xl text-tech-white tracking-tighter uppercase">New Challenge</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-tech-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex p-1 bg-tech-inset rounded-xl border border-white/5">
            {['savings', 'no-spend', 'budget'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t as any)}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  type === t ? "bg-tech-lime text-tech-black shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Challenge Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. No-spend week"
                className="w-full bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl px-6 py-4 outline-none transition-all text-tech-white font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Target Amount</label>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl px-6 py-4 outline-none transition-all text-tech-white font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Duration (Days)</label>
                <select
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="w-full bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl px-6 py-4 outline-none transition-all text-tech-white font-bold appearance-none"
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-tech-lime text-tech-black rounded-xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)]"
          >
            {isSubmitting ? 'Initializing...' : 'Start Challenge'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function EMICalculator() {
  const [loanAmount, setLoanAmount] = useState<number>(1000000);
  const [interestRate, setInterestRate] = useState<number>(8.5);
  const [tenure, setTenure] = useState<number>(120);

  const monthlyRate = interestRate / 12 / 100;
  const emi = loanAmount * monthlyRate * (Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1));
  const totalPayment = emi * tenure;
  const totalInterest = totalPayment - loanAmount;

  const chartData = [
    { name: 'Principal', value: loanAmount },
    { name: 'Interest', value: totalInterest }
  ];

  return (
    <div className="bg-tech-card clay-card p-10 md:p-20 relative overflow-hidden group border border-white/5 shadow-2xl">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-tech-lime/5 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
      
      <div className="flex flex-col md:flex-row md:items-end gap-6 mb-12 md:mb-16 relative z-10">
        <div className="p-4 md:p-6 bg-tech-gray rounded-2xl text-tech-lime border border-white/10 shadow-xl shadow-tech-lime/5">
          <Calculator size={32} className="md:w-12 md:h-12" />
        </div>
        <div>
          <h3 className="font-brand text-4xl md:text-7xl text-tech-white tracking-tighter leading-none">EMI Calculator</h3>
          <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Loan Repayment Schedule Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-24">
        <div className="lg:col-span-5 space-y-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Loan Amount (₹)</label>
              <input 
                type="number" 
                value={loanAmount} 
                onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
              />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Interest (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={interestRate} 
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Tenure (Mo)</label>
                <input 
                  type="number" 
                  value={tenure} 
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6 pt-12 border-t border-white/5">
            <div className="p-8 md:p-12 bg-tech-inset rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-inner group/item hover:border-tech-lime/20 transition-colors">
              <span className="text-[10px] md:text-sm text-slate-500 font-black uppercase tracking-[0.3em]">Monthly EMI</span>
              <div className="text-3xl md:text-6xl font-black text-tech-lime tracking-tighter tabular-nums leading-none">{formatCurrency(emi)}</div>
            </div>
            <div className="p-8 md:p-12 bg-tech-inset rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-inner group/item hover:border-tech-orange/20 transition-colors">
              <span className="text-[10px] md:text-sm text-slate-500 font-black uppercase tracking-[0.3em]">Total Interest</span>
              <div className="text-3xl md:text-6xl font-black text-tech-orange tracking-tighter tabular-nums leading-none">{formatCurrency(totalInterest)}</div>
            </div>
            <div className="p-8 md:p-12 bg-tech-gray rounded-[2.5rem] border border-tech-lime/20 flex justify-between items-center shadow-2xl shadow-tech-lime/10">
              <span className="text-[10px] md:text-sm text-tech-lime font-black uppercase tracking-[0.3em]">Total Payable</span>
              <div className="text-3xl md:text-6xl font-black text-tech-white tracking-tighter tabular-nums leading-none">{formatCurrency(totalPayment)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 h-[500px] lg:h-auto bg-tech-inset rounded-[3rem] p-10 md:p-20 border border-white/5 flex flex-col shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]" />
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-10">
            <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em]">Principal vs Interest Breakdown</span>
            <div className="flex gap-8 md:gap-12">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.6)]" />
                <span className="text-xs font-black text-tech-white uppercase tracking-[0.2em]">Principal</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-tech-orange shadow-[0_0_15px_rgba(255,107,0,0.6)]" />
                <span className="text-xs font-black text-tech-white uppercase tracking-[0.2em]">Interest</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 900 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 900 }} tickFormatter={(value) => value >= 100000 ? `₹${(value/100000).toFixed(1)}L` : `₹${(value/1000).toFixed(0)}K`} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0D0D0D', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#A5F344' : '#FF6B00'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function SIPCalculator() {
  const [monthlyInvestment, setMonthlyInvestment] = useState<number>(10000);
  const [expectedReturn, setExpectedReturn] = useState<number>(12);
  const [timePeriod, setTimePeriod] = useState<number>(10);

  const monthlyRate = expectedReturn / 12 / 100;
  const months = timePeriod * 12;
  const futureValue = monthlyInvestment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  const totalInvested = monthlyInvestment * months;
  const estimatedReturns = futureValue - totalInvested;

  // Generate dynamic data for the AreaChart
  const yearlyData = Array.from({ length: timePeriod + 1 }, (_, i) => {
    const m = i * 12;
    const fv = m === 0 ? 0 : monthlyInvestment * ((Math.pow(1 + monthlyRate, m) - 1) / monthlyRate) * (1 + monthlyRate);
    const ti = monthlyInvestment * m;
    return {
      year: `Yr ${i}`,
      total: Math.round(fv),
      invested: Math.round(ti)
    };
  });

  return (
    <div className="bg-tech-card clay-card p-10 md:p-20 relative overflow-hidden group border border-white/5 shadow-2xl">
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-tech-lime/5 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />

      <div className="flex flex-col md:flex-row md:items-end gap-6 mb-12 md:mb-16 relative z-10">
        <div className="p-4 md:p-6 bg-tech-gray rounded-2xl text-tech-lime border border-white/10 shadow-xl shadow-tech-lime/5">
          <TrendingUp size={32} className="md:w-12 md:h-12" />
        </div>
        <div>
          <h3 className="font-brand text-4xl md:text-7xl text-tech-white tracking-tighter leading-none">SIP Calculator</h3>
          <p className="text-[9px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] mt-3">Wealth Growth Projection Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 md:gap-24">
        <div className="lg:col-span-5 space-y-12">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Monthly Investment (₹)</label>
              <input 
                type="number" 
                value={monthlyInvestment} 
                onChange={(e) => setMonthlyInvestment(Number(e.target.value))}
                className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
              />
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Return (%)</label>
                <input 
                  type="number" 
                  value={expectedReturn} 
                  onChange={(e) => setExpectedReturn(Number(e.target.value))}
                  className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em] px-2">Period (Yrs)</label>
                <input 
                  type="number" 
                  value={timePeriod} 
                  onChange={(e) => setTimePeriod(Number(e.target.value))}
                  className="w-full px-8 py-6 md:py-10 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-[2rem] outline-none transition-all text-tech-white font-black text-2xl md:text-5xl shadow-inner"
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6 pt-12 border-t border-white/5">
            <div className="p-8 md:p-12 bg-tech-inset rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-inner group/item hover:border-white/20 transition-colors">
              <span className="text-[10px] md:text-sm text-slate-500 font-black uppercase tracking-[0.3em]">Invested Amount</span>
              <div className="text-3xl md:text-6xl font-black text-tech-white tracking-tighter tabular-nums leading-none">{formatCurrency(totalInvested)}</div>
            </div>
            <div className="p-8 md:p-12 bg-tech-inset rounded-[2.5rem] border border-white/5 flex justify-between items-center shadow-inner group/item hover:border-tech-orange/20 transition-colors">
              <span className="text-[10px] md:text-sm text-slate-500 font-black uppercase tracking-[0.3em]">Est. Returns</span>
              <div className="text-3xl md:text-6xl font-black text-tech-orange tracking-tighter tabular-nums leading-none">{formatCurrency(estimatedReturns)}</div>
            </div>
            <div className="p-8 md:p-12 bg-tech-gray rounded-[2.5rem] border border-tech-lime/20 flex justify-between items-center shadow-2xl shadow-tech-lime/10">
              <span className="text-[10px] md:text-sm text-tech-lime font-black uppercase tracking-[0.3em]">Total Value</span>
              <div className="text-3xl md:text-6xl font-black text-tech-white tracking-tighter tabular-nums leading-none">{formatCurrency(futureValue)}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 h-[500px] lg:h-auto bg-tech-inset rounded-[3rem] p-10 md:p-20 border border-white/5 flex flex-col shadow-inner relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.2)_100%)]" />
          <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-8 relative z-10">
            <span className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.4em]">Wealth Growth Projection</span>
            <div className="flex gap-8 md:gap-12">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.6)]" />
                <span className="text-xs font-black text-tech-white uppercase tracking-[0.2em]">Total Value</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full bg-white/20" />
                <span className="text-xs font-black text-tech-white uppercase tracking-[0.2em]">Invested</span>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-[300px] relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A5F344" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#A5F344" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 900 }} dy={25} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 900 }} tickFormatter={(value) => value >= 100000 ? `₹${(value/100000).toFixed(1)}L` : `₹${(value/1000).toFixed(0)}K`} dx={-10} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0D0D0D', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '32px', 
                    padding: '24px', 
                    boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(20px)'
                  }}
                  itemStyle={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', padding: '4px 0' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="total" stroke="#A5F344" strokeWidth={6} fillOpacity={1} fill="url(#colorTotal)" animationDuration={2500} strokeLinecap="round" />
                <Area type="monotone" dataKey="invested" stroke="rgba(255,255,255,0.2)" strokeWidth={3} fill="transparent" animationDuration={2500} strokeDasharray="10 10" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrencyConverter() {
  const [amount, setAmount] = useState<number>(1);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('INR');
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      let res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) {
        res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      }
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (data.result === 'success' || data.rates) {
        setRates(data.rates);
        setError(null);
      } else {
        throw new Error('API returned error');
      }
    } catch (error) {
      console.error("Currency Error:", error);
      setError("Offline Mode");
      setRates({ USD: 1, INR: 83.5, EUR: 0.92, GBP: 0.79 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const convertedAmount = rates[toCurrency] && rates[fromCurrency] 
    ? (amount / rates[fromCurrency]) * rates[toCurrency] 
    : 0;

  return (
    <div className="bg-tech-card clay-card p-6 md:p-8 h-full relative overflow-hidden group border border-white/5 shadow-2xl flex flex-col justify-between">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-tech-orange/5 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
      
      <div className="flex items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-tech-gray rounded-2xl text-tech-orange border border-white/10 shadow-xl">
            <RefreshCw size={24} />
          </div>
          <div>
            <h3 className="font-brand text-2xl text-tech-white tracking-tighter leading-none">Currency</h3>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Exchange Engine</p>
          </div>
        </div>
        <button 
          onClick={fetchRates}
          className="p-3 bg-tech-gray rounded-xl border border-white/10 text-slate-500 hover:text-tech-lime transition-all hover:scale-110 active:scale-95 group"
        >
          <RotateCcw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-tech-lime shadow-[0_0_20px_rgba(165,243,68,0.4)]"></div>
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing...</span>
        </div>
      ) : (
        <div className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">Amount</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-6 py-4 bg-tech-inset border border-white/5 focus:border-tech-orange/50 rounded-xl outline-none transition-all text-tech-white font-black text-2xl shadow-inner pr-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-slate-600">{fromCurrency}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">From</label>
              <select 
                value={fromCurrency} 
                onChange={(e) => setFromCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-tech-inset border border-white/5 rounded-xl outline-none text-tech-white font-black text-xs appearance-none cursor-pointer shadow-inner"
              >
                {Object.keys(rates).sort().map(curr => <option key={curr} value={curr} className="bg-tech-card">{curr}</option>)}
              </select>
            </div>
            
            <button 
              onClick={handleSwap}
              className="mt-6 p-3 bg-tech-gray hover:bg-tech-orange hover:text-tech-gray rounded-full border border-white/10 transition-all group/swap"
            >
              <ArrowRightLeft size={16} className="group-hover/swap:rotate-180 transition-transform duration-500" />
            </button>

            <div className="flex-1 space-y-2">
              <label className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] px-1">To</label>
              <select 
                value={toCurrency} 
                onChange={(e) => setToCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-tech-inset border border-white/5 rounded-xl outline-none text-tech-white font-black text-xs appearance-none cursor-pointer shadow-inner"
              >
                {Object.keys(rates).sort().map(curr => <option key={curr} value={curr} className="bg-tech-card">{curr}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Result</span>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full",
                error ? "bg-tech-orange/20 text-tech-orange" : "bg-tech-lime/20 text-tech-lime"
              )}>
                {error ? "Offline" : "Live"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-brand tracking-tighter text-tech-white">
                {convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-black text-tech-lime uppercase tracking-widest">{toCurrency}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ThemeColorConfig {
  primary: string;
  primaryDark: string;
  bgLight: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

const RECEIPT_THEMES: Record<string, ThemeColorConfig> = {
  emerald: { primary: '#10B981', primaryDark: '#047857', bgLight: '#ECFDF5', badgeBg: '#ECFDF5', badgeText: '#047857', badgeBorder: '#A7F3D0' },
  royal: { primary: '#2563EB', primaryDark: '#1D4ED8', bgLight: '#EFF6FF', badgeBg: '#EFF6FF', badgeText: '#1D4ED8', badgeBorder: '#BFDBFE' },
  purple: { primary: '#9333EA', primaryDark: '#7E22CE', bgLight: '#F3E8FF', badgeBg: '#F3E8FF', badgeText: '#7E22CE', badgeBorder: '#E9D5FF' },
  monochrome: { primary: '#111827', primaryDark: '#000000', bgLight: '#F3F4F6', badgeBg: '#F3F4F6', badgeText: '#111827', badgeBorder: '#E5E7EB' },
  sunset: { primary: '#EA580C', primaryDark: '#C2410C', bgLight: '#FFF7ED', badgeBg: '#FFF7ED', badgeText: '#C2410C', badgeBorder: '#FFEDD5' },
  forest: { primary: '#16A34A', primaryDark: '#15803D', bgLight: '#F0FDF4', badgeBg: '#F0FDF4', badgeText: '#15803D', badgeBorder: '#BBF7D0' },
  cyberpunk: { primary: '#D946EF', primaryDark: '#A21CAF', bgLight: '#FDF4FF', badgeBg: '#FDF4FF', badgeText: '#A21CAF', badgeBorder: '#F5D0FE' },
  gold: { primary: '#D97706', primaryDark: '#B45309', bgLight: '#FFFBEB', badgeBg: '#FFFBEB', badgeText: '#B45309', badgeBorder: '#FDE68A' },
  ruby: { primary: '#E11D48', primaryDark: '#BE123C', bgLight: '#FFF1F2', badgeBg: '#FFF1F2', badgeText: '#BE123C', badgeBorder: '#FECDD3' },
  ocean: { primary: '#0284C7', primaryDark: '#0369A1', bgLight: '#F0F9FF', badgeBg: '#F0F9FF', badgeText: '#0369A1', badgeBorder: '#BAE6FD' },
  midnight: { primary: '#4F46E5', primaryDark: '#4338CA', bgLight: '#EEF2FF', badgeBg: '#EEF2FF', badgeText: '#4338CA', badgeBorder: '#C7D2FE' },
  lava: { primary: '#EF4444', primaryDark: '#B91C1C', bgLight: '#FEF2F2', badgeBg: '#FEF2F2', badgeText: '#B91C1C', badgeBorder: '#FCA5A5' },
  mint: { primary: '#10B981', primaryDark: '#047857', bgLight: '#ECFDF5', badgeBg: '#ECFDF5', badgeText: '#047857', badgeBorder: '#A7F3D0' },
  lavender: { primary: '#8B5CF6', primaryDark: '#6D28D9', bgLight: '#F5F3FF', badgeBg: '#F5F3FF', badgeText: '#6D28D9', badgeBorder: '#DDD6FE' },
  slate: { primary: '#475569', primaryDark: '#334155', bgLight: '#F8FAFC', badgeBg: '#F8FAFC', badgeText: '#334155', badgeBorder: '#CBD5E1' },
};

function getReceiptTheme(themeName?: string): ThemeColorConfig {
  if (themeName && RECEIPT_THEMES[themeName]) {
    return RECEIPT_THEMES[themeName];
  }
  return RECEIPT_THEMES.emerald;
}

function ReceiptQRCode({ value, size = 90 }: { value: string; size?: number }) {
  const grid = useMemo(() => {
    const s = 21;
    const matrix = Array.from({ length: s }, () => Array(s).fill(false));
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    const drawFinder = (r: number, c: number) => {
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) {
            matrix[r + i][c + j] = true;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, 14);
    drawFinder(14, 0);

    for (let i = 8; i < 13; i++) {
      matrix[6][i] = i % 2 === 0;
      matrix[i][6] = i % 2 === 0;
    }

    let currentHash = Math.abs(hash) || 12345;
    for (let r = 0; r < s; r++) {
      for (let c = 0; c < s; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c > 12) || (r > 12 && c < 8)) continue;
        if (r === 6 || c === 6) continue;
        currentHash = (currentHash * 1664525 + 1013904223) % 4294967296;
        matrix[r][c] = currentHash % 2 === 0;
      }
    }
    return matrix;
  }, [value]);

  return (
    <svg width={size} height={size} viewBox="0 0 21 21" style={{ backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#111827" rx={0.15} /> : null
        )
      )}
    </svg>
  );
}

function DebtPaymentReceiptModal({ 
  payment, 
  debt, 
  onClose,
  theme 
}: { 
  payment: DebtPayment; 
  debt: Debt; 
  onClose: () => void; 
  theme?: string;
}) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const totalAmount = debt.amount || 0;
  const totalPaidSoFar = debt.paidAmount || 0;
  const remainingBalance = Math.max(0, totalAmount - totalPaidSoFar);
  const isFullySettled = remainingBalance === 0 || debt.status === 'paid';
  const paymentDateStr = payment.date ? format(payment.date.toDate(), 'dd MMM yyyy • hh:mm a') : format(new Date(), 'dd MMM yyyy • hh:mm a');
  const progressPercent = Math.min(100, Math.round((totalPaidSoFar / (totalAmount || 1)) * 100));

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#F7F8FA',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 540,
      });
      const link = document.createElement('a');
      link.download = `frenzo-pass-${debt.person.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${format(payment.date ? payment.date.toDate() : new Date(), 'yyyyMMdd-HHmm')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate image download. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!receiptRef.current) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#F7F8FA',
        scale: 3,
        logging: false,
        useCORS: true,
        allowTaint: true,
        windowWidth: 540,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGenerating(false);
          return;
        }
        const file = new File([blob], `frenzo-pass-${debt.person}.png`, { type: 'image/png' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Official Payment Receipt',
              text: `Payment Receipt for ${debt.person}: ${formatCurrency(payment.amount)}. Remaining: ${formatCurrency(remainingBalance)}`,
            });
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              handleDownload();
            }
          }
        } else {
          handleDownload();
          alert('Direct image sharing is not supported by this browser. The pass image has been downloaded to your device.');
        }
        setIsGenerating(false);
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Receipt generation error:', error);
      alert('Failed to generate receipt image for sharing.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-6 overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-md my-auto flex flex-col gap-4 z-10"
      >
        {/* Receipt Container to Capture */}
        <div 
          ref={receiptRef}
          data-receipt-card="true"
          style={{ 
            backgroundColor: '#F7F8FA', 
            width: '100%', 
            maxWidth: '440px', 
            margin: '0 auto', 
            padding: '24px 16px',
            boxSizing: 'border-box',
            fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif"
          }}
          className="rounded-[32px]"
        >
          {/* Vertical Event Ticket / Boarding Pass Container */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '28px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 12px 36px rgba(0,0,0,0.06)',
              position: 'relative',
              overflow: 'hidden',
              color: '#111827'
            }}
          >
            {/* 1. Header Section */}
            <div
              style={{
                padding: '24px 24px 16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              {/* App Logo & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{ 
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#66BB33',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(102, 187, 51, 0.3)'
                  }}
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ color: '#111827', fontSize: '18px', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.1 }}>
                    FRENZO
                  </h3>
                  <p style={{ color: '#6B7280', fontSize: '11px', fontWeight: 600, margin: '2px 0 0 0', lineHeight: 1.2 }}>
                    Official Payment Receipt
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span 
                style={{
                  backgroundColor: isFullySettled ? 'rgba(102, 187, 51, 0.08)' : '#FFF7ED',
                  color: isFullySettled ? '#66BB33' : '#FF8A3D',
                  border: `1.5px solid ${isFullySettled ? '#66BB33' : '#FF8A3D'}`,
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2'
                }}
              >
                {isFullySettled ? 'FULLY SETTLED' : 'PARTIALLY PAID'}
              </span>
            </div>

            {/* 2. Hero Amount Section */}
            <div 
              style={{ 
                padding: '8px 24px 20px 24px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}
            >
              <span style={{ color: '#6B7280', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.2 }}>
                AMOUNT PAID
              </span>
              <span style={{ color: '#66BB33', fontSize: '40px', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '4px 0' }}>
                {formatCurrency(payment.amount)}
              </span>
              <span style={{ color: '#6B7280', fontSize: '12px', fontWeight: 500, lineHeight: 1.3 }}>
                {paymentDateStr}
              </span>
            </div>

            {/* Perforated Separator 1 */}
            <div 
              style={{ 
                position: 'relative', 
                height: '24px', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  left: '-12px', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F7F8FA', 
                  borderRight: '1px solid #E5E7EB', 
                  zIndex: 2 
                }} 
              />
              <div style={{ width: '100%', height: '0px', borderTop: '2px dashed #E5E7EB', margin: '0 18px' }} />
              <div 
                style={{ 
                  position: 'absolute', 
                  right: '-12px', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F7F8FA', 
                  borderLeft: '1px solid #E5E7EB', 
                  zIndex: 2 
                }} 
              />
            </div>

            {/* 3. Transaction Details Section */}
            <div style={{ padding: '16px 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Row 1: Party & Agreement */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <UserIcon className="w-3.5 h-3.5" style={{ color: '#6B7280' }} />
                    <span style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Party / Operator
                    </span>
                  </div>
                  <p style={{ color: '#111827', fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                    {debt.person}
                  </p>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginBottom: '4px' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: '#66BB33' }} />
                    <span style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Agreement Type
                    </span>
                  </div>
                  <p style={{ color: '#66BB33', fontSize: '15px', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                    {debt.type === 'borrow' ? 'Debt Repayment' : 'Collection Received'}
                  </p>
                </div>
              </div>

              {/* Thin Divider */}
              <div style={{ height: '1px', backgroundColor: '#E5E7EB', width: '100%' }} />

              {/* Summary Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
                <div>
                  <p style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                    Total Amount
                  </p>
                  <p style={{ color: '#111827', fontSize: '15px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(totalAmount)}
                  </p>
                </div>

                <div>
                  <p style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                    Total Paid
                  </p>
                  <p style={{ color: '#66BB33', fontSize: '15px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(totalPaidSoFar)}
                  </p>
                </div>

                <div>
                  <p style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
                    Remaining
                  </p>
                  <p style={{ color: remainingBalance > 0 ? '#FF8A3D' : '#66BB33', fontSize: '15px', fontWeight: 800, margin: 0 }}>
                    {formatCurrency(remainingBalance)}
                  </p>
                </div>
              </div>

              {/* Repayment Progress */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700 }}>
                  <span style={{ color: '#6B7280' }}>Repayment Progress</span>
                  <span style={{ color: '#66BB33' }}>
                    {progressPercent}% Completion
                  </span>
                </div>
                <div style={{ backgroundColor: '#ECEFF1', width: '100%', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      backgroundColor: '#66BB33', 
                      height: '100%', 
                      borderRadius: '9999px',
                      width: `${progressPercent}%`,
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Note Section */}
              {payment.note && (
                <div 
                  style={{ 
                    backgroundColor: '#F7F8FA',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    marginTop: '2px',
                    border: '1px solid #E5E7EB'
                  }}
                >
                  <Edit3 className="w-4 h-4 shrink-0" style={{ color: '#6B7280', marginTop: '2px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#6B7280', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px 0' }}>
                      Note
                    </p>
                    <p style={{ color: '#111827', fontSize: '13px', fontWeight: 600, margin: 0, lineHeight: '1.4', wordBreak: 'break-word' }}>
                      {payment.note}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Perforated Separator 2 */}
            <div 
              style={{ 
                position: 'relative', 
                height: '24px', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <div 
                style={{ 
                  position: 'absolute', 
                  left: '-12px', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F7F8FA', 
                  borderRight: '1px solid #E5E7EB', 
                  zIndex: 2 
                }} 
              />
              <div style={{ width: '100%', height: '0px', borderTop: '2px dashed #E5E7EB', margin: '0 18px' }} />
              <div 
                style={{ 
                  position: 'absolute', 
                  right: '-12px', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: '#F7F8FA', 
                  borderLeft: '1px solid #E5E7EB', 
                  zIndex: 2 
                }} 
              />
            </div>

            {/* 4. Verification & Footer Area */}
            <div style={{ padding: '16px 24px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
              <ReceiptQRCode value={`FRENZO-PASS-${payment.id || 'AUTHENTIC'}`} size={90} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                <ShieldCheck className="w-4 h-4" style={{ color: '#66BB33' }} />
                <span>Verified Transaction</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#6B7280' }}>
                <span>Transaction ID:</span>
                <span 
                  style={{ 
                    fontFamily: 'monospace', 
                    fontWeight: 700, 
                    color: '#111827',
                    letterSpacing: '0.04em',
                    backgroundColor: '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {payment.id ? payment.id.toUpperCase() : 'ADG0QLAR90RMAD74BJM0'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' }}
            className="py-3 px-5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all border shadow-sm shrink-0"
          >
            Close
          </button>
          
          <button
            onClick={handleShare}
            disabled={isGenerating}
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', color: '#111827' }}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all border shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isGenerating}
            style={{ backgroundColor: '#66BB33', color: '#FFFFFF' }}
            className="flex-1 py-3 px-4 rounded-2xl font-bold text-sm hover:opacity-95 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isGenerating ? 'Saving...' : 'Download PNG'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DebtPaymentHistoryModal({ 
  debt, 
  debtPayments, 
  onClose,
  onRecordPayment,
  theme 
}: { 
  debt: Debt; 
  debtPayments: DebtPayment[]; 
  onClose: () => void;
  onRecordPayment: (debt: Debt) => void;
  theme?: string;
}) {
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<DebtPayment | null>(null);

  const payments = debtPayments.filter(p => p.debtId === debt.id);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleDeleteLog = async (paymentId: string, amount: number) => {
    try {
      await deleteDoc(doc(db, 'debtPayments', paymentId));
      const newPaidAmount = Math.max(0, (debt.paidAmount || 0) - amount);
      await updateDoc(doc(db, 'debts', debt.id!), {
        paidAmount: newPaidAmount,
        status: newPaidAmount >= debt.amount ? 'paid' : 'pending'
      });
    } catch (error) {
      console.error('Failed to delete payment log:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-xl bg-tech-card clay-card p-6 md:p-8 border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
      >
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div>
            <h3 className="font-brand text-2xl md:text-3xl text-tech-white tracking-tighter uppercase">Payment Logs</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{debt.person} • {debt.type === 'borrow' ? 'Borrowed' : 'Lent'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-tech-white transition-colors bg-tech-inset rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Overview Banner */}
        <div className="my-6 p-4 bg-tech-inset rounded-2xl border border-white/5 grid grid-cols-2 gap-4">
          <div>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Agreed</span>
            <span className="text-lg font-brand text-tech-white">{formatCurrency(debt.amount)}</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Settled</span>
            <span className="text-lg font-brand text-tech-lime">{formatCurrency(totalPaid)}</span>
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {payments.length > 0 ? (
            payments.map((p) => (
              <div key={p.id} className="bg-tech-inset p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-tech-lime/20 transition-all">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedReceiptPayment(p)}
                    className="p-2.5 bg-tech-lime/10 hover:bg-tech-lime text-tech-lime hover:text-tech-black rounded-lg transition-all border border-tech-lime/20"
                    title="View & Share Receipt"
                  >
                    <FileText size={16} />
                  </button>
                  <div>
                    <div className="text-sm font-bold text-tech-white">{formatCurrency(p.amount)}</div>
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                      {format(p.date.toDate(), 'MMM d, yyyy • hh:mm a')}
                    </div>
                    {p.note && <div className="text-[10px] text-slate-400 italic mt-0.5">{p.note}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedReceiptPayment(p)}
                    className="px-2.5 py-1.5 bg-tech-gray hover:bg-white/10 text-tech-white rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5 flex items-center gap-1"
                  >
                    <Share2 size={12} />
                    <span>Receipt</span>
                  </button>
                  <button
                    onClick={() => p.id && handleDeleteLog(p.id, p.amount)}
                    className="p-1.5 text-slate-600 hover:text-tech-red transition-colors"
                    title="Delete Payment Log"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-500 font-black text-xs uppercase tracking-widest">
              No individual payment logs recorded yet.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <button
            onClick={() => {
              onClose();
              onRecordPayment(debt);
            }}
            className="w-full py-4 bg-tech-lime text-tech-black rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <Plus size={16} />
            Record New Payment
          </button>
        </div>

        <AnimatePresence>
          {selectedReceiptPayment && (
            <DebtPaymentReceiptModal
              payment={selectedReceiptPayment}
              debt={debt}
              theme={theme}
              onClose={() => setSelectedReceiptPayment(null)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function BorrowLendSection({ 
  debts, 
  debtPayments = [],
  theme,
  onAdd, 
  onDelete, 
  onToggleStatus, 
  onUpdate 
}: { 
  debts: Debt[], 
  debtPayments?: DebtPayment[],
  theme?: string,
  onAdd: () => void, 
  onDelete: (id: string) => void,
  onToggleStatus: (id: string, status: 'pending' | 'paid') => void,
  onUpdate: (debt: Debt) => void
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedHistoryDebt, setSelectedHistoryDebt] = useState<Debt | null>(null);
  
  const totalBorrowed = debts.filter(d => d.type === 'borrow' && d.status === 'pending').reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0);
  const totalLent = debts.filter(d => d.type === 'lend' && d.status === 'pending').reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0);

  const filteredDebts = debts.filter(d => filter === 'all' || d.status === filter);

  return (
    <div className="space-y-10">
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full aspect-video bg-tech-card rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            >
              <img src={selectedImage} alt="Screenshot" className="w-full h-full object-contain" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 transition-all border border-white/10"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}

        {selectedHistoryDebt && (
          <DebtPaymentHistoryModal
            debt={selectedHistoryDebt}
            debtPayments={debtPayments}
            theme={theme}
            onClose={() => setSelectedHistoryDebt(null)}
            onRecordPayment={(debt) => onUpdate(debt)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="font-brand text-3xl md:text-5xl text-tech-white tracking-tighter">Credit & Debt</h3>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Liability Management System</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-tech-inset p-1 rounded-xl border border-white/5 flex">
            {(['all', 'pending', 'paid'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === f ? "bg-tech-lime text-tech-black shadow-lg" : "text-slate-500 hover:text-tech-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <button 
            onClick={onAdd}
            className="bg-tech-lime text-tech-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-2 hover:scale-105 transition-all active:scale-95 shadow-[0_0_20px_rgba(165,243,68,0.2)]"
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-tech-card clay-card p-8 border border-tech-orange/20 relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-tech-orange/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center gap-3 mb-4 text-tech-orange">
            <ArrowDownLeft size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Borrowed</span>
          </div>
          <div className="text-3xl font-brand text-tech-white tracking-tighter">{formatCurrency(totalBorrowed)}</div>
        </div>
        
        <div className="bg-tech-card clay-card p-8 border border-tech-lime/20 relative overflow-hidden group">
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-tech-lime/10 rounded-full blur-2xl group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center gap-3 mb-4 text-tech-lime">
            <ArrowUpRight size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Total Lent</span>
          </div>
          <div className="text-3xl font-brand text-tech-white tracking-tighter">{formatCurrency(totalLent)}</div>
        </div>

        <div className="bg-tech-card clay-card p-8 border border-white/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-tech-inset/50 opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4 text-slate-400">
              <Activity size={20} />
              <span className="text-[10px] font-black uppercase tracking-widest">Net Position</span>
            </div>
            <div className={cn(
              "text-3xl font-brand tracking-tighter",
              totalLent - totalBorrowed >= 0 ? "text-tech-lime" : "text-tech-orange"
            )}>
              {formatCurrency(totalLent - totalBorrowed)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredDebts.length > 0 ? (
          filteredDebts.map((debt) => {
            const totalPaid = debt.paidAmount || 0;
            const remaining = debt.amount - totalPaid;
            const paidPercent = Math.min(100, Math.round((totalPaid / debt.amount) * 100));
            const isOverdue = debt.dueDate && debt.dueDate.toDate() < new Date() && debt.status === 'pending';
            const personPayments = debtPayments.filter(p => p.debtId === debt.id);
            
            return (
              <motion.div
                key={debt.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-tech-card clay-card p-6 border border-white/5 hover:border-tech-lime/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black",
                      debt.type === 'borrow' ? "bg-tech-orange/10 text-tech-orange" : "bg-tech-lime/10 text-tech-lime"
                    )}>
                      {debt.person[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-tech-white text-lg">{debt.person}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                          debt.type === 'borrow' ? "bg-tech-orange/10 text-tech-orange" : "bg-tech-lime/10 text-tech-lime"
                        )}>
                          {debt.type === 'borrow' ? 'Borrowed' : 'Lent'}
                        </span>
                        {isOverdue && (
                          <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-brand text-tech-white tracking-tighter">{formatCurrency(remaining)}</div>
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-tech-inset p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Principal</div>
                    <div className="text-xs font-black text-tech-white">{formatCurrency(debt.amount)}</div>
                  </div>
                  <div className="bg-tech-inset p-3 rounded-xl border border-white/5">
                    <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</div>
                    <div className="text-xs font-black text-tech-white">
                      {debt.dueDate ? format(debt.dueDate.toDate(), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Repayment Progress Bar */}
                <div className="mb-6 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-400">Repayment ({paidPercent}%)</span>
                    <span className="text-tech-lime font-bold">{formatCurrency(totalPaid)} / {formatCurrency(debt.amount)}</span>
                  </div>
                  <div className="w-full h-2 bg-tech-inset rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={cn(
                        "h-full transition-all duration-500 rounded-full",
                        debt.type === 'borrow' ? "bg-tech-orange" : "bg-tech-lime"
                      )} 
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedHistoryDebt(debt)}
                      className="px-3 py-2 bg-tech-gray hover:bg-tech-lime/20 hover:text-tech-lime text-tech-white rounded-lg transition-all border border-white/5 flex items-center gap-1.5 text-xs font-bold"
                      title="View Payment History Log"
                    >
                      <History size={14} className="text-tech-lime" />
                      <span>History ({personPayments.length})</span>
                    </button>
                    <button
                      onClick={() => onUpdate(debt)}
                      className="p-2 bg-tech-gray hover:bg-tech-lime hover:text-tech-black rounded-lg transition-all border border-white/5"
                      title="Record Payment / Add to Debt"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(debt.id!)}
                      className="p-2 bg-tech-gray hover:bg-tech-orange hover:text-tech-gray rounded-lg transition-all border border-white/5"
                      title="Delete Entry"
                    >
                      <Trash2 size={14} />
                    </button>
                    {debt.imageUrl && (
                      <button
                        onClick={() => setSelectedImage(debt.imageUrl!)}
                        className="p-2 bg-tech-gray hover:bg-tech-white hover:text-tech-black rounded-lg transition-all border border-white/5"
                      >
                        <ImageIcon size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => onToggleStatus(debt.id!, debt.status)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                      debt.status === 'paid' 
                        ? "bg-tech-lime/10 text-tech-lime border-tech-lime/20" 
                        : "bg-tech-orange/10 text-tech-orange border-tech-orange/20 hover:bg-tech-lime/10 hover:text-tech-lime hover:border-tech-lime/20"
                    )}
                  >
                    {debt.status === 'paid' ? 'Mark Pending' : 'Mark Paid'}
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="lg:col-span-2 bg-tech-card clay-card p-20 flex flex-col items-center justify-center text-center border-dashed border-2 border-white/5">
            <div className="w-20 h-20 bg-tech-inset rounded-3xl flex items-center justify-center mb-6 text-slate-700">
              <HandCoins size={40} />
            </div>
            <h4 className="font-brand text-2xl text-tech-white mb-2">Clear Records</h4>
            <p className="text-slate-500 text-xs font-black uppercase tracking-widest">No entries found for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UpdateDebtModal({ debt, onClose }: { debt: Debt, onClose: () => void }) {
  const [updateAmount, setUpdateAmount] = useState('');
  const [updateType, setUpdateType] = useState<'add' | 'pay'>('pay');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateAmount) return;

    const val = parseFloat(updateAmount);
    if (isNaN(val) || val <= 0) return;

    setIsSubmitting(true);
    try {
      const debtRef = doc(db, 'debts', debt.id!);
      if (updateType === 'add') {
        await updateDoc(debtRef, {
          amount: debt.amount + val
        });
      } else {
        const newPaid = (debt.paidAmount || 0) + val;
        await updateDoc(debtRef, {
          paidAmount: newPaid,
          status: newPaid >= debt.amount ? 'paid' : 'pending'
        });
      }

      if (auth.currentUser) {
        await addDoc(collection(db, 'debtPayments'), {
          debtId: debt.id,
          person: debt.person,
          amount: val,
          type: updateType,
          note: note.trim() || (updateType === 'pay' ? 'Payment recorded' : 'Principal added'),
          date: Timestamp.now(),
          uid: auth.currentUser.uid
        });
      }

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'debts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-md bg-tech-card clay-card p-6 md:p-10 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <h2 className="font-brand text-2xl md:text-4xl text-tech-white tracking-tighter">Update Balance</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-tech-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="mb-8 p-4 bg-tech-inset rounded-xl border border-white/5">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Status</div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-black text-tech-white">{formatCurrency(debt.amount - (debt.paidAmount || 0))}</div>
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Remaining of {formatCurrency(debt.amount)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-tech-lime uppercase tracking-tighter">{debt.person}</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex p-1 bg-tech-inset rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setUpdateType('pay')}
              className={cn(
                "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                updateType === 'pay' ? "bg-tech-lime text-tech-black shadow-lg shadow-tech-lime/20" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setUpdateType('add')}
              className={cn(
                "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                updateType === 'add' ? "bg-tech-orange text-tech-black shadow-lg shadow-tech-orange/20" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Add to Debt
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Amount</label>
            <div className="relative">
              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-tech-lime/50">
                <IndianRupee size={24} className="md:w-7 md:h-7" />
              </div>
              <input
                type="number"
                value={updateAmount}
                onChange={(e) => setUpdateAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-16 pr-8 py-4 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all text-2xl font-black tabular-nums text-tech-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Note / Reference (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., GPay transaction #1234, cash, partial EMI..."
              className="w-full px-4 py-3 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all text-xs text-tech-white"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-tech-lime text-tech-black rounded-xl font-black text-base uppercase tracking-tighter hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)]"
          >
            {isSubmitting ? 'Recording...' : 'Save Payment Log'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddDebtModal({ onClose, uid }: { onClose: () => void, uid: string }) {
  const [amount, setAmount] = useState('');
  const [person, setPerson] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<DebtType>('borrow');
  const [dueDate, setDueDate] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB for Firestore
        alert("Image size too large. Please select a smaller image (max 800KB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !person) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'debts'), {
        person,
        amount: parseFloat(amount),
        description,
        type,
        status: 'pending',
        date: Timestamp.now(),
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        imageUrl,
        paidAmount: 0,
        uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'debts');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-md bg-tech-card clay-card p-6 md:p-10 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <h2 className="font-brand text-2xl md:text-4xl text-tech-white tracking-tighter">Add Entry</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-tech-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex p-1 bg-tech-inset rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setType('borrow')}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  type === 'borrow' ? "bg-tech-orange text-tech-black shadow-lg shadow-tech-orange/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Borrow
              </button>
              <button
                type="button"
                onClick={() => setType('lend')}
                className={cn(
                  "flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  type === 'lend' ? "bg-tech-lime text-tech-black shadow-lg shadow-tech-lime/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                Lend
              </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Amount</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-5 py-4 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Person</label>
                <input
                  type="text"
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  placeholder="Name"
                  className="w-full px-5 py-4 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this for?"
                className="w-full px-5 py-4 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-5 py-4 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all font-black text-tech-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Payment Screenshot</label>
              <div className="flex items-center gap-4">
                <label className="flex-1 flex flex-col items-center justify-center px-4 py-8 bg-tech-inset border-2 border-dashed border-white/5 hover:border-tech-lime/30 rounded-2xl cursor-pointer transition-all group">
                  {imageUrl ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={24} className="text-white" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Camera size={32} className="text-slate-600 group-hover:text-tech-lime transition-colors mb-2" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Upload Screenshot</span>
                    </>
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
                {imageUrl && (
                  <button 
                    type="button" 
                    onClick={() => setImageUrl(null)}
                    className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-tech-lime text-tech-black rounded-xl font-black text-lg uppercase tracking-tighter hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)] mt-4"
          >
            {isSubmitting ? 'Saving...' : 'Save Entry'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddBudgetModal({ onClose, uid }: { onClose: () => void, uid: string }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Food', 'Transport', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'budgets'), {
        category,
        amount: parseFloat(amount),
        period: 'monthly',
        uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'budgets');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="relative w-full max-w-md bg-tech-card clay-card p-6 md:p-10 border border-white/10"
      >
        <div className="flex items-center justify-between mb-8 md:mb-10">
          <h2 className="font-brand text-2xl md:text-4xl text-tech-white tracking-tighter">Set Limit</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-tech-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 md:space-y-10">
          <div className="space-y-6 md:space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Monthly Limit</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-tech-lime/50">
                  <IndianRupee size={24} className="md:w-7 md:h-7" />
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-16 pr-8 py-4 md:py-6 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-xl outline-none transition-all text-2xl md:text-4xl font-black tabular-nums text-tech-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-1">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "py-2.5 md:py-3 px-3 md:px-4 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-tighter transition-all border",
                      category === cat 
                        ? "bg-tech-lime text-tech-black border-tech-lime shadow-lg shadow-tech-lime/20" 
                        : "bg-tech-gray text-slate-500 border-white/5 hover:border-white/20 hover:text-slate-300"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-tech-lime text-tech-black rounded-xl font-black text-lg uppercase tracking-tighter hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_30px_rgba(165,243,68,0.2)]"
          >
            {isSubmitting ? 'Saving...' : 'Save Limit'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddTransactionModal({ onClose, uid, preferences }: { onClose: () => void, uid: string, preferences: UserPreferences }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [type, setType] = useState<TransactionType>('expense');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Food', 'Transport', 'Rent', 'Entertainment', 'Shopping', 'Health', 'Education', 'Investment', 'Debt', 'Income', 'Other'];

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: file.type
                }
              },
              {
                text: "Extract the total amount, category (one of: Food, Transport, Rent, Entertainment, Shopping, Health, Income, Other), and a brief description from this receipt/bill. Return ONLY a JSON object with keys: amount (number), category (string), description (string). If you can't find a field, leave it null."
              }
            ]
          },
          config: {
            responseMimeType: "application/json"
          }
        });
        
        const data = JSON.parse(response.text || '{}');
        if (data.amount) setAmount(data.amount.toString());
        if (data.description) setDescription(data.description);
        if (data.category && categories.includes(data.category)) setCategory(data.category);
        setIsSubmitting(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("AI Scan Error:", error);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'transactions'), {
        description,
        amount: parseFloat(amount),
        category,
        type,
        date: Timestamp.now(),
        uid
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'transactions');
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
          "relative w-full max-w-5xl bg-tech-card border border-white/10 overflow-hidden shadow-2xl rounded-[2.5rem]",
          preferences.glassMode && "bg-white/5 backdrop-blur-2xl"
        )}
      >
        <div className="p-8 md:p-10 border-b border-white/5 bg-tech-gray/30 flex items-center justify-between">
          <div>
            <h2 className="font-brand text-3xl md:text-5xl text-tech-white tracking-tighter leading-none mb-2">New <span className="text-tech-lime">Entry</span></h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Initialize transaction log</p>
          </div>
          <button onClick={onClose} className="p-3 bg-tech-gray/50 hover:bg-tech-red/20 text-slate-500 hover:text-tech-red rounded-2xl transition-all border border-white/5">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 md:p-10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {/* Horizontal Layout for Main Inputs */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Type & Amount */}
              <div className="lg:col-span-5 space-y-8">
                <div className="flex p-1 bg-tech-inset rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                      type === 'expense' ? "bg-tech-orange text-tech-black shadow-lg shadow-tech-orange/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <TrendingDown size={16} />
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('income')}
                    className={cn(
                      "flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                      type === 'income' ? "bg-tech-lime text-tech-black shadow-lg shadow-tech-lime/20" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    <TrendingUp size={16} />
                    Income
                  </button>
                </div>

                <div className="bg-tech-inset p-8 rounded-3xl border border-white/5 relative group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Amount Matrix</label>
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 text-tech-lime/30 group-focus-within:text-tech-lime transition-colors">
                      <IndianRupee size={40} />
                    </div>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-16 pr-0 py-2 bg-transparent border-none focus:ring-0 outline-none text-5xl md:text-7xl font-brand tracking-tighter text-tech-white tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Details & Scan */}
              <div className="lg:col-span-7 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Description</label>
                    <div className="relative">
                      <Edit3 size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Log details..."
                        className="w-full pl-14 pr-6 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-1">Category</label>
                    <div className="relative">
                      <Layout size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <button
                        type="button"
                        onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                        className="w-full pl-14 pr-10 py-5 bg-tech-inset border border-white/5 focus:border-tech-lime/50 rounded-2xl outline-none transition-all font-black text-tech-white text-sm text-left flex items-center justify-between"
                      >
                        {category}
                        <ChevronDown size={18} className={cn("transition-transform", isCategoryOpen && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                        {isCategoryOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 w-full mt-2 bg-tech-card clay-card border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden"
                          >
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar p-2">
                              {categories.map(cat => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setCategory(cat);
                                    setIsCategoryOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-3 rounded-xl text-left text-xs font-black uppercase tracking-widest transition-all",
                                    category === cat ? "bg-tech-lime text-tech-black" : "text-slate-400 hover:bg-tech-gray hover:text-tech-white"
                                  )}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-6 bg-tech-gray/50 text-tech-lime rounded-2xl border border-tech-lime/20 hover:bg-tech-lime hover:text-tech-black transition-all flex items-center justify-center gap-4 font-black uppercase tracking-widest text-[10px]"
                  >
                    <Camera size={20} />
                    Scan Receipt Log
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleScanReceipt} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[1.5] py-6 bg-tech-lime text-tech-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] transition-all disabled:opacity-50 active:scale-95 shadow-[0_0_40px_rgba(165,243,68,0.25)] flex items-center justify-center gap-4"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus size={20} />
                        Authorize Log
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

function TransactionList({ transactions, onDelete }: { transactions: Transaction[], onDelete: (id: string) => void }) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 bg-tech-inset rounded-3xl border border-white/5 border-dashed">
        <div className="w-20 h-20 bg-tech-gray rounded-full flex items-center justify-center mb-6 border border-white/5">
          <FileText size={32} className="text-slate-500" />
        </div>
        <h3 className="font-brand text-3xl text-tech-white mb-2">No Data Logs</h3>
        <p className="text-slate-500 text-sm font-medium text-center max-w-[240px]">
          System standby. No financial activity recorded in the current cycle.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {transactions.map((tx) => (
        <motion.div
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          key={tx.id}
          className="group relative bg-tech-card clay-card p-4 md:p-6 border border-white/5 hover:border-white/20 transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-5">
              <div className={cn(
                "w-10 h-10 md:w-14 md:h-14 rounded-xl flex items-center justify-center border shadow-inner shrink-0",
                tx.type === 'income' 
                  ? "bg-tech-lime/10 border-tech-lime/20 text-tech-lime" 
                  : "bg-tech-orange/10 border-tech-orange/20 text-tech-orange"
              )}>
                {tx.type === 'income' ? <ArrowUpRight className="w-4.5 h-4.5 md:w-6 md:h-6" /> : <ArrowDownRight className="w-4.5 h-4.5 md:w-6 md:h-6" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-tech-white text-sm md:text-lg tracking-tight mb-0.5 md:mb-1 truncate">{tx.description}</h4>
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 bg-tech-gray px-1.5 md:px-2 py-0.5 rounded border border-white/5">
                    {tx.category}
                  </span>
                  <span className="text-[8px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {tx.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 border-t sm:border-t-0 border-white/5 pt-3 md:pt-4 sm:pt-0">
              <div className="text-left sm:text-right">
                <div className={cn(
                  "text-base md:text-xl font-black tabular-nums tracking-tighter",
                  tx.type === 'income' ? "text-tech-lime" : "text-tech-orange"
                )}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
              </div>
              
              <button
                onClick={() => onDelete(tx.id)}
                className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-2 md:p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4.5 md:h-4.5" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function AnalysisSection({ transactions }: { transactions: Transaction[] }) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const filteredData = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const date = t.date.toDate();
      if (timeframe === 'daily') return isSameDay(date, now);
      if (timeframe === 'weekly') return isSameWeek(date, now);
      if (timeframe === 'monthly') return isSameMonth(date, now);
      if (timeframe === 'yearly') return isSameYear(date, now);
      return true;
    });
  }, [transactions, timeframe]);

  const stats = useMemo(() => {
    const income = filteredData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredData]);

  const chartData = useMemo(() => {
    const groups: Record<string, { income: number, expense: number }> = {};
    
    filteredData.forEach(t => {
      const date = t.date.toDate();
      let key = '';
      if (timeframe === 'daily') key = format(date, 'HH:00');
      else if (timeframe === 'weekly') key = format(date, 'EEE');
      else if (timeframe === 'monthly') key = format(date, 'dd MMM');
      else key = format(date, 'MMM');

      if (!groups[key]) groups[key] = { income: 0, expense: 0 };
      if (t.type === 'income') groups[key].income += t.amount;
      else groups[key].expense += t.amount;
    });

    return Object.entries(groups).map(([name, data]) => ({ name, ...data }));
  }, [filteredData, timeframe]);

  return (
    <div className="space-y-16 md:space-y-28">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 md:gap-12">
        <div className="max-w-3xl">
          <h3 className="font-brand text-5xl md:text-8xl text-tech-white tracking-tighter leading-[0.85] mb-8">Financial <span className="text-tech-lime italic">Intelligence</span></h3>
          <div className="flex items-center gap-6">
            <div className="w-1.5 md:w-2 h-12 md:h-16 bg-tech-lime rounded-full shadow-[0_0_15px_rgba(165,243,68,0.5)]" />
            <p className="text-slate-500 text-sm md:text-xl font-medium tracking-tight leading-tight max-w-xl uppercase">Deep system diagnostics & <span className="text-tech-white">historical trends</span> analysis.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap p-1.5 bg-tech-inset rounded-2xl border border-white/5 self-start shadow-xl">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-6 md:px-10 py-3 md:py-5 rounded-xl text-[9px] md:text-xs font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap",
                timeframe === t 
                  ? "bg-tech-lime text-tech-black shadow-[0_0_20px_rgba(165,243,68,0.4)] scale-105 z-10" 
                  : "text-slate-500 hover:text-tech-white hover:bg-white/5"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {[
          { label: 'Period Inflow', value: stats.income, color: 'text-tech-lime', icon: TrendingUp, bg: 'bg-tech-lime/5' },
          { label: 'Period Outflow', value: stats.expense, color: 'text-tech-orange', icon: TrendingDown, bg: 'bg-tech-orange/5' },
          { label: 'Net Efficiency', value: stats.balance, color: 'text-tech-white', icon: Wallet, bg: 'bg-white/5', className: "sm:col-span-2 lg:col-span-1" },
        ].map((stat, i) => (
          <div key={i} className={cn("bg-tech-card clay-card p-8 md:p-12 border-white/5 relative overflow-hidden group shadow-xl", stat.className)}>
            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700", stat.bg)} />
            <div className="flex items-center justify-between mb-8 md:mb-10 relative z-10">
              <span className="text-[9px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-500">{stat.label}</span>
              <div className={cn("p-4 md:p-6 rounded-xl bg-tech-gray border border-white/10 shadow-xl", stat.color)}>
                <stat.icon size={24} className="md:w-8 md:h-8" />
              </div>
            </div>
            <h4 className={cn("font-brand text-4xl md:text-6xl relative z-10 tracking-tighter leading-none", stat.color)}>{formatCurrency(stat.value)}</h4>
            <div className="absolute -bottom-8 -right-8 opacity-5 group-hover:opacity-15 transition-all duration-1000 group-hover:scale-125 group-hover:-rotate-12">
              <stat.icon size={150} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-tech-card clay-card p-6 md:p-12 border-white/5 min-h-[400px] md:min-h-[550px] flex flex-col relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-tech-lime/5 rounded-full blur-[100px] -mr-60 -mt-60" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12 md:mb-16 relative z-10">
          <div className="flex items-center gap-5">
            <div className="p-4 md:p-6 bg-tech-gray rounded-2xl border border-white/10 shadow-xl">
              <BarChartIcon className="text-tech-lime w-6 h-6 md:w-10 md:h-10" />
            </div>
            <div>
              <h3 className="font-brand text-2xl md:text-5xl text-tech-white tracking-tighter leading-none">Performance Matrix</h3>
              <p className="text-[9px] md:text-xs font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Visualizing operational efficiency</p>
            </div>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-tech-lime shadow-[0_0_15px_rgba(165,243,68,0.6)]" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inflow</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-tech-orange shadow-[0_0_15px_rgba(255,107,0,0.6)]" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Outflow</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-[350px] md:min-h-[450px] relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A5F344" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#A5F344" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#FF6B00" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }}
                dy={15}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }}
                tickFormatter={(value) => `₹${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0D0D0D', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '24px', 
                  color: '#FFFFFF', 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
                  padding: '20px',
                  backdropFilter: 'blur(10px)'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="#A5F344" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorIncome)" 
                animationDuration={2000}
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                stroke="#FF6B00" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorExpense)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function CategoryBarChart({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter(t => t.type === 'expense');
  const dataMap = expenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(dataMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] py-10">
        <div className="w-16 h-16 bg-tech-gray rounded-full flex items-center justify-center mb-4 border border-white/5 opacity-20">
          <BarChartIcon size={32} />
        </div>
        NO ALLOCATION DATA
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 40, top: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fill: '#64748B', fontSize: 10, fontWeight: 900 }}
          width={100}
        />
        <Tooltip 
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          contentStyle={{ 
            backgroundColor: '#0D0D0D', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '24px', 
            color: '#FFFFFF', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
            padding: '16px',
            backdropFilter: 'blur(10px)'
          }}
          itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }}
          formatter={(value: number) => [formatCurrency(value), '']}
        />
        <Bar 
          dataKey="value" 
          fill="#A5F344" 
          radius={[0, 12, 12, 0]} 
          barSize={24}
          animationDuration={2000}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}




