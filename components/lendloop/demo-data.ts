const dateOffset = (days: number) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const sampleStart = dateOffset(5);
const sampleEnd = dateOffset(7);

export const SAMPLE_TOOLS = [
  {
    key: "sample-cordless-drill",
    name: "Cordless drill",
    category: "Power tools",
    condition: "Good",
    description: "A reliable 18V drill with a charger and a small set of bits.",
    ownerName: "Morgan",
    ownerTrusted: true,
  },
  {
    key: "sample-step-ladder",
    name: "Step ladder",
    category: "Hand tools",
    condition: "Like new",
    description: "Six-foot folding ladder for paint jobs and home projects.",
    ownerName: "Jamie",
    ownerTrusted: false,
  },
  {
    key: "sample-garden-hose",
    name: "Garden hose",
    category: "Garden",
    condition: "Good",
    description: "A 50-foot hose with an adjustable spray nozzle.",
    ownerName: "Riley",
    ownerTrusted: false,
  },
];

export const SAMPLE_LISTINGS = [
  {
    key: "sample-camping-stove",
    name: "Two-burner camping stove",
    category: "Camping",
    condition: "Good",
    description: "Clean, tested stove with a carry case. Bring your own fuel canister.",
  },
];

export const SAMPLE_REQUESTS = [
  {
    key: "sample-request-drill",
    toolName: "Cordless drill",
    startDate: sampleStart,
    endDate: sampleEnd,
    status: "pending" as const,
    ownerName: "Morgan",
    borrowerName: "You",
    overdue: false,
  },
  {
    key: "sample-request-hose",
    toolName: "Garden hose",
    startDate: dateOffset(10),
    endDate: dateOffset(11),
    status: "approved" as const,
    ownerName: "Riley",
    borrowerName: "You",
    overdue: false,
  },
];

export const SAMPLE_INCOMING = [
  {
    key: "sample-incoming-ladder",
    toolName: "Two-burner camping stove",
    startDate: sampleStart,
    endDate: sampleEnd,
    status: "pending" as const,
    ownerName: "You",
    borrowerName: "Casey",
    overdue: false,
  },
  {
    key: "sample-incoming-drill",
    toolName: "Cordless drill",
    startDate: dateOffset(12),
    endDate: dateOffset(13),
    status: "approved" as const,
    ownerName: "You",
    borrowerName: "Avery",
    overdue: false,
  },
];
