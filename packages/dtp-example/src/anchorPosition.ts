export type PopupPlacement = "above" | "below";

export interface PopupPosition {
  left: number;
  top: number;
  placement: PopupPlacement;
  arrowLeft: number;
  /** Set only when content exceeds available viewport space. */
  maxHeight?: number;
}

const MARGIN = 8;

export function computePopupPosition(
  anchor: DOMRect,
  popupWidth: number,
  popupHeight: number,
  preferAbove = true,
): PopupPosition {
  const anchorCenterX = anchor.left + anchor.width / 2;
  const halfW = popupWidth / 2;

  let centerX = anchorCenterX;
  if (centerX - halfW < MARGIN) {
    centerX = MARGIN + halfW;
  }
  if (centerX + halfW > window.innerWidth - MARGIN) {
    centerX = window.innerWidth - MARGIN - halfW;
  }

  const popupLeft = centerX - halfW;
  const arrowLeft = Math.max(16, Math.min(popupWidth - 16, anchorCenterX - popupLeft));

  const spaceAbove = Math.max(0, anchor.top - MARGIN);
  const spaceBelow = Math.max(0, window.innerHeight - anchor.bottom - MARGIN);

  let placement: PopupPlacement =
    preferAbove && spaceAbove >= spaceBelow ? "above" : "below";

  if (placement === "above" && spaceAbove < 160 && spaceBelow > spaceAbove) {
    placement = "below";
  } else if (placement === "below" && spaceBelow < 160 && spaceAbove > spaceBelow) {
    placement = "above";
  }

  const available = placement === "above" ? spaceAbove : spaceBelow;
  const scrollLimit = available - MARGIN;
  const needsScroll = popupHeight > scrollLimit;

  const top =
    placement === "above" ? anchor.top - MARGIN : anchor.bottom + MARGIN;

  return {
    left: Math.round(centerX),
    top: Math.round(top),
    placement,
    arrowLeft: Math.round(arrowLeft),
    maxHeight: needsScroll ? Math.max(160, Math.round(scrollLimit)) : undefined,
  };
}
