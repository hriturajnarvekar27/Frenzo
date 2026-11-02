import { before, after, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';

import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

import { readFileSync } from 'node:fs';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'demo-frenzo-rules';

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

after(async () => {
  await testEnv.cleanup();
});

async function seed(path: string, id: string, data: object) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path, id), data);
  });
}

const now = Timestamp.now();

test('Users can create their own budgets', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'budgets', 'budget-1'), {
      uid: 'user-a',
      category: 'Food',
      amount: 5000,
      period: 'monthly',
    })
  );
});

test('Users cannot create budgets for another UID', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'budgets', 'budget-2'), {
      uid: 'user-b',
      category: 'Food',
      amount: 5000,
      period: 'monthly',
    })
  );
});

test('Users can create their own debts', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'debts', 'debt-1'), {
      uid: 'user-a',
      type: 'borrow',
      person: 'Test Person',
      amount: 1000,
      status: 'pending',
      date: now,
    })
  );
});

test('Users cannot create debts for another UID', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'debts', 'debt-2'), {
      uid: 'user-b',
      type: 'borrow',
      person: 'Test Person',
      amount: 1000,
      status: 'pending',
      date: now,
    })
  );
});

test('Users can create their own EMIs', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'emis', 'emi-1'), {
      uid: 'user-a',
      title: 'Test Loan',
      source: 'Test Bank',
      totalAmount: 120000,
      principalAmount: 100000,
      interestAmount: 20000,
      monthlyInstallment: 10000,
      tenure: 12,
      paidInstallments: 0,
      startDate: now,
      nextDueDate: now,
      status: 'active',
    })
  );
});

test('Users cannot create EMI payments for another users EMI', async () => {
  await seed('emis', 'emi-other', {
    uid: 'user-b',
    title: 'Other User Loan',
    source: 'Test Bank',
    totalAmount: 120000,
    principalAmount: 100000,
    interestAmount: 20000,
    monthlyInstallment: 10000,
    tenure: 12,
    paidInstallments: 0,
    startDate: now,
    nextDueDate: now,
    status: 'active',
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'emiPayments', 'payment-1'), {
      uid: 'user-a',
      emiId: 'emi-other',
      amount: 10000,
      date: now,
      installmentNumber: 1,
    })
  );
});

test('Users can create EMI payments for their own EMI', async () => {
  await seed('emis', 'emi-own', {
    uid: 'user-a',
    title: 'My Loan',
    source: 'Test Bank',
    totalAmount: 120000,
    principalAmount: 100000,
    interestAmount: 20000,
    monthlyInstallment: 10000,
    tenure: 12,
    paidInstallments: 0,
    startDate: now,
    nextDueDate: now,
    status: 'active',
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'emiPayments', 'payment-2'), {
      uid: 'user-a',
      emiId: 'emi-own',
      amount: 10000,
      date: now,
      installmentNumber: 1,
    })
  );
});

test('Users cannot create debt payments for another users debt', async () => {
  await seed('debts', 'debt-other', {
    uid: 'user-b',
    type: 'borrow',
    person: 'Other Person',
    amount: 5000,
    status: 'pending',
    date: now,
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'debtPayments', 'payment-3'), {
      uid: 'user-a',
      debtId: 'debt-other',
      amount: 500,
      type: 'pay',
      date: now,
    })
  );
});

test('Users can create payment profiles with their own UID', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'payment_profiles', 'profile-1'), {
      uid: 'user-a',
      name: 'Test Profile',
    })
  );
});

test('Users cannot create payment profiles for another UID', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'payment_profiles', 'profile-2'), {
      uid: 'user-b',
      name: 'Unauthorized Profile',
    })
  );
});

test('Users can create their own payment requests', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'payment_requests', 'request-1'), {
      uid: 'user-a',
      amount: 500,
    })
  );
});

test('Users can create their own savings goals', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'savings_goals', 'goal-1'), {
      uid: 'user-a',
      title: 'Emergency Fund',
      targetAmount: 50000,
    })
  );
});

test('Users cannot change ownership of a savings goal', async () => {
  await seed('savings_goals', 'goal-2', {
    uid: 'user-a',
    title: 'My Goal',
    targetAmount: 50000,
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'savings_goals', 'goal-2'), {
      uid: 'user-b',
      title: 'My Goal',
      targetAmount: 50000,
    })
  );
});