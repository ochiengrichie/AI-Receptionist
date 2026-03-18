const FORBIDDEN_PATTERNS = [
  /\bas an ai\b/i,
  /\blanguage model\b/i,
  /\bi cannot access\b/i,
  /\bi don't have access\b/i,
  /\bguarantee\b/i,
];

function normalizeReply(reply) {
  return reply.replace(/\s+/g, " ").trim();
}

function needsAppointmentDetails(userMessage) {
  return /\b(appointment|book|booking|schedule|tomorrow|meeting)\b/i.test(
    userMessage
  );
}

function asksForTime(reply) {
  return /\b(time|what time|which time|preferred time)\b/i.test(reply);
}

function asksForCallbackDetails(reply) {
  return /\b(phone number|contact number|callback|best number)\b/i.test(reply);
}

export function validateReceptionistReply({ userMessage, reply, context }) {
  const issues = [];
  let finalReply = normalizeReply(reply);

  if (!finalReply) {
    issues.push("empty_reply");
    finalReply = `Hello, this is ${context.receptionistName} at ${context.businessName}. Could you please repeat that for me?`;
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(finalReply)) {
      issues.push("forbidden_claim");
      finalReply = `I can help with that. Could you share a few more details so I can assist properly?`;
      break;
    }
  }

  if (finalReply.length > 240) {
    issues.push("too_long");
    finalReply = finalReply.slice(0, 237).trimEnd() + "...";
  }

  if (needsAppointmentDetails(userMessage) && !asksForTime(finalReply)) {
    issues.push("missing_time_question");
    finalReply = `${finalReply} What time works best for you?`;
  }

  if (/\b(call me|call back|leave a message|reach me)\b/i.test(userMessage) && !asksForCallbackDetails(finalReply)) {
    issues.push("missing_callback_details");
    finalReply = `${finalReply} What is the best phone number to reach you on?`;
  }

  return {
    reply: normalizeReply(finalReply),
    issues,
  };
}
