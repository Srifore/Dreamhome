import { Injectable } from "@nestjs/common";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 300;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

@Injectable()
export class AiChatService {
  /**
   * Sends the conversation (system prompt + prior turns + the customer's latest message) to
   * OpenAI's Chat Completions endpoint and returns the reply text. Throws on any non-success
   * response or network failure — the caller (AutoReplyService) is expected to catch this and
   * fall back to the existing rule-based replies, since AI chat is optional and must never be
   * the reason the bot goes silent.
   */
  async reply(systemPrompt: string, history: ChatMessage[], apiKey: string): Promise<string> {
    const res = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...history],
        max_tokens: MAX_TOKENS,
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI chat completion failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error("OpenAI chat response had no content");
    }
    return content;
  }
}
