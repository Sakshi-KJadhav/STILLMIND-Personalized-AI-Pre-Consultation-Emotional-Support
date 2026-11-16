import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, type Content } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_MODEL = 'gemini-4-hydrogen';
const ALLOWED_MODELS = new Set<string>([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
  'gemini-4-carbon',
]);

function resolveModel(requested: unknown): string {
  if (typeof requested === 'string' && ALLOWED_MODELS.has(requested)) {
    return requested;
  }
  return DEFAULT_MODEL;
}

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error(
      'Server Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets.'
    ) as Error & { statusCode?: number; code?: string };
    err.statusCode = 503;
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiError(error: unknown): { status: number; message: string; code: string } {
  const errObj = error as {
    status?: number;
    statusCode?: number;
    code?: string;
    message?: string;
  };
  const rawMessage = errObj?.message || 'Unable to reach Gemini service.';
  const status = errObj?.statusCode || errObj?.status || 500;

  if (errObj?.code === 'API_KEY_MISSING') {
    return { status: 503, message: rawMessage, code: 'API_KEY_MISSING' };
  }
  if (status === 400 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(rawMessage)) {
    return {
      status: status === 400 ? 400 : 403,
      message:
        'Gemini API access was denied or the server key is invalid. Please check your key in Settings > Secrets.',
      code: 'INVALID_KEY',
    };
  }
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(rawMessage)) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached. Please wait briefly or select a billing-enabled key in Settings > Secrets.',
      code: 'RATE_LIMIT',
    };
  }
  if (status === 404 || /NOT_FOUND/i.test(rawMessage)) {
    return {
      status: 404,
      message: `Requested model is unavailable (${rawMessage}).`,
      code: 'MODEL_NOT_FOUND',
    };
  }

  return { status: status >= 400 && status < 600 ? status : 500, message: rawMessage, code: 'UPSTREAM_ERROR' };
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/gemini/chat', async (req: Request, res: Response) => {
    try {
      const { systemInstruction, contents, model } = req.body as {
        systemInstruction?: string;
        contents?: Content[];
        model?: string;
      };

      if (!Array.isArray(contents) || contents.length === 0) {
        res.status(400).json({ error: 'Conversation contents are required.', code: 'BAD_REQUEST' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: resolveModel(model),
        contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      const text = (response.text || '').trim();
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty response.', code: 'EMPTY_RESPONSE' });
        return;
      }

      res.json({ text });
    } catch (error) {
      const mapped = parseGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  app.post('/api/gemini/chat/stream', async (req: Request, res: Response) => {
    const { systemInstruction, contents, model } = req.body as {
      systemInstruction?: string;
      contents?: Content[];
      model?: string;
    };

    if (!Array.isArray(contents) || contents.length === 0) {
      res.status(400).json({ error: 'Conversation contents are required.', code: 'BAD_REQUEST' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (payload: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    try {
      const ai = getAiClient();
      const stream = await ai.models.generateContentStream({
        model: resolveModel(model),
        contents,
        config: systemInstruction ? { systemInstruction } : undefined,
      });

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        if (chunkText) {
          sendEvent({ chunk: chunkText });
        }
      }

      sendEvent({ done: true });
      res.end();
    } catch (error) {
      const mapped = parseGeminiError(error);
      sendEvent({ error: mapped.message, code: mapped.code });
      res.end();
    }
  });

  app.post('/api/gemini/note', async (req: Request, res: Response) => {
    try {
      const { systemInstruction, prompt, model } = req.body as {
        systemInstruction?: string;
        prompt?: string;
        model?: string;
      };

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required.', code: 'BAD_REQUEST' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: resolveModel(model),
        contents: prompt,
        config: {
          ...(systemInstruction ? { systemInstruction } : {}),
          responseMimeType: 'application/json',
        },
      });

      const text = (response.text || '').trim();
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty clinical note.', code: 'EMPTY_RESPONSE' });
        return;
      }

      res.json({ text });
    } catch (error) {
      const mapped = parseGeminiError(error);
      res.status(mapped.status).json({ error: mapped.message, code: mapped.code });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StillMind server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start StillMind server:', err);
  process.exit(1);
});
