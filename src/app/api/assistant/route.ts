import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const apiKey = process.env.QWEN_API_KEY;
    const baseUrl = process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
    const model = process.env.QWEN_MODEL || "qwen-plus";

    if (!apiKey) {
      // Return a simulated high-quality response if QWEN_API_KEY is not defined yet,
      // so the app remains fully functional for demonstration.
      console.warn("[Qwen AI] QWEN_API_KEY is not defined. Falling back to mock generator.");
      const mockHtml = `
        <h2>Project Overview</h2>
        <p>This proposal outlines our plan to engineer a premium, modern software solution matching your specific workflows. We focus on visual excellence, performance, and responsive layouts.</p>
        <h2>Scope of Work</h2>
        <ul>
          <li>Full database integration and schema provisioning.</li>
          <li>Dual-pane interactive editor and workspace.</li>
          <li>Pluggable SMS and transactional notifications.</li>
        </ul>
        <h2>Timeline</h2>
        <p>Total project delivery estimated in 6-8 weeks across successive milestones.</p>
      `;
      return NextResponse.json({ result: mockHtml });
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional business copywriter and engineer at Appibrium Technology Co. " +
              "Generate clean, semantic HTML formatting ONLY (such as h2, p, ul, li). " +
              "Do NOT wrap the output in markdown block code tags (like ```html or ```). " +
              "Do NOT include any introduction, conversational greeting, or summary text. " +
              "Respond ONLY with the raw HTML contents.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || `DashScope API error: ${response.status}` },
        { status: response.status }
      );
    }

    let resultHtml = data.choices?.[0]?.message?.content || "";

    // Clean up any stray markdown formatting if the model ignored instructions
    resultHtml = resultHtml.replace(/```html/g, "").replace(/```/g, "").trim();

    return NextResponse.json({ result: resultHtml });
  } catch (error: any) {
    console.error("Assistant API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to contact Qwen AI." }, { status: 500 });
  }
}
