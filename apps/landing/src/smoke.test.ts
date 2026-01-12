import { expect, test } from "bun:test";

import { getRouter } from "./router";
import { routeTree } from "./routeTree.gen";

test("landing router initializes", () => {
  expect(routeTree).toBeDefined();
  const router = getRouter();
  expect(router).toBeDefined();
  expect(router.routeTree).toBe(routeTree);
});
