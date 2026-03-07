import express from "express";
import { createServer as createViteServer } from "vite";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const DATA_FILE = path.join(process.cwd(), "story_data.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Persistence Routes
  app.get("/api/story", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      // Return default state if file doesn't exist
      res.json({
        title: "未命名故事",
        content: "",
        characters: [],
        relationships: [],
        lore: [],
        resources: { money: 100, supplies: 100 }
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

  // AI Proxy Route (Optional, but keeping for compatibility if needed)
  app.post("/api/ai/generate", async (req, res) => {
    const { model, messages, temperature } = req.body;
    // ... existing logic ...

    try {
      let apiKey = "";
      let baseURL = "";

      if (model.startsWith("qwen")) {
        apiKey = process.env.QWEN_API_KEY || "";
        baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
      } else if (model.startsWith("deepseek")) {
        apiKey = process.env.DEEPSEEK_API_KEY || "";
        baseURL = "https://api.deepseek.com";
      }

      if (!apiKey) {
        return res.status(400).json({ error: `未配置模型 ${model} 的 API 密钥。` });
      }

      const openai = new OpenAI({
        apiKey,
        baseURL,
      });

      const response = await openai.chat.completions.create({
        model,
        messages,
        temperature: temperature || 0.7,
      });

      res.json({ text: response.choices[0].message.content });
    } catch (error: any) {
      console.error("AI 生成错误:", error);
      res.status(500).json({ error: error.message || "内容生成失败" });
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
