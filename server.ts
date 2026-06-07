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
      const { model, prompt, systemInstruction, temperature, customApiKey, customApiUrl } = req.body;
      
      // Prioritize client-provided key, then default server env key
      const apiKey = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: "未在服务器检测到全局 API 密钥，且您的浏览器中也尚未配置个人 API KEY。请点击界面右上角或 AI 侧边栏的 [⚙️ API 设置] 按钮输入您自己的 Gemini 密钥（可获得免费密钥），即可立刻启动万能 AI 续写和对话功能。" 
        });
      }

      // Safeguard fallback models
      const actualModel = model || "gemini-2.5-flash";

      // 1. Try with classical official SDK client first
      try {
        const config: any = { apiKey };
        if (customApiUrl && customApiUrl.trim()) {
          config.baseURL = customApiUrl.trim().replace(/\/+$/, "");
        }
        
        const ai = new GoogleGenAI(config);
        const response = await ai.models.generateContent({
          model: actualModel,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: temperature || 0.7,
          },
        });

        if (response && response.text) {
          return res.json({ text: response.text });
        }
        throw new Error("SDK response was empty");
      } catch (sdkError: any) {
        console.warn("GoogleGenAI SDK call triggered an exception, moving to Rest API fallback:", sdkError.message);
        
        // 2. Strong Universal REST fetch Fallback for third-party relays/proxies (who may not support JS SDK protocol metadata)
        const baseUrl = (customApiUrl && customApiUrl.trim()) 
          ? customApiUrl.trim().replace(/\/+$/, "") 
          : "https://generativelanguage.googleapis.com";
          
        let restEndpoint = "";
        if (baseUrl.includes("/v1beta") || baseUrl.includes("/v1")) {
          restEndpoint = `${baseUrl}/models/${actualModel}:generateContent?key=${apiKey}`;
        } else {
          restEndpoint = `${baseUrl}/v1beta/models/${actualModel}:generateContent?key=${apiKey}`;
        }

        console.log(`Sending Rest API fallback to: ${restEndpoint.replace(/key=([^&]+)/, 'key=HIDDEN')}`);

        const rawResponse = await fetch(restEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
            generationConfig: {
              temperature: temperature || 0.7,
            }
          })
        });

        if (!rawResponse.ok) {
          const errDetail = await rawResponse.text().catch(() => "");
          throw new Error(`REST API Failed with HTTP status ${rawResponse.status}. Details: ${errDetail || "Unspecified"}`);
        }

        const jsonResult: any = await rawResponse.json();
        const generatedText = jsonResult.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedText) {
          return res.json({ text: generatedText });
        } else {
          throw new Error("No textual content extracted from alternate REST path candidates. JSON payload: " + JSON.stringify(jsonResult));
        }
      }
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
