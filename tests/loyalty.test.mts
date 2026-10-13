import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stampsFor } from "../src/lib/loyalty-rules.ts";

describe("stampsFor", () => {
  it("starts empty", () => assert.deepEqual(stampsFor(0), { stamps: 0, ready: false, remaining: 10 }));
  it("counts completed orders", () => assert.deepEqual(stampsFor(3), { stamps: 3, ready: false, remaining: 7 }));
  it("unlocks the reward at ten stamps", () => assert.deepEqual(stampsFor(10), { stamps: 10, ready: true, remaining: 0 }));
  it("resets once the free eleventh order completes", () => assert.deepEqual(stampsFor(11), { stamps: 0, ready: false, remaining: 10 }));
  it("starts the next card after the reset", () => assert.deepEqual(stampsFor(14), { stamps: 3, ready: false, remaining: 7 }));
});
