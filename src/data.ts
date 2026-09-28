export type Incident = {
  id: string
  title: string
  service: string
  severity: "Critical" | "High" | "Medium"
  status: string
  duration: string
  affected: string
  owner: string
  updated: string
}

export const incidents: Incident[] = [
  { id: "INC-017", title: "Payment API database timeout", service: "payment-api", severity: "Critical", status: "Investigating", duration: "17m", affected: "12.4K", owner: "Maya C.", updated: "just now" },
  { id: "INC-016", title: "Elevated checkout latency", service: "checkout-edge", severity: "High", status: "Mitigating", duration: "42m", affected: "3.1K", owner: "Alex R.", updated: "3m ago" },
  { id: "INC-015", title: "Event consumer lag", service: "events-worker", severity: "Medium", status: "Monitoring", duration: "1h 08m", affected: "640", owner: "Jon B.", updated: "8m ago" },
]

export const memory = {
  id: "INC-001",
  title: "Payment API database timeout",
  similarity: 91,
  rootCause: "Connection-pool exhaustion caused by a connection leak",
  resolution: "Fixed connection leak and increased pool capacity.",
}

export const rootCauseData = [
  { name: "Connection leaks", value: 14 },
  { name: "Configuration", value: 9 },
  { name: "Deploy regressions", value: 7 },
  { name: "Capacity", value: 5 },
]

export const resolutionData = [
  { month: "Jan", withMemory: 52, withoutMemory: 88 },
  { month: "Feb", withMemory: 46, withoutMemory: 82 },
  { month: "Mar", withMemory: 39, withoutMemory: 77 },
  { month: "Apr", withMemory: 31, withoutMemory: 74 },
  { month: "May", withMemory: 26, withoutMemory: 69 },
  { month: "Jun", withMemory: 22, withoutMemory: 64 },
]
