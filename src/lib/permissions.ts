import type { Role } from "@/lib/api";

/** Which route group each role lands in. The server decides access; this only picks the layout. */
export const roleHome: Record<Role, "/(worker)" | "/(supervisor)" | "/(manager)"> = {
  WORKER: "/(worker)",
  SUPERVISOR: "/(supervisor)",
  MANAGER: "/(manager)",
};

export const roleLabel: Record<Role, string> = {
  WORKER: "Worker",
  SUPERVISOR: "Supervisor",
  MANAGER: "Safety manager",
};
