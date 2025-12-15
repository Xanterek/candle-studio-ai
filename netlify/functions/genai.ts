export default async (req: Request) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return new Response("Missing GOOGLE_API_KEY", { status: 500 });

  const body = await req.json();

  const model = body.model || "gemini-2.5-flash";
  delete body.model;

  // Jeśli to model obrazkowy – prosimy o IMAGE w odpowiedzi
  if (String(model).includes("flash-image")) {
    body.config = {
      ...(body.config || {}),
      responseModalities: ["IMAGE"], // ważne dla obrazów
    };
  }

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": "application/json" },
  });
};


