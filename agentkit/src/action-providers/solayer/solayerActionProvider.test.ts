/**
 * SolayerActionProvider Tests
 */

import { SolayerActionProvider } from "./solayerActionProvider";
import { Network } from "../../network";

describe("SolayerActionProvider", () => {
  // default setup: instantiate the provider
  const provider = new SolayerActionProvider();

  it("should support the protocol family", () => {
    expect(
      provider.supportsNetwork({
        protocolFamily: "svm",
      } as Network),
    ).toBe(true);
  });

  it("should not support other protocol families", () => {
    expect(
      provider.supportsNetwork({
        protocolFamily: "other-protocol-family",
      } as Network),
    ).toBe(false);
  });

  it("should handle invalid network objects", () => {
    expect(provider.supportsNetwork({ protocolFamily: "invalid-protocol" } as Network)).toBe(false);
    expect(provider.supportsNetwork({} as Network)).toBe(false);
  });
});
