export default async function handler(req, res) {
  const VPS_BASE = "http://5.230.171.52:2576";

  try {
    // forward GET / POST correctly
    const targetUrl =
      req.method === "GET"
        ? `${VPS_BASE}${req.url.replace("/ticket", "")}`
        : `${VPS_BASE}/ticket`;

    const response = await fetch(targetUrl, {
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
