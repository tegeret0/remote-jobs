import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { StorageService } from './src/services/storage.ts';
import { CollectionService } from './src/services/collection.ts';
import { GoogleSheetsService } from './src/services/sheets.ts';
import { createConnector } from './src/connectors/factory.ts';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Jobs
  app.get('/api/jobs', (req, res) => {
    try {
      const allJobs = StorageService.getJobs();
      const { search, country, remote_type, source, sync_status } = req.query;

      let filtered = allJobs;
      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          j => j.job_title.toLowerCase().includes(q) ||
               j.company_name.toLowerCase().includes(q) ||
               j.location.toLowerCase().includes(q)
        );
      }
      if (country && typeof country === 'string' && country !== 'all') {
        filtered = filtered.filter(j => j.country_eligibility === country);
      }
      if (remote_type && typeof remote_type === 'string' && remote_type !== 'all') {
        filtered = filtered.filter(j => j.remote_type === remote_type);
      }
      if (source && typeof source === 'string' && source !== 'all') {
        filtered = filtered.filter(j => j.source_name.toLowerCase().includes(source.toLowerCase()));
      }
      if (sync_status && typeof sync_status === 'string' && sync_status !== 'all') {
        filtered = filtered.filter(j => j.sync_status === sync_status);
      }

      res.json({ jobs: filtered, total: filtered.length, grandTotal: allJobs.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/jobs/:id', (req, res) => {
    try {
      const jobs = StorageService.getJobs();
      const updated = jobs.filter(j => j.job_id !== req.params.id);
      StorageService.saveJobs(updated);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Sources
  app.get('/api/sources', (req, res) => {
    try {
      const sources = StorageService.getSources();
      res.json({ sources });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sources', (req, res) => {
    try {
      const { name, type, identifier, enabled } = req.body;
      if (!name || !type || !identifier) {
        return res.status(400).json({ error: 'Name, type, and identifier are required' });
      }
      const newSource = StorageService.addSource({
        name,
        type,
        identifier,
        enabled: enabled ?? true,
        health: 'untested'
      });
      res.json({ source: newSource });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/sources/:id', (req, res) => {
    try {
      const updated = StorageService.updateSource(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Source not found' });
      res.json({ source: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/sources/:id', (req, res) => {
    try {
      const success = StorageService.deleteSource(req.params.id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sources/:id/test', async (req, res) => {
    try {
      const sources = StorageService.getSources();
      const source = sources.find(s => s.id === req.params.id);
      if (!source) return res.status(404).json({ error: 'Source not found' });

      const connector = createConnector(source);
      const val = await connector.validateConfiguration();

      if (val.isValid) {
        StorageService.updateSource(source.id, { health: 'healthy', last_error: undefined });
      } else {
        StorageService.updateSource(source.id, { health: 'error', last_error: val.error });
      }

      res.json(val);
    } catch (err: any) {
      res.status(500).json({ isValid: false, error: err.message });
    }
  });

  // Collection
  app.get('/api/collection/status', (req, res) => {
    try {
      const runs = StorageService.getRuns();
      const activeRunId = CollectionService.getActiveRunId();
      const currentRun = activeRunId ? runs.find(r => r.id === activeRunId) : null;
      const lastRun = runs.length > 0 ? runs[0] : null;

      res.json({
        isRunning: !!activeRunId,
        currentRun,
        lastRun
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/collection/run', async (req, res) => {
    try {
      if (CollectionService.getActiveRunId()) {
        return res.status(409).json({ error: 'A collection run is already in progress' });
      }
      const { sourceIds } = req.body;
      // Start in background to allow continuous UI progress polling
      const runPromise = CollectionService.executeCollection(sourceIds);
      // Respond with started run immediately
      setTimeout(async () => {
        try { await runPromise; } catch (e) { console.error('Run error:', e); }
      }, 10);

      const runs = StorageService.getRuns();
      res.json({ success: true, run: runs[0] || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/collection/cancel', (req, res) => {
    try {
      const cancelled = CollectionService.cancelCurrentRun();
      res.json({ success: cancelled });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/collection/runs', (req, res) => {
    try {
      const runs = StorageService.getRuns();
      res.json({ runs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Preferences
  app.get('/api/preferences', (req, res) => {
    try {
      const prefs = StorageService.getPreferences();
      res.json({ preferences: prefs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/preferences', (req, res) => {
    try {
      StorageService.savePreferences(req.body);
      res.json({ success: true, preferences: req.body });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Google Sheets integration routes
  app.get('/api/sheets/config', (req, res) => {
    try {
      const config = StorageService.getSheetConfig();
      res.json({ config });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sheets/config', (req, res) => {
    try {
      StorageService.saveSheetConfig(req.body);
      res.json({ success: true, config: req.body });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/sheets/test', async (req, res) => {
    try {
      const { accessToken, spreadsheetId, sheetName } = req.body;
      const result = await GoogleSheetsService.testConnection(accessToken, spreadsheetId, sheetName);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sheets/create', async (req, res) => {
    try {
      const { accessToken, title } = req.body;
      const result = await GoogleSheetsService.createTrackerSheet(accessToken, title);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sheets/sync', async (req, res) => {
    try {
      const { accessToken, spreadsheetId, sheetName, jobIds } = req.body;
      const allJobs = StorageService.getJobs();
      const targetJobs = jobIds && jobIds.length > 0
        ? allJobs.filter(j => jobIds.includes(j.job_id))
        : allJobs.filter(j => j.sync_status === 'pending');

      const result = await GoogleSheetsService.syncJobsToSheet(
        accessToken,
        spreadsheetId,
        sheetName,
        targetJobs
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Optional AI Job Intelligence / Fit Analysis powered by gemini-4-argon with thinkingLevel: HIGH
  app.post('/api/ai/analyze-job', async (req, res) => {
    try {
      const { jobTitle, company, location, description } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY is not configured in environment.' });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const prompt = `Analyze this engineering job opportunity for a remote software engineer targeting the US and Canada:
Job Title: ${jobTitle}
Company: ${company}
Location: ${location}
Description: ${description || 'Not provided'}

Provide a structured evaluation in JSON format:
1. "eligibilityVerdict": "Confirmed US/CA Remote", "Restricted", or "Ambiguous"
2. "usCandidateFit": Short explanation of whether candidates in the US can apply without visa barriers.
3. "canadaCandidateFit": Short explanation of whether candidates in Canada can apply cross-border.
4. "techStackHighlights": Array of 3-6 core technical skills required.
5. "seniorityAssessment": Inferred level (e.g. Junior, Mid, Senior, Staff, Lead).
6. "keyWatchouts": Array of potential red flags or location caveats.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-argon',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          }
        }
      });

      const analysis = JSON.parse(response.text || '{}');
      res.json({ success: true, analysis });
    } catch (err: any) {
      console.error('AI analysis error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount Vite development middlewares in dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Remote Job Intelligence Server active at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});
