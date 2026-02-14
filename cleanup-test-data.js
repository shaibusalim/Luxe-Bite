
import { neon } from "@neondatabase/serverless";
import { config } from "./server/config.js";

const sql = neon(config.DATABASE_URL);

async function cleanup() {
  try {
    console.log("Identifying test orders...");
    
    // Orders with 'Test' in customer name or 'admin-service' user_id
    const testOrders = await sql`
      SELECT id, customer_name, user_id FROM public.orders 
      WHERE customer_name ILIKE '%test%' 
      OR user_id = 'admin-service'
      OR customer_phone = '+233123456789'
    `;
    
    console.log(`Found ${testOrders.length} test orders:`);
    console.log(testOrders);

    if (testOrders.length > 0) {
      const ids = testOrders.map(o => o.id);
      
      console.log("Deleting order items...");
      for (const id of ids) {
        await sql`DELETE FROM public.order_items WHERE order_id = ${id}`;
      }
      
      console.log("Deleting orders...");
      for (const id of ids) {
        await sql`DELETE FROM public.orders WHERE id = ${id}`;
      }
      
      console.log("Cleanup complete!");
    } else {
      console.log("No test orders found.");
    }

    // Also check for test users in 'users' table if any
    const testUsers = await sql`
      SELECT id, email FROM public.users 
      WHERE email ILIKE '%test%'
    `;
    console.log(`Found ${testUsers.length} test users:`);
    console.log(testUsers);
    
    if (testUsers.length > 0) {
      const userIds = testUsers.map(u => u.id);
      console.log("Deleting test users (cascade will handle roles)...");
      await sql`DELETE FROM public.users WHERE id IN ${sql(userIds)}`;
    }

  } catch (e) {
    console.error("Cleanup error:", e);
  }
}

cleanup();
