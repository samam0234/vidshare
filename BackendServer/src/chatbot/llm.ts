import fs from "fs";
import os from "os";
import path from "path";
import { ChatXAI } from "@langchain/xai";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { HttpError } from "../middleware/errorHandler";
import type { Product, Turn } from "./types";

export function resolveApiKey() {
  const env = process.env.XAI_API_KEY?.trim();
  if (env) return env;
  const authFile = path.join(os.homedir(), ".grok", "auth.json");
  try {
    const json = JSON.parse(fs.readFileSync(authFile, "utf8")) as Record<
      string,
      { key?: string }
    >;
    for (const entry of Object.values(json)) {
      const key = entry?.key?.trim();
      if (key) return key;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function hasLlmKey() {
  return Boolean(resolveApiKey());
}

export function ensureApiKey() {
  const key = resolveApiKey();
  if (!key) {
    throw new HttpError(
      503,
      "챗봇 LLM 키가 없습니다. BackendServer/.env 에 XAI_API_KEY 를 넣으세요."
    );
  }
  if (!process.env.XAI_API_KEY?.trim()) process.env.XAI_API_KEY = key;
  return key;
}

const MODELS: Record<
  Product,
  { apiModel: string; temperature: number; maxTokens: number; maxHistory: number }
> = {
  locals: {
    apiModel: process.env.CHAT_MODEL_LOCALS?.trim() || "grok-4.3",
    temperature: 0.5,
    maxTokens: 700,
    maxHistory: 16,
  },
  vide: {
    apiModel: process.env.CHAT_MODEL_VIDE?.trim() || "grok-4.5",
    temperature: 0.55,
    maxTokens: 1400,
    maxHistory: 40,
  },
  shape: {
    apiModel: process.env.CHAT_MODEL_SHAPE?.trim() || "grok-4.6",
    temperature: 0.35,
    maxTokens: 1800,
    maxHistory: 28,
  },
};

export function productLlmSpec(product: Product) {
  return MODELS[product];
}

export function makeChat(product: Product) {
  const spec = MODELS[product];
  return new ChatXAI({
    apiKey: ensureApiKey(),
    model: spec.apiModel,
    temperature: spec.temperature,
    maxTokens: spec.maxTokens,
    maxRetries: 2,
  });
}

export function turnsToMessages(turns: Turn[]): BaseMessage[] {
  return turns
    .filter((m) => m.content.trim())
    .map((m) =>
      m.role === "assistant"
        ? new AIMessage(m.content.trim())
        : new HumanMessage(m.content.trim())
    );
}

export function withSystem(system: string, turns: Turn[]): BaseMessage[] {
  return [new SystemMessage(system), ...turnsToMessages(turns)];
}

export function contentText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: string }).text ?? "");
        }
        return "";
      })
      .join("")
      .trim();
  }
  return String(content ?? "").trim();
}
