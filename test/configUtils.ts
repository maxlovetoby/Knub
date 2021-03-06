import { expect } from "chai";
import { mergeConfig, getMatchingPluginOptions, hasPermission } from "../src/configUtils";
import { IPluginOptions } from "../src/configInterfaces";

describe("mergeConfig", () => {
  const base = {
    foo: 1,
    bar: {
      baz: 2,
      qux: 3
    },
    simpleArr: [1, 2],
    addArr: [1, 2],
    subArr: [1, 2]
  };

  const override = {
    foo: 2,
    bar: {
      baz: 5,
      quux: 10
    },
    simpleArr: ["a", "b"],
    "+addArr": [3],
    "-subArr": [2]
  };

  const result: any = mergeConfig({}, base, override);

  it("should merge scalar values", () => {
    expect(result.foo).to.equal(2);
  });

  it("should merge nested scalar values", () => {
    expect(result.bar.baz).to.equal(5);
  });

  it("should merge objects instead of overwriting them", () => {
    expect(result.bar.qux).to.equal(3);
    expect(result.bar.quux).to.equal(10);
  });

  it("should overwrite arrays by default", () => {
    expect(result.simpleArr).to.eql(["a", "b"]);
  });

  it("should support adding values to arrays", () => {
    expect(result.addArr).to.eql([1, 2, 3]);
  });

  it("should support removing values from arrays", () => {
    expect(result.subArr).to.eql([1]);
  });
});

describe("getMatchingPluginOptions", () => {
  const pluginOptions: IPluginOptions = {
    config: {
      value: 5
    },
    permissions: {
      hasAccess: false
    },
    overrides: [
      {
        level: ">=20",
        permissions: {
          hasAccess: true
        }
      },
      {
        level: [">=30", "<40"],
        permissions: {
          hasAccess: false
        }
      },
      {
        level: [],
        config: {
          value: 50
        }
      },
      {
        channel: ["1100", "1200"],
        config: {
          value: 10
        }
      },
      {
        user: "2100",
        config: {
          value: 15
        }
      },
      {
        role: ["3100", "!3200"],
        config: {
          value: 20
        }
      },
      {
        channel: "1100",
        role: "3100",
        // Implicit type: 'all'
        config: {
          value: 25
        }
      },
      {
        channel: "1300",
        role: "3300",
        type: "any",
        config: {
          value: 30
        }
      },
      {
        channel: "1400",
        role: "3100",
        user: "!2100",
        type: "all",
        config: {
          value: 100
        }
      }
    ]
  };

  it("should use defaults with empty match params", () => {
    const matchedOpts = getMatchingPluginOptions(pluginOptions, {});
    expect(matchedOpts.config.value).to.equal(5);
    expect(matchedOpts.permissions.hasAccess).to.equal(false);
  });

  it("should match levels", () => {
    const matchedOpts = getMatchingPluginOptions(pluginOptions, { level: 60 });
    expect(matchedOpts.permissions.hasAccess).to.equal(true);
  });

  it("should require all level conditions to apply", () => {
    const matchedOpts = getMatchingPluginOptions(pluginOptions, { level: 35 });
    expect(matchedOpts.permissions.hasAccess).to.equal(false);
  });

  it("should match channels and accept any specified channel", () => {
    const matchedOpts1 = getMatchingPluginOptions(pluginOptions, { channelId: "1100" });
    const matchedOpts2 = getMatchingPluginOptions(pluginOptions, { channelId: "1200" });
    expect(matchedOpts1.config.value).to.equal(10);
    expect(matchedOpts2.config.value).to.equal(10);
  });

  it("should match users", () => {
    const matchedOpts = getMatchingPluginOptions(pluginOptions, { userId: "2100" });
    expect(matchedOpts.config.value).to.equal(15);
  });

  it("should match roles", () => {
    const matchedOpts1 = getMatchingPluginOptions(pluginOptions, { memberRoles: ["3100"] });
    const matchedOpts2 = getMatchingPluginOptions(pluginOptions, { memberRoles: ["3100", "3200"] });
    expect(matchedOpts1.config.value).to.equal(20); // has 3100, and no 3200 -> match
    expect(matchedOpts2.config.value).to.equal(5); // has 3100, and excluded 3200 -> no match
  });
});

describe("hasPermission", () => {
  const pluginOptions: IPluginOptions = {
    permissions: {
      hasAccess: false,
      nested: {
        foo: false
      }
    },
    overrides: [
      {
        level: ">20",
        permissions: {
          hasAccess: true,
          nested: {
            foo: true
          }
        }
      }
    ]
  };

  it("should use defaults with empty/non-matching params", () => {
    const test1 = hasPermission("hasAccess", pluginOptions, {});
    expect(test1).to.equal(false);
  });

  it("should work for single-level permissions", () => {
    const test2 = hasPermission("hasAccess", pluginOptions, { level: 30 });
    expect(test2).to.equal(true);
  });

  it("should use defaults with empty/non-matching params (nested)", () => {
    const test3 = hasPermission("nested.foo", pluginOptions, {});
    expect(test3).to.equal(false);
  });

  it("should work for nested permissions", () => {
    const test4 = hasPermission("nested.foo", pluginOptions, { level: 30 });
    expect(test4).to.equal(true);
  });
});
