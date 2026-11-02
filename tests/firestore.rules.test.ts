
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

test('Unauthenticated users cannot read transactions', async () => {
  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    getDoc(doc(db, 'transactions', 'transaction-1'))
  );
});

test('Anonymous users cannot read transactions', async () => {
  const db = testEnv.authenticatedContext('anonymous-user', {
    firebase: {
      sign_in_provider: 'anonymous',
    },
  }).firestore();

  await assertFails(
    getDoc(doc(db, 'transactions', 'transaction-1'))
  );
});

test('Registered users can read their own transactions', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, 'transactions', 'transaction-1'), {
      uid: 'user-a',
      type: 'expense',
      amount: 250,
      category: 'Food',
      date: Timestamp.now(),
      description: 'Test transaction',
    });
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    getDoc(doc(db, 'transactions', 'transaction-1'))
  );
});

test('Users cannot read another user transactions', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), 'transactions', 'transaction-2'),
      {
        uid: 'user-b',
        type: 'expense',
        amount: 500,
        category: 'Shopping',
        date: Timestamp.now(),
        description: 'Private transaction',
      }
    );
  });

  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    getDoc(doc(db, 'transactions', 'transaction-2'))
  );
});

test('Users cannot create transactions for another UID', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertFails(
    setDoc(doc(db, 'transactions', 'transaction-3'), {
      uid: 'user-b',
      type: 'expense',
      amount: 100,
      category: 'Food',
      date: Timestamp.now(),
      description: 'Unauthorized transaction',
    })
  );
});

test('Registered users can create their own transactions', async () => {
  const db = testEnv.authenticatedContext('user-a').firestore();

  await assertSucceeds(
    setDoc(doc(db, 'transactions', 'transaction-4'), {
      uid: 'user-a',
      type: 'expense',
      amount: 100,
      category: 'Food',
      date: Timestamp.now(),
      description: 'Authorized transaction',
    })
  );
});
