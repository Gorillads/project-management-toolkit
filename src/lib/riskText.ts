/** Words that describe a consequence on the project triangle rather than
 *  the risk itself ("Budget overrun", "Tidsplanen skrider"). Used only to
 *  nudge: a risk named like this, with no cause, probably needs one. */
const CONSEQUENCE = /\b(overrun|over budget|exceed|slips?|delay(s|ed)?|behind schedule|cost increase|deadline|overskrid\w*|skrider|forsink\w*|budget\w*|tidsplan\w*|deadline\w*|mangel på ressourcer|lack of (staff|resources)|quality (drops|suffers)|kvaliteten falder)\b/i;
export const looksLikeConsequence = (title: string, cause?: string) => !(cause ?? "").trim() && CONSEQUENCE.test(title);
