export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };

export function zodFieldErrors(
  flatten: { fieldErrors: Record<string, string[] | undefined> },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flatten.fieldErrors)) {
    if (messages && messages.length > 0) out[key] = messages[0]!;
  }
  return out;
}
