import { db } from "./src/db/client";
import { getItemPermissionLevel } from "./src/lib/permissions";
import { items } from "./src/db/schema";
import { eq } from "drizzle-orm";

async function test() {
  const existing = await db.select().from(items).limit(1);
  if (existing.length === 0) {
    console.log("No items found");
    process.exit(0);
  }
  const item = existing[0];
  console.log("Item:", item);
  
  try {
    const perm = await getItemPermissionLevel(db, item.id, item.ownerId || 1, "user", item.ownerId);
    console.log("Permission for owner:", perm);
    
    const permAdmin = await getItemPermissionLevel(db, item.id, 999, "admin", item.ownerId);
    console.log("Permission for admin:", permAdmin);
    
    const permNobody = await getItemPermissionLevel(db, item.id, 999, "user", item.ownerId);
    console.log("Permission for nobody:", permNobody);
  } catch (e) {
    console.error("Error evaluating permissions:", e);
  }
  process.exit(0);
}

test();
