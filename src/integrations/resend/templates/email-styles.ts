import type { CSSProperties } from "react";

export const EMAIL_COLOR_CREAM = "#f3f0ea";
export const EMAIL_COLOR_LINE = "#e2ddd4";
export const EMAIL_COLOR_PAPER = "#ffffff";
export const EMAIL_COLOR_WASH = "#faf8f5";

/** Outer cream background — Tailwind padding on Body is unreliable in email clients. */
export const EMAIL_BODY_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_CREAM,
  margin: 0,
  padding: "24px 12px"
};

/** Main white card wrapper used by every template. */
export const EMAIL_CONTAINER_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_PAPER,
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px 24px"
};

/** Inset wash panel (highlight boxes, order summary, etc.). */
export const EMAIL_HIGHLIGHT_BOX_STYLE: CSSProperties = {
  backgroundColor: EMAIL_COLOR_WASH,
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  margin: "24px 0",
  padding: "20px 20px"
};

export const EMAIL_PRODUCT_IMAGE_STYLE: CSSProperties = {
  border: `1px solid ${EMAIL_COLOR_LINE}`,
  display: "block",
  objectFit: "cover"
};
