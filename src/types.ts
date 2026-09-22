import { Timestamp } from 'firebase/firestore';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: Timestamp;
  description: string;
  uid: string;
}

export interface Category {
  id?: string;
  name: string;
  type: TransactionType;
  icon: string;
  uid: string;
}

export interface Budget {
  id?: string;
  category: string;
  amount: number;
  period: string;
  uid: string;
}

export type DebtType = 'borrow' | 'lend';

export interface Debt {
  id?: string;
  type: DebtType;
  person: string;
  amount: number;
  dueDate?: Timestamp;
  status: 'pending' | 'paid';
  uid: string;
  description: string;
  date: Timestamp;
  imageUrl?: string;
  paidAmount: number;
}

export interface DebtPayment {
  id?: string;
  debtId: string;
  amount: number;
  type: 'pay' | 'add';
  date: Timestamp;
  note?: string;
  uid: string;
}

export interface Summary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface Challenge {
  id?: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  startDate: Timestamp;
  endDate: Timestamp;
  type: 'no-spend' | 'savings' | 'budget';
  status: 'active' | 'completed' | 'failed';
  uid: string;
}

export interface EMIScheduleItem {
  installmentNumber: number;
  amount: number;
  dueDate: Timestamp;
  status: 'pending' | 'paid';
}

export interface EMI {
  id?: string;
  title: string;
  source: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  monthlyInstallment: number;
  tenure: number;
  paidInstallments: number;
  startDate: Timestamp;
  nextDueDate: Timestamp;
  status: 'active' | 'completed' | 'cancelled';
  uid: string;
  description?: string;
  monthlySchedule?: EMIScheduleItem[];
}

export interface EMIPayment {
  id?: string;
  emiId: string;
  amount: number;
  date: Timestamp;
  installmentNumber: number;
  uid: string;
}

export type LiveBackgroundEffect = 'antigravity' | 'colorwave' | 'asteroids' | 'aurora' | 'cybergrid' | 'constellations' | 'vortex' | 'matrix';

export interface UserPreferences {
  theme: 'emerald' | 'royal' | 'purple' | 'monochrome' | 'sunset' | 'forest' | 'cyberpunk' | 'gold' | 'ruby' | 'ocean' | 'midnight' | 'lava' | 'mint' | 'lavender' | 'slate';
  mode: 'light' | 'dark';
  glassMode: boolean;
  motivationStyle: 'streaks' | 'rewards' | 'challenges';
  streakCount: number;
  lastLoginDate: Timestamp;
  isDynamicTheme: boolean;
  backgroundEffect?: LiveBackgroundEffect;
}

export interface PaymentAccount {
  id: string;
  accountLabel: string;
  upiId: string;
  accountHolderName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  qrImageUrl?: string;
  isDefault?: boolean;
}

export interface PaymentProfile {
  id?: string;
  uid: string;
  upiId: string;
  accountHolderName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  qrImageUrl?: string;
  accounts?: PaymentAccount[];
  updatedAt?: Timestamp;
}

export interface SplitPerson {
  name: string;
  amount: number;
  status: 'pending' | 'settled';
}

export interface PaymentRequest {
  id?: string;
  uid: string;
  title: string;
  totalAmount: number;
  requestType: 'single' | 'split';
  payerName?: string;
  numberOfPeople?: number;
  perPersonAmount?: number;
  splitBreakdown?: SplitPerson[];
  upiId: string;
  accountHolderName: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  qrImageUrl?: string;
  note?: string;
  status: 'pending' | 'paid' | 'overdue';
  date: Timestamp;
  paidAmount?: number;
}

export interface GoalContribution {
  id?: string;
  goalId: string;
  amount: number;
  type: 'deposit' | 'withdraw';
  date: Timestamp;
  note?: string;
  uid: string;
}

export interface SavingsGoal {
  id?: string;
  title: string;
  category: 'Emergency' | 'Housing' | 'Vehicle' | 'Tech' | 'Travel' | 'Investment' | 'Retirement' | 'General';
  targetAmount: number;
  currentAmount: number;
  targetDate: Timestamp;
  monthlyContribution?: number;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  icon?: string;
  status: 'active' | 'achieved' | 'paused';
  uid: string;
  createdAt?: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
