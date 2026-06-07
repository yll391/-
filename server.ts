import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const DATA_FILE = path.join(process.cwd(), "story_data.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // AI Proxy Route setup
  app.post("/api/ai/generate", async (req, res) => {
    try {
      const { model, prompt, systemInstruction, temperature } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "服务器未配置 GEMINI_API_KEY" });
      }

      const ai = new GoogleGenAI({ apiKey });
      const actualModel = model?.includes("gemini") ? model : "gemini-2.5-flash";

      const response = await ai.models.generateContent({
        model: actualModel,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: temperature || 0.7,
        },
      });

      if (!response || !response.text) {
        throw new Error("AI returned empty response");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("AI Proxy Error:", error);
      res.status(500).json({ error: error.message || "内容生成失败" });
    }
  });

  // Persistence Routes
  app.get("/api/story", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      // Return default state if file doesn't exist
      const defaultBook = {
        id: "book-1",
        title: "未命名故事",
        chapters: [{ id: "ch-1", title: "第一章", content: "", summary: "", order: 1 }],
        characters: [],
        relationships: [],
        lore: [],
        resources: { money: 100, supplies: 100 },
        settings: {
          logicRules: ["角色不能复活", "魔法消耗体力"],
          targetFingerprint: { bloody: 20, poetic: 40, technical: 10, emotional: 30 }
        }
      };
      res.json({
        activeBookId: "book-1",
        books: [defaultBook]
      });
    }
  });

  app.post("/api/story", async (req, res) => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "保存失败" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
