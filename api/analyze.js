const { callClaude, parseJsonLoose } = require("./_lib/claude");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { draft, businessContext, contentType } = req.body || {};
  if (!draft || typeof draft !== "string") {
    res.status(400).json({ error: "Missing draft" });
    return;
  }

  const prompt = `You are a content quality judge for a marketing agency called Grow Minion. Analyze the draft below against these criteria and business context. Return ONLY valid minified JSON, no markdown fences, no preamble, matching exactly this schema:
{"tone":{"status":"pass|flag","note":"...","deduct":0},"structure":{"status":"pass|flag","note":"...","deduct":0},"fluff":{"status":"pass|flag","note":"...","deduct":0},"cta":{"status":"pass|flag","note":"...","deduct":0},"transitions":{"status":"pass|flag","note":"...","deduct":0},"source":{"status":"pass|flag","note":"...","deduct":0},"depth":{"status":"pass|flag","note":"...","deduct":0},"originality":{"status":"pass|flag","note":"...","deduct":0},"top_fixes":["...","...","..."]}

Deduction caps: tone max 8, structure max 8, fluff max 4, cta max 4, transitions max 3, source max 3, depth max 3, originality max 2. Use 0 if it passes.

Rules:
- tone: flag if generic, AI-sounding, encyclopedic, or the voice doesn't fit the business.
- structure: Blog post = educate first, light CTA at the end. Service page = conversion-first, problem-led opening, consultation-driving CTA throughout. Flag hard if the content type doesn't match this expectation.
- fluff: flag padding or throat-clearing sentences that add no information.
- cta: flag if there's no clear, specific next step, or it's vague.
- transitions: flag if the same transition phrase repeats 3+ times or feels robotic.
- source: flag any specific stat, number, or claim stated with no attribution. Weight more heavily for legal, medical, or financial businesses.
- depth: flag if the post reads thin or repetitive, or could apply to any business/city with a find-and-replace.
- originality: flag if it reads like generic SEO content-mill phrasing. This is a heuristic, not a plagiarism scan.

Business context: ${businessContext || "not specified"}
Content type: ${contentType || "not specified"}

Draft:
${draft}`;

  try {
    const raw = await callClaude(prompt, 1200);
    const judgment = parseJsonLoose(raw);
    res.status(200).json(judgment);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
};
