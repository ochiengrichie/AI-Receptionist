function parseServices(value) {
  if (!value) {
    return [
      "appointment scheduling",
      "visitor reception",
      "call message taking",
      "general enquiries",
    ];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getBusinessContext() {
  return {
    businessName: process.env.BUSINESS_NAME || "Horizon Business Centre",
    receptionistName: process.env.RECEPTIONIST_NAME || "Alex",
    businessHours:
      process.env.BUSINESS_HOURS || "Monday to Friday, 8 AM to 5 PM",
    servicesOffered: parseServices(process.env.SERVICES_OFFERED),
    toneRules:
      process.env.TONE_RULES ||
      "Warm, concise, professional, and natural for phone conversations.",
    companyRules:
      process.env.COMPANY_RULES ||
      "Do not promise unavailable times, do not invent pricing or policies, and collect callback details when needed.",
  };
}
