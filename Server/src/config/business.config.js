import { env } from "./env.config.js";

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

const DEFAULT_CONTEXT = {
  businessName: "Horizon Business Centre",
  receptionistName: "Alex",
  businessHours: "Monday to Friday, 8 AM to 5 PM",
  servicesOffered: [
    "appointment scheduling",
    "visitor reception",
    "call message taking",
    "general enquiries",
  ],
  toneRules:
    "Warm, concise, professional, and natural for phone conversations.",
  companyRules:
    "Do not promise unavailable times, do not invent pricing or policies, and collect callback details when needed.",
};

export function getBusinessContext() {
  return {
    businessName: env.BUSINESS_NAME || DEFAULT_CONTEXT.businessName,
    receptionistName:
      env.RECEPTIONIST_NAME || DEFAULT_CONTEXT.receptionistName,
    businessHours: env.BUSINESS_HOURS || DEFAULT_CONTEXT.businessHours,
    servicesOffered: parseServices(env.SERVICES_OFFERED),
    toneRules: env.TONE_RULES || DEFAULT_CONTEXT.toneRules,
    companyRules: env.COMPANY_RULES || DEFAULT_CONTEXT.companyRules,
  };
}