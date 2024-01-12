import { load_api } from "../api/api.ts";
import { load_handlers } from "../handlers/index.ts";

const mock_config = {
  self_id: 123456789,
  http_addr: "http://localhost:8080",
};

Deno.test("import test", async () => {
  Deno.mkdirSync("./data", { recursive: true });
  Deno.writeTextFileSync("./data/config.json", JSON.stringify(mock_config));
  try {
    await load_handlers();
    await load_api();
  } catch (e) {
    throw e;
  } finally {
    Deno.removeSync("./data", { recursive: true });
  }
});
