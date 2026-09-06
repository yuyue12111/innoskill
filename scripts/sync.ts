/** 手动跑一次同步,不起服务:npm run sync */
import { runSync } from "../lib/server/sync/run";
const r = await runSync("cli");
console.log(JSON.stringify(r, null, 2));
process.exit(r.ok ? 0 : 1);
