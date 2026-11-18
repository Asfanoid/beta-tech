import { describe, expect, it } from "vitest";
import { parseUpdatePartInput } from "./validation";

describe("parseUpdatePartInput", () => {
  it("accepts supported unit and status updates", () => {
    expect(
      parseUpdatePartInput({ unit: "pcs", status: "active" }),
    ).toEqual({ unit: "pcs", status: "active" });
  });

  it("rejects statuses not present in the API schema", () => {
    expect(parseUpdatePartInput({ status: "unknown" })).toBeNull();
  });

  it("rejects empty updates, unknown fields, and invalid field types", () => {
    expect(parseUpdatePartInput({})).toBeNull();
    expect(parseUpdatePartInput({ description: "not supported" })).toBeNull();
    expect(parseUpdatePartInput({ unit: 5 })).toBeNull();
  });
});
