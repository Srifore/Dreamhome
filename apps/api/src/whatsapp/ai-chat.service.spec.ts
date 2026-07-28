import { AiChatService } from "./ai-chat.service";

describe("AiChatService", () => {
  let service: AiChatService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new AiChatService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the assistant's reply text on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "  Here's what we recommend.  " } }] }),
    }) as any;

    const result = await service.reply("system prompt", [{ role: "user", content: "hi" }], "sk-key");

    expect(result).toBe("Here's what we recommend.");
  });

  it("throws with the status code when OpenAI returns a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Invalid API key",
    }) as any;

    await expect(service.reply("prompt", [], "bad-key")).rejects.toThrow(/401/);
  });

  it("throws when the response has no message content", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    }) as any;

    await expect(service.reply("prompt", [], "sk-key")).rejects.toThrow("no content");
  });

  it("sends the system prompt as the first message, followed by history in order", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "ok" } }] }),
    });
    global.fetch = fetchMock as any;

    await service.reply("SYS", [{ role: "user", content: "turn 1" }], "sk-key");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "SYS" });
    expect(body.messages[1]).toEqual({ role: "user", content: "turn 1" });
  });
});
