import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Lazy init Gemini client to avoid crash on load if key missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});


// Basic per-IP protection for public AI endpoints. For multi-instance production,
// replace this in-memory limiter with a shared store (for example Redis).
const aiRequestWindows = new Map<string, { count: number; resetAt: number }>();
app.use('/api/gemini', (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const current = aiRequestWindows.get(key);
  if (!current || now >= current.resetAt) {
    aiRequestWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (current.count >= 30) {
    return res.status(429).json({ error: 'AI request limit reached. Please try again in a minute.' });
  }
  current.count += 1;
  return next();
});


// Verify Firebase Authentication ID tokens before any Gemini endpoint.
// Configure FIREBASE_SERVICE_ACCOUNT_JSON as a secret in the hosting platform.
let firebaseAdminAuth: ReturnType<typeof getAuth> | null = null;

function getFirebaseAdminAuth() {
  if (firebaseAdminAuth) return firebaseAdminAuth;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const adminApp = getApps()[0] || initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: String(serviceAccount.private_key || '').replace(/\\n/g, '\n'),
    }),
  });

  firebaseAdminAuth = getAuth(adminApp);
  return firebaseAdminAuth;
}

app.use('/api/gemini', async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ error: 'Authentication required. Please sign in and try again.' });
  }

  let adminAuth;
  try {
    adminAuth = getFirebaseAdminAuth();
  } catch (error) {
    console.error('Firebase Admin configuration error:', error);
    return res.status(503).json({ error: 'AI authentication is not configured on the server.' });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(match[1], true);
    if (decodedToken.firebase?.sign_in_provider === 'anonymous') {
      return res.status(403).json({ error: 'A registered account is required to use Frenzo AI features.' });
    }
    res.locals.firebaseUser = decodedToken;
    return next();
  } catch (error) {
    console.warn('Rejected invalid Firebase ID token.');
    return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
  }
});

