function getInvertDetails(from: DOMRect, to: DOMRect) {
  const diffX = from.left - to.left;
  const diffY = from.top - to.top;
  const widthCompensation = (from.width - to.width) / 2;
  const heightCompensation = (from.height - to.height) / 2;

  console.log({
    diffX,
    diffY,
    widthCompensation,
    heightCompensation,
    from,
    to,
  });

  return {
    x: diffX, //+ widthCompensation,
    y: diffY, //+ heightCompensation,
  };
}

/**
 * Basic flip utility, very specific to the avatar image.
 * It is curried because it is being used during page transitions and
 * we need to measure the original element and the target element
 * in different lifecycle phases.
 * The original element must be measured before-swap and the
 * target element after-swap.
 */
export const flipAvatar = (
  from: HTMLElement,
  { duration = 1000, delay = 300 }
) => {
  const originalRect = from.getBoundingClientRect();
  return (to: HTMLElement) => {
    const targetRect = to.getBoundingClientRect();
    const { x, y } = getInvertDetails(originalRect, targetRect);
    console.log(`translate(${x}px, ${y}px) `);
    const animation = to.animate(
      [
        {
          transform: `translate(${x}px, ${y}px) `,
          height: `${originalRect.height}px`,
          width: `${originalRect.width}px`,
        },
        {
          transform: "translate(0, 0)",
          height: `${targetRect.height}px`,
          width: `${targetRect.width}px`,
        },
      ],
      {
        duration,
        fill: "both",
        easing: "ease-in-out",
        delay,
      }
    );
    return animation;
  };
};
