import { assertEquals } from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { sleep } from "https://deno.land/x/sleep@v1.2.1/sleep.ts";
import { rate_limit, task_queue } from "/wrappers.ts";

Deno.test("task_queue should execute the handler function with the provided argument", async () => {
  let executed = false;
  const handler = (arg: number) => {
    executed = true;
    assertEquals(arg, 42);
  };

  const queue = task_queue(handler);
  await queue(42);

  assertEquals(executed, true);
});

Deno.test("task_queue should execute the handler functions in the order they are called", async () => {
  const executionOrder: number[] = [];
  const handler = async (arg: number) => {
    await sleep(Math.random() / 10);
    executionOrder.push(arg);
  };

  const queue = task_queue(handler);
  await Promise.all([
    queue(1),
    queue(2),
    queue(3),
    queue(4),
    queue(5),
  ]);

  assertEquals(executionOrder, [1, 2, 3, 4, 5]);
});

Deno.test("task_queue should handle errors thrown by the handler function", async () => {
  const handler = (arg: number) => {
    if (arg === 0) throw new Error("Invalid argument");
  };

  const queue = task_queue(handler);

  await Promise.all([
    queue(0),
    queue(1),
    queue(2),
  ]);
});

Deno.test("rate_limit should limit the execution of the handler function based on the provided rate limit", async () => {
  let limited = false;
  let wait = 0;

  const list: number[] = [];
  const handler = (arg: number) => {
    list.push(arg);
  };

  const rateLimitArgs = {
    get_limit: () => 3,
    get_period: () => 60 * 1000,
    get_id: (_: number) => 1,
    validate: (input: number) => input > 0,
    exceed_action: (_: number, waitSeconds: number) => {
      limited = true;
      wait = waitSeconds;
    },
  };

  const rateLimitedHandler = rate_limit(rateLimitArgs)(handler);

  // Test case 1: Execute the handler function 3 times within the rate limit
  await Promise.all([
    rateLimitedHandler(1),
    rateLimitedHandler(2),
    rateLimitedHandler(3),
  ]);

  assertEquals(limited, false);

  // Test case 2: Execute the handler function more than the rate limit
  await rateLimitedHandler(4), assertEquals(limited, true);
  assertEquals(wait, 60);

  assertEquals(list.length, 3);
  console.log(list);
});