// Dashboard financial insights. Gemini remains server-side; the browser sends
// only the small transaction summary needed to generate the tips.
app.post('/api/gemini/financial-insights', async (req, res) => {
  try {
    const transactions = req.body?.transactions;
    if (!Array.isArray(transactions) || transactions.length === 0 || transactions.length > 20) {
      return res.status(400).json({ error: 'Provide between 1 and 20 transactions.' });
    }

    const safeTransactions = transactions.map((item: any) => ({
      type: String(item?.type || 'expense').slice(0, 20),
      amount: Number(item?.amount) || 0,
      category: String(item?.category || 'Other').slice(0, 60),
      date: String(item?.date || '').slice(0, 10),
    }));

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Analyze these recent financial transactions and provide exactly 3 brief, practical, actionable financial tips. Use a friendly, clear tone and Markdown bullets. Avoid claiming certainty from this limited sample. Transactions: ${JSON.stringify(safeTransactions)}`,
    });

    const insights = response.text?.trim();
    if (!insights) throw new Error('The AI service returned an empty response.');
    return res.json({ success: true, insights });
  } catch (err: any) {
    console.error('Financial insights generation failed:', err);
    return res.status(500).json({ error: 'Unable to generate financial insights right now. Please try again later.' });
  }
});

// Gemini Receipt OCR Endpoint
app.post('/api/gemini/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 field is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: 'Examine this receipt or invoice image with extreme accuracy. Extract vendor name, date, total amount, subtotal, tax amount, tip amount, category, payment method, individual line items breakdown, and anomaly alerts.',
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendor: { type: Type.STRING, description: 'Store or vendor name' },
            date: { type: Type.STRING, description: 'Transaction date in YYYY-MM-DD format if available' },
            amount: { type: Type.NUMBER, description: 'Total final amount paid' },
            subtotal: { type: Type.NUMBER, description: 'Subtotal before taxes and tip' },
            tax: { type: Type.NUMBER, description: 'Tax amount' },
            tip: { type: Type.NUMBER, description: 'Tip or gratuity' },
            category: { type: Type.STRING, description: 'Expense category: Food, Shopping, Utilities, Travel, Bills, Entertainment, Health, Education, or Other' },
            paymentMethod: { type: Type.STRING, description: 'Payment mode: Credit Card, UPI, Cash, Bank Transfer, Debit Card' },
            description: { type: Type.STRING, description: 'Short summary of items/purpose' },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                },
              },
            },
            confidence: { type: Type.STRING, description: 'OCR confidence rating: High, Medium, or Low' },
            anomalyAlert: { type: Type.STRING, description: 'Warnings or insights, e.g. High Tax, Possible duplicate, None' },
          },
          required: ['vendor', 'amount', 'category'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Error scanning receipt with Gemini Vision:', err);
    return res.status(500).json({ error: 'Failed to analyze receipt image with AI. Please try again.' });
  }
});

// Gemini Financial Copilot Conversational Chat Endpoint
app.post('/api/gemini/copilot-chat', async (req, res) => {
  const { message, history, financialContext } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `You are Frenzo Copilot, the precision financial AI command copilot of Frenzo.
You operate on live financial telemetry provided by the user.
Your personality: Industrial, analytical, razor-sharp, objective, concise, and empowering.
Avoid fluff, marketing jargon, or vague financial advice. Instead, reference specific numbers, percentages, burn rates, and savings timelines from their current financial telemetry.

Current Live Financial Telemetry:
${JSON.stringify(financialContext || {}, null, 2)}

Instructions:
1. Ground your response in the user's actual numbers (balance, income, expenses, budgets, savings goals, EMIs, debts).
2. If the user asks whether they can afford a purchase or expense (e.g. "Can I afford a $350 item?"):
   - Calculate the impact on their current liquid balance.
   - Contrast against their monthly burn rate and average remaining monthly budget.
   - Highlight any potential delay or risk to their active Savings Goals and upcoming EMI dues.
   - Provide a clear verdict ("Safe to proceed", "Cautionary / Tight", or "Not recommended right now") with explicit mathematical reasoning.
3. If the user expresses an intent to log a transaction or set a goal (e.g., "Add $45 for groceries", "Spent $12 at Subway yesterday", "Save $2000 for emergency fund by Dec 2026"):
   - Propose an action in the 'actionProposal' object so Frenzo can render a 1-click execution button.
   - For transactions: provide type ('expense' or 'income'), amount (number), category (one of Food, Transport, Rent, Entertainment, Shopping, Health, Education, Investment, Bills, Income, Other), description, and date (YYYY-MM-DD, defaults to today).
   - For goals: provide title, targetAmount (number), category (Emergency, Housing, Vehicle, Tech, Travel, Investment, Retirement, General), targetDate (YYYY-MM-DD), and priority ('low'|'medium'|'high').
4. Always provide 3 relevant, contextual suggestedQueries that the user might want to ask next based on this conversation.
5. Format the reply text in clean, scannable Markdown with bold numbers and bullet points.`;

    // Format chat contents
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        contents.push({
          role: item.role === 'model' ? 'model' : 'user',
          parts: [{ text: item.text || (item.parts && item.parts[0]?.text) || '' }]
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING, description: 'Markdown-formatted financial analysis and guidance' },
            actionProposal: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'add_transaction, create_goal, or none' },
                label: { type: Type.STRING, description: 'Human readable button label, e.g. Log $45 Groceries' },
                transactionData: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: 'expense or income' },
                    amount: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    date: { type: Type.STRING },
                  },
                },
                goalData: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    targetAmount: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    targetDate: { type: Type.STRING },
                    priority: { type: Type.STRING },
                  },
                },
              },
            },
            suggestedQueries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 high-value follow up questions'
            },
          },
          required: ['reply'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json({ success: true, data });
  } catch (err: any) {
    console.warn('Copilot AI chat unavailable, activating onboard financial heuristic engine:', err.message);
    
    // Telemetry-grounded heuristic analyzer
    const ctx = financialContext || {};
    const balance = Number(ctx.totalBalance || 0);
    const income = Number(ctx.totalIncome || 0);
    const expenses = Number(ctx.totalExpenses || 0);
    const savingsRate = ctx.netSavingsRate || (income > 0 ? `${Math.round(((income - expenses) / income) * 100)}%` : '0%');
    const goals = Array.isArray(ctx.savingsGoals) ? ctx.savingsGoals : [];
    const budgets = Array.isArray(ctx.budgets) ? ctx.budgets : [];

    const msgLower = message.toLowerCase();
    let reply = '';
    let actionProposal: any = null;
    let suggestedQueries = [
      "Can I afford a $250 purchase?",
      "Where am I spending the most this month?",
      "How are my savings goals tracking?"
    ];

    // Case 1: Affordability simulation (e.g. "Can I afford $X...", "Should I buy...")
    const affordMatch = message.match(/\$?(\d+(?:\.\d{1,2})?)/);
    if (/afford|buy|purchase|spend|cost/i.test(msgLower) && affordMatch) {
      const purchaseAmt = parseFloat(affordMatch[1]);
      const postBalance = balance - purchaseAmt;
      const isComfortable = postBalance > (expenses * 0.5) && balance > purchaseAmt * 2;
      
      reply = `### 🎯 Purchase Affordability Assessment\n\n` +
        `* **Item Cost:** $${purchaseAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Current Liquid Balance:** $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Projected Post-Purchase Balance:** $${postBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Monthly Net Savings Rate:** ${savingsRate}\n\n` +
        `**Copilot Verdict:** ${isComfortable ? '🟢 **Safe to Proceed**' : '⚠️ **Cautionary / Tight Runway**'}\n\n` +
        (isComfortable 
          ? `Your liquid cushion comfortably absorbs this expenditure. Your remaining runway is strong, and this purchase represents just **${Math.round((purchaseAmt / (balance || 1)) * 100)}%** of your available liquidity.`
          : `This expense consumes **${Math.round((purchaseAmt / (balance || 1)) * 100)}%** of your liquid reserves. Consider deferring this until your next income cycle to protect active goals.`);

      suggestedQueries = [
        `How would spending $${purchaseAmt} affect my roadmap goals?`,
        "What are my biggest budget leaks right now?",
        `Log $${purchaseAmt} expense`
      ];
    } 
    // Case 2: Intent to log transaction
    else if (/spent|paid|bought|earned|received|\+\$|-\$/i.test(msgLower) && affordMatch) {
      const txAmt = parseFloat(affordMatch[1]);
      const isInc = /earned|salary|received|income|deposit|\+/i.test(msgLower);
      const category = /coffee|lunch|dinner|food|restaurant|burger|pizza/i.test(msgLower) ? 'Food'
        : /uber|gas|fuel|flight|transit/i.test(msgLower) ? 'Transport'
        : /netflix|spotify|game|movie/i.test(msgLower) ? 'Entertainment'
        : /rent|lease/i.test(msgLower) ? 'Rent'
        : /electric|water|wifi|bill/i.test(msgLower) ? 'Bills'
        : isInc ? 'Income' : 'Other';

      reply = `I have parsed your statement: **${isInc ? 'Income' : 'Expense'} of $${txAmt.toFixed(2)}** categorized under **${category}**.\n\nClick the action card below to apply this directly to your live ledger.`;
      actionProposal = {
        type: 'add_transaction',
        label: `Log $${txAmt.toFixed(2)} ${category}`,
        transactionData: {
          type: isInc ? 'income' : 'expense',
          amount: txAmt,
          category,
          description: message.replace(/\$?\d+(\.\d{1,2})?/g, '').trim() || (isInc ? 'Income' : 'Expense'),
          date: new Date().toISOString().split('T')[0]
        }
      };
      suggestedQueries = [
        "What is my balance now?",
        "Am I exceeding any budget categories?",
        "Can I afford a $100 dinner tonight?"
      ];
    }
    // Case 3: Goals and Roadmaps
    else if (/goal|roadmap|save|milestone|target/i.test(msgLower)) {
      if (goals.length > 0) {
        reply = `### 🚀 Active Savings Roadmaps Overview\n\n` +
          goals.map((g: any) => {
            const pct = Math.round(((g.saved || 0) / (g.target || 1)) * 100);
            return `* **${g.title}**: $${(g.saved || 0).toLocaleString()} / $${(g.target || 0).toLocaleString()} (**${pct}%** saved)`;
          }).join('\n') +
          `\n\n**Recommendation:** Allocating an additional 5% of your monthly surplus can accelerate milestone completion by up to 2 months.`;
      } else {
        reply = `You currently do not have any active Savings Goals configured. Setting up a dedicated goal (such as an Emergency Reserve or Tech Upgrade) gives your surplus cash flow a clear trajectory.`;
      }
      suggestedQueries = [
        "How do I set up a $5,000 Emergency Fund?",
        "Can I afford a $500 purchase right now?",
        "Where is most of my money going?"
      ];
    }
    // Case 4: General spending / leaks / status inquiry
    else {
      reply = `### 📊 Live Financial Telemetry Summary\n\n` +
        `* **Liquid Balance:** $${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Total Tracked Inflow:** $${income.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Total Outflow:** $${expenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n` +
        `* **Net Savings Rate:** **${savingsRate}**\n` +
        `* **Active Budgets:** ${budgets.length} configured\n` +
        `* **Roadmap Targets:** ${goals.length} in progress\n\n` +
        `You have a **${balance >= 0 ? 'positive liquidity cushion' : 'negative cash flow balance'}**. Ask me about specific purchase affordability, budget overruns, or type quick entry commands.`;

      suggestedQueries = [
        "Can I afford a $200 purchase?",
        "Will I hit my savings milestones?",
        "Log $15 for lunch"
      ];
    }

    return res.json({
      success: true,
      data: {
        reply,
        actionProposal,
        suggestedQueries
      }
    });
  }
});

