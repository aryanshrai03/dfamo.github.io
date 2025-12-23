export default async function handler(req, res) {
  const VPS = "http://5.230.171.52:2576";

  try {
    const target =
      req.method === "GET"
        ? `${VPS}${req.url.replace("/api", "")}`
        : `${VPS}/ticket`;

    const response = await fetch(target, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined
    });

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
