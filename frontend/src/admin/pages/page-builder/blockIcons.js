import { LuAward, LuChartBar, LuImage, LuImages, LuLayoutPanelLeft, LuLink, LuMegaphone, LuPanelTop, LuQuote, LuType, LuVideo } from "react-icons/lu";

// Builder-only icon per block type (kept out of blocks/blockTypes.js so the
// public bundle never pulls in the icon set).
export const BLOCK_ICONS = {
  hero: LuPanelTop,
  richtext: LuType,
  image: LuImage,
  video: LuVideo,
  testimonial: LuQuote,
  cta: LuMegaphone,
  gallery: LuImages,
  metrics: LuChartBar,
  quickLinks: LuLink,
  badges: LuAward,
  featureCards: LuLayoutPanelLeft,
};
