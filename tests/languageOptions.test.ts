import { describe, expect, it } from "vitest";
import { formatLanguageStatus, getLanguageOptions } from "../src/ui/languageOptions";

describe("getLanguageOptions", () => {
  it("includes auto only for source model languages", () => {
    expect(getLanguageOptions("openai", "source", "auto")[0]?.value).toBe("auto");
    expect(getLanguageOptions("openai", "target", "Chinese").some((item) => item.value === "auto")).toBe(false);
  });

  it("uses explicit codes for MyMemory", () => {
    const values = getLanguageOptions("mymemory", "target", "zh-CN").map((item) => item.value);
    expect(values).toContain("en");
    expect(values).toContain("zh-CN");
    expect(values).not.toContain("auto");
  });

  it("preserves custom current values", () => {
    const options = getLanguageOptions("openai", "target", "Polish");
    expect(options[0]).toEqual({ value: "Polish", label: "Polish" });
  });
});

describe("formatLanguageStatus", () => {
  it("formats the source and target pair", () => {
    expect(formatLanguageStatus("en", "zh-CN")).toBe("en -> zh-CN");
  });
});
