import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

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

// Gemini Receipt OCR Endpoint
app.post('/api/gemini/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 field is required' });
    }

    const ai = getGeminiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

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
    return res.status(500).json({ error: err.message || 'Failed to analyze receipt image with AI.' });
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
