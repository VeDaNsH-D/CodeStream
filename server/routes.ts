import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertProjectSchema, insertFileSchema, insertChatMessageSchema, insertAiSessionSchema } from "@shared/schema";
import { getCodeAssistance, debugCode, optimizeCode, explainCode } from "./services/openai";
import { compileAndRun, validateSyntax, getSupportedLanguages } from "./services/compiler";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects API
  app.get("/api/projects", async (req, res) => {
    try {
      // For demo, get projects for default user
      const projects = await storage.getProjectsByUser("user-1");
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse({
        ...req.body,
        ownerId: "user-1", // Default user for demo
        collaborators: ["user-1"],
      });
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid project data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  // Files API
  app.get("/api/projects/:projectId/files", async (req, res) => {
    try {
      const files = await storage.getFilesByProject(req.params.projectId);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await storage.getFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch file" });
    }
  });

  app.post("/api/files", async (req, res) => {
    try {
      const validatedData = insertFileSchema.parse(req.body);
      const file = await storage.createFile(validatedData);
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid file data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create file" });
    }
  });

  app.put("/api/files/:id", async (req, res) => {
    try {
      const updates = req.body;
      const file = await storage.updateFile(req.params.id, updates);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to update file" });
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const success = await storage.deleteFile(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "File not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Chat API
  app.get("/api/projects/:projectId/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessagesByProject(req.params.projectId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const validatedData = insertChatMessageSchema.parse({
        ...req.body,
        authorId: "user-1", // Default user for demo
      });
      const message = await storage.createChatMessage(validatedData);
      
      // Broadcast to WebSocket clients
      if (wss) {
        const messageWithAuthor = {
          ...message,
          author: { username: "Demo User", avatar: null }
        };
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'new_message',
              data: messageWithAuthor
            }));
          }
        });
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid message data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // AI Assistant API
  app.post("/api/ai/assistance", async (req, res) => {
    try {
      const { code, language, question, context } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Question is required" });
      }
      
      const response = await getCodeAssistance({ code, language, question, context });
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to get AI assistance: " + (error as Error).message });
    }
  });

  app.post("/api/ai/debug", async (req, res) => {
    try {
      const { code, language, errorMessage } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }
      
      const response = await debugCode(code, language, errorMessage);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to debug code: " + (error as Error).message });
    }
  });

  app.post("/api/ai/optimize", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }
      
      const response = await optimizeCode(code, language);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to optimize code: " + (error as Error).message });
    }
  });

  app.post("/api/ai/explain", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }
      
      const response = await explainCode(code, language);
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to explain code: " + (error as Error).message });
    }
  });

  // Compiler API
  app.post("/api/compile", async (req, res) => {
    try {
      const { code, language, input } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }
      
      const result = await compileAndRun({ code, language, input });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to compile code: " + (error as Error).message });
    }
  });

  app.post("/api/validate", async (req, res) => {
    try {
      const { code, language } = req.body;
      
      if (!code || !language) {
        return res.status(400).json({ error: "Code and language are required" });
      }
      
      const result = await validateSyntax(code, language);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to validate syntax: " + (error as Error).message });
    }
  });

  app.get("/api/languages", async (req, res) => {
    try {
      const languages = getSupportedLanguages();
      res.json(languages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get supported languages" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time collaboration
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Broadcast to all connected clients except sender
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    // Send initial connection confirmation
    ws.send(JSON.stringify({
      type: 'connection_established',
      message: 'Connected to CodeCollab'
    }));
  });

  return httpServer;
}
