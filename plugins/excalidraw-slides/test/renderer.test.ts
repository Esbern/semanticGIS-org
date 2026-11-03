import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { renderToSvg } from "../src/renderer";
import { parseExcalidrawJson, parseExcalidrawMd } from "../src/parser";

const fixturesDir = join(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf-8");
}

describe("renderToSvg", () => {
  it("renders empty elements to valid SVG", () => {
    const result = renderToSvg(
      { type: "excalidraw", version: 2, elements: [], appState: {}, files: {} },
      {},
    );

    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("xmlns=");
    expect(result.svg).toContain("</svg>");
  });

  it("renders rectangle elements as SVG paths", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("<path");
    expect(result.svg).toContain("</svg>");
  });

  it("renders text elements", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("<text");
    expect(result.svg).toContain("Hello World");
  });

  it("includes font definitions", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("font-face");
    expect(result.svg).toContain("Virgil");
  });

  it("applies background color", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("--excalidraw-bg");
  });

  it("respects dark mode option", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, { darkMode: "dark" });

    expect(result.svg).toContain('data-bg-color="#1e1e1e"');
  });

  it("respects export padding", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const r1 = renderToSvg(data!, {});
    const r2 = renderToSvg(data!, { exportPadding: 50 });

    expect(r1.svg).not.toBe(r2.svg);
  });

  it("renders images with data URLs", () => {
    const data = parseExcalidrawMd(readFixture("with-images.excalidraw.md"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("<image");
    expect(result.svg).toContain("data:image/png;base64,");
  });

  it("produces deterministic output for same seed", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const r1 = renderToSvg(data!, {});
    const r2 = renderToSvg(data!, {});

    expect(r1.svg).toBe(r2.svg);
  });

  it("renders .excalidraw.md file content", () => {
    const data = parseExcalidrawMd(readFixture("simple.excalidraw.md"));
    const result = renderToSvg(data!, {});

    expect(result.svg).toContain("<svg");
    expect(result.svg).toContain("<path");
    expect(result.svg).toContain("Hello World");
  });

  it("returns viewBox dimensions", () => {
    const data = parseExcalidrawJson(readFixture("simple.excalidraw"));
    const result = renderToSvg(data!, {});

    expect(result.viewBox.width).toBeGreaterThan(0);
    expect(result.viewBox.height).toBeGreaterThan(0);
    expect(typeof result.viewBox.offsetX).toBe("number");
    expect(typeof result.viewBox.offsetY).toBe("number");
  });
});

describe("slides", () => {
  const frame = (id: string, name: string, x: number, order?: number) => ({
    id,
    type: "frame",
    name,
    x,
    y: 0,
    width: 100,
    height: 50,
    angle: 0,
    strokeColor: "#000",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    seed: 1,
    isDeleted: false,
    roundness: null,
    customData: order === undefined ? {} : { slideshow: { schemaVersion: 2, kind: "frame", order } },
  });

  it("follows the slideshow order and leaves out frames without one", () => {
    const elements = [frame("a", "Second", 0, 1), frame("b", "Not shown", 200), frame("c", "First", 400, 0)];
    const result = renderToSvg({ type: "excalidraw", version: 2, elements, appState: {}, files: {} } as never, {});
    expect(result.slides.map((s) => s.name)).toEqual(["First", "Second"]);
    expect(result.slides[0]?.x).toBe(400 + result.viewBox.offsetX);
    expect(result.svg).toContain('class="excalidraw-frame-outline"');
  });

  it("uses all frames in drawing order when none has a slideshow order", () => {
    const elements = [frame("a", "A", 0), frame("b", "B", 200)];
    const result = renderToSvg({ type: "excalidraw", version: 2, elements, appState: {}, files: {} } as never, {});
    expect(result.slides.map((s) => s.name)).toEqual(["A", "B"]);
  });

  it("has no slides without frames", () => {
    const result = renderToSvg({ type: "excalidraw", version: 2, elements: [], appState: {}, files: {} }, {});
    expect(result.slides).toEqual([]);
  });
});
