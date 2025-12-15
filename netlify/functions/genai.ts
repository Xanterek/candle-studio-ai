export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing GOOGLE_API_KEY in Netlify env vars" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json();

  const model = body.model || "gemini-1.5-flash";
  delete body.model;

  // 👇 TO JEST FIX NA OBRAZKI:
  // jeśli model jest "flash-image", to wymuszamy odpowiedź IMAGE
  if (String(model).includes("flash-image")) {
    body.config = {
      ...(body.config || {}),
      responseModalities: ["IMAGE"],
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


