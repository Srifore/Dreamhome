import { CaptionComposerService } from "./caption-composer.service";

describe("CaptionComposerService", () => {
  let service: CaptionComposerService;

  beforeEach(() => {
    service = new CaptionComposerService();
  });

  const input = { productName: "Designer Chimney 90cm", brandName: "Faber", categoryName: "Designer Chimneys" };

  it("substitutes product/brand/category placeholders into the caption", () => {
    const caption = service.compose(input, 0);
    expect(caption).toContain("Faber Designer Chimney 90cm");
    expect(caption.toLowerCase()).toContain("designer chimneys");
  });

  it("avoids double-prefixing the brand when the product name already includes it", () => {
    const caption = service.compose(input, 0);
    expect(caption).not.toContain("Faber Faber");
  });

  it("produces a stable, repeatable caption for the same seed (deterministic, not time-based)", () => {
    expect(service.compose(input, 5)).toBe(service.compose(input, 5));
  });

  it("varies the caption across different seeds", () => {
    expect(service.compose(input, 0)).not.toBe(service.compose(input, 1));
  });

  it("wraps around to reuse variants once the seed exceeds the option count", () => {
    // 5 openers -> seed 0 and seed 5 pick the same opener line
    const captionA = service.compose(input, 0).split("\n")[0];
    const captionB = service.compose(input, 5).split("\n")[0];
    expect(captionA).toBe(captionB);
  });

  it("builds hashtags from the brand and category with spaces stripped", () => {
    const caption = service.compose(
      { productName: "Island Hood", brandName: "AO Smith", categoryName: "Designer Chimneys" },
      0,
    );
    expect(caption).toContain("#AOSmith");
    expect(caption).toContain("#DesignerChimneys");
    expect(caption).toContain("#DreamHome");
  });
});
