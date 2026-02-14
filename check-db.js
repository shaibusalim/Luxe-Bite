
import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

async function check() {
  try {
    const orders = await sql`SELECT count(*) FROM public.orders`;
    console.log("Orders count:", orders[0].count);
    
    const items = await sql`SELECT count(*) FROM public.order_items`;
    console.log("Order items count:", items[0].count);
    
    const sample = await sql`SELECT * FROM public.orders LIMIT 1`;
    console.log("Sample order:", JSON.stringify(sample[0], null, 2));
  } catch (e) {
    console.error("Check failed:", e);
  }
}

check();
