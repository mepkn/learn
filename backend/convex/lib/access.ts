import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isAllowedEmail } from "./allowlist";

/** The signed-in, still-allowlisted user, or null. Reading needs no sign-in. */
export async function currentEditorId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  // Re-checked on every call, so removing an email cuts off existing sessions.
  const user = await ctx.db.get(userId);
  return isAllowedEmail(user?.email) ? userId : null;
}

export async function requireEditor(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await currentEditorId(ctx);
  if (userId === null) throw new ConvexError("Not signed in.");
  return userId;
}
