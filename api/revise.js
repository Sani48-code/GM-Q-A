const { callClaude, parseJsonLoose } = require("./_lib/claude");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { draft, businessContext, contentType, mechanical, judgment } = req.body || {};
  if (!draft || typeof draft !== "string") {
    res.status(400).json({ error: "Missing draft" });
    return;
  }

  const mech = mechanical || {};
  const jdg = judgment || {};

  const flagLines = [];
  if (mech.banned && mech.banned.length) flagLines.push(`Banned words found: ${mech.banned.map((b) => b.word).join(", ")}`);
  if (mech.emDashes && mech.emDashes.length) flagLines.push(`${mech.emDashes.length} em dash(es) to remove`);
  if (mech.whOpeners && mech.whOpeners.length) flagLines.push(`WH-word sentence openers to rewrite: ${mech.whOpeners.join(" | ")}`);
  if (mech.longParas && mech.longParas.length) flagLines.push(`${mech.longParas.length} paragraph(s) over 3 sentences to split`);
  if (mech.spelling && mech.spelling.length) flagLines.push(`American spellings to fix: ${mech.spelling.map((s) => `${s.found}->${s.suggest}`).join(", ")}`);
  for (const [key, val] of Object.entries(jdg)) {
    if (key === "top_fixes") continue;
    if (val && val.status === "flag") flagLines.push(`${key}: ${val.note}`);
  }

  const prompt = `You are editing a blog draft for Grow Minion based on a QA report. Apply fixes ONLY for the flagged issues listed below. Do not change anything that already passed - this is a correction pass, not a full rewrite.

While fixing, follow these universal rules: conversational tone, roughly 7th grade reading level, Canadian English spelling (colour, favour, centre), no em dashes, no paragraph over 3 sentences, no sentence or heading starting with What/When/Where/Why/Who/How, avoid generic AI-sounding filler phrases (e.g. "in today's world", "unlock", "delve", "leverage", "when it comes to").

Never invent facts, statistics, client details, or sources. If a flagged issue needs a real source or number you don't have, insert a placeholder like [NEEDS SOURCE: confirm this stat] instead of making one up.

Return ONLY valid minified JSON, no markdown fences, matching exactly: {"revised_content":"...","changelog":["...","..."]}

Business context: ${businessContext || "not specified"}
Content type: ${contentType || "not specified"}

Flagged issues:
${flagLines.map((f) => "- " + f).join("\n")}

Original draft:
${draft}`;

  try {
    const raw = await callClaude(prompt, 4000);
    const result = parseJsonLoose(raw);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
};