// Gemini Quick Action Natural Language Parser
app.post('/api/gemini/parse-quick-action', async (req, res) => {
  const { input } = req.body;
  if (!input) {
    return res.status(400).json({ error: 'input is required' });
  }

  try {
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: `Parse this natural language financial command into structured action data: "${input}".
Current date is: ${new Date().toISOString().split('T')[0]}.
Categories for transactions: Food, Transport, Rent, Entertainment, Shopping, Health, Education, Investment, Bills, Income, Other.
Categories for goals: Emergency, Housing, Vehicle, Tech, Travel, Investment, Retirement, General.
If it's an expense or income transaction, actionType is 'transaction'.
If it mentions saving for or setting a target milestone, actionType is 'goal'.
Extract precise numeric amounts, standard categories, concise descriptions, and ISO dates.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING, description: 'transaction or goal' },
            summary: { type: Type.STRING, description: 'One-line summary of what was parsed' },
            transaction: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: 'expense or income' },
                amount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                description: { type: Type.STRING },
                date: { type: Type.STRING },
              },
            },
            goal: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                targetAmount: { type: Type.NUMBER },
                category: { type: Type.STRING },
                targetDate: { type: Type.STRING },
                priority: { type: Type.STRING, description: 'low, medium, or high' },
              },
            },
          },
          required: ['actionType', 'summary'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json({ success: true, data });
  } catch (err: any) {
    console.warn('AI Quick action parse failed, switching to heuristic engine:', err.message);

    const amtMatch = input.match(/\$?(\d+(?:\.\d{1,2})?)/);
    const amount = amtMatch ? parseFloat(amtMatch[1]) : 25;
    const isGoal = /save|goal|target|fund|plan/i.test(input) && !/spent|paid|bought|expense/i.test(input);
    const isIncome = /earned|salary|received|income|deposit|got paid|\+/i.test(input);

    let category = 'Other';
    if (isIncome) category = 'Income';
    else if (/coffee|tea|lunch|dinner|food|groceries|snack|burger|restaurant|chipotle|starbucks|subway/i.test(input)) category = 'Food';
    else if (/uber|lyft|gas|fuel|flight|transit|bus|train|subway|chevron|shell/i.test(input)) category = 'Transport';
    else if (/netflix|spotify|game|steam|movie|cinema/i.test(input)) category = 'Entertainment';
    else if (/rent|mortgage|lease/i.test(input)) category = 'Rent';
    else if (/utility|bill|electric|water|wifi|internet|phone/i.test(input)) category = 'Bills';
    else if (/gym|doctor|health|medicine|cvs|pharmacy/i.test(input)) category = 'Health';
    else if (/apple|amazon|store|clothes|shoes|laptop|phone/i.test(input)) category = 'Shopping';

    if (isGoal) {
      const cleanTitle = input.replace(/save|goal|target|for|\$?\d+(\.\d{1,2})?/gi, '').trim() || 'Savings Target';
      return res.json({
        success: true,
        data: {
          actionType: 'goal',
          summary: `Target Goal: Save $${amount.toLocaleString()} for ${cleanTitle}`,
          goal: {
            title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
            targetAmount: amount,
            category: 'General',
            targetDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
            priority: 'medium'
          }
        }
      });
    }

    const cleanDesc = input.replace(/\$?\d+(\.\d{1,2})?/g, '').trim() || (isIncome ? 'Income' : 'Expense');
    return res.json({
      success: true,
      data: {
        actionType: 'transaction',
        summary: `Parsed ${isIncome ? 'income' : 'expense'}: $${amount.toFixed(2)} (${category})`,
        transaction: {
          type: isIncome ? 'income' : 'expense',
          amount,
          category,
          description: cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1),
          date: new Date().toISOString().split('T')[0]
        }
      }
    });
  }
});

// Gemini Batch Auto-Categorization for Bank/Card CSV Statement Rows
app.post('/api/gemini/auto-categorize-csv', async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'rows array is required' });
  }

  const batch = rows.slice(0, 80);

  try {
    const ai = getGeminiClient();

    const prompt = `You are a financial transaction categorization and merchant entity recognition expert.
Analyze the following bank/credit card statement transaction rows.
For each item:
1. Clean up cryptic merchant descriptions (e.g. "SQ *BLUE BOTTLE COFFEE 102" -> "Blue Bottle Coffee", "AMZN MKTP US*8G91" -> "Amazon", "CHEVRON 0092301" -> "Chevron Gas").
2. Accurately assign category from: Food, Transport, Rent, Entertainment, Shopping, Health, Education, Investment, Bills, Income, Other.
3. Determine if it's 'income' (credits, deposit, payroll, interest, refund) or 'expense' (debits, purchases, fees, charges, withdrawals).
4. Ensure valid YYYY-MM-DD date.

Input rows:
${JSON.stringify(batch, null, 2)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categorized: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  description: { type: Type.STRING },
                  category: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'expense or income' },
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                },
                required: ['id', 'description', 'category', 'type', 'amount', 'date'],
              },
            },
          },
          required: ['categorized'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: data.categorized || [] });
  } catch (err: any) {
    console.warn('AI batch categorize failed, activating merchant recognition heuristic engine:', err.message);

    // High accuracy merchant recognition and categorization heuristic
    const categorized = batch.map((r: any) => {
      let desc = (r.rawDescription || 'Transaction').toString();
      
      // Clean up merchant name
      let clean = desc
        .replace(/^(SQ\s*\*|TST\s*\*|POS\s+DEBIT\s+|PURCHASE\s+AUTHORIZED\s+ON\s+\d{2}\/\d{2}\s+|CHECKCARD\s+)/i, '')
        .replace(/\s*(#\d+|\*\d+|\d{4,})\s*$/g, '')
        .replace(/\s+(US\*\S+|COM|\.COM)$/i, '')
        .trim();

      if (!clean) clean = desc;

      const dLower = desc.toLowerCase();
      let category = 'Other';
      let type: 'expense' | 'income' = r.rawType || 'expense';

      if (/payroll|direct dep|salary|dividend|interest payment|refund|reimbursement|zelle from/i.test(dLower)) {
        category = 'Income';
        type = 'income';
      } else if (/coffee|starbucks|blue bottle|dunkin|chipotle|restaurant|wholefds|trader|grocer|burger|pizza|eats|doordash|cafe/i.test(dLower)) {
        category = 'Food';
      } else if (/uber|lyft|chevron|shell|gas|fuel|subway|metro|transit|airline|delta|united|american air/i.test(dLower)) {
        category = 'Transport';
      } else if (/netflix|spotify|hulu|steam|valve|playstation|xbox|cinema|amc|movie/i.test(dLower)) {
        category = 'Entertainment';
      } else if (/amazon|amzn|apple|target|walmart|bestbuy|store|shop/i.test(dLower)) {
        category = 'Shopping';
      } else if (/rent|lease|mortgage/i.test(dLower)) {
        category = 'Rent';
      } else if (/utility|pg&e|electric|water|at&t|verizon|wifi|internet|cable/i.test(dLower)) {
        category = 'Bills';
      } else if (/pharmacy|cvs|walgreens|doctor|dental|equinox|gym|fitness/i.test(dLower)) {
        category = 'Health';
      }

      return {
        id: r.id,
        description: clean.charAt(0).toUpperCase() + clean.slice(1),
        category,
        type,
        amount: Math.abs(Number(r.rawAmount || 0)),
        date: r.rawDate || new Date().toISOString().split('T')[0]
      };
    });

    return res.json({ success: true, data: categorized });
  }
});

// Vite Middleware for Dev / Static serving for Prod
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Frenzo Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
