import {
  assertEquals,
  assertMatch,
  assertThrows,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import {
  assert as util_assert,
  backup,
  heartbeat_start,
  is_decimal_number,
  spawn_get_output,
  spawn_set_input,
} from "../utils.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/sleep.ts";

// Test for assert function
Deno.test("assert should throw an error if the condition is false", () => {
  // Expect an error to be thrown
  assertThrows(() => util_assert(false));
});

Deno.test("assert should not throw an error if the condition is true", () => {
  // Expect no error to be thrown
  util_assert(true);
});

// Test for is_decimal_number function
Deno.test("is_decimal_number should return true for a decimal number string", () => {
  const result = is_decimal_number("12345");
  assertEquals(result, true);
});

Deno.test("is_decimal_number should return false for a non-decimal number string", () => {
  const result = is_decimal_number("abc");
  assertEquals(result, false);
});

// Test for backup function
Deno.test("backup should create a backup file with the provided data and name", () => {
  const data = "This is some backup data";
  const name = "backup.txt";
  const dirname = Deno.makeTempDirSync();
  Deno.chdir(dirname);
  backup(data, name);
  // Expect a backup file to be created with the provided data and name
  // You can add additional assertions to check if the backup file exists
  for (const entry of Deno.readDirSync(".")) {
    assertMatch(
      entry.name,
      /\d{14}\.[a-zA-Z0-9]{8}-([a-zA-Z0-9]{4}-){3}[a-zA-Z0-9]{12}\.backup\.txt$/,
    );
    assertEquals(Deno.readTextFileSync(entry.name), data);
  }

  Deno.chdir("..");
  Deno.removeSync(dirname, { recursive: true });
});

// Test for spawn_set_input function
Deno.test("spawn_set_input should spawn a process and set the input", async () => {
  const argv = ["bash", "-c", "read input; echo $input > output.txt"];
  const input = "Hello, World!";
  await spawn_set_input(argv, input);
  // Expect the process to be spawned and the input to be set
  // You can add additional assertions to check the output of the process
  assertEquals(Deno.readTextFileSync("output.txt"), input + "\n");
  Deno.removeSync("output.txt");
});

// Test for spawn_get_output function
Deno.test("spawn_get_output should spawn a process and get the output", async () => {
  const argv = ["echo", "Hello, World!"];
  const output = await spawn_get_output(argv);
  // Expect the process to be spawned and the output to be retrieved
  // You can add additional assertions to check the output value
  assertEquals(output, "Hello, World!\n");
});

// Test for heartbeat_start function
Deno.test("heartbeat_start should return a function that can be used to stop the heartbeat", async () => {
  let dead = false;
  const die = () => dead = true;
  let beat = heartbeat_start(50, die);
  // The die function should not be called immediately
  beat();
  assertEquals(dead, false);

  // The die function should be called after 100ms
  beat = heartbeat_start(50, die);
  await sleep(0.15);
  assertEquals(dead, true);
});
