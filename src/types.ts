export type TransactionType = 'income' | 'expense' | 'payable' | 'receivable';

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  type: TransactionType;
  date: string;
  status?: 'pending' | 'completed';
}

export interface UserProfile {
  name: string;
  bankSavings: number;
  savingsGoal: number;
}

export const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
  expense: ['Food', 'Rent', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Utilities', 'Other'],
  payable: ['Loan Payment', 'Credit Card', 'Friend', 'Other'],
  receivable: ['Lent Money', 'Client Payment', 'Refund', 'Other']
};
