import type { SVGProps } from "react";

/* Atlas icons are 24px stroked line icons in colour currentColor, so an icon takes the
   colour of its text. Icons are decorative by default; pass `label` when the icon is
   the only thing that says what something is.

   Weight comes from where the icon sits (styles/marketplace.css, "Icon weights"):
   linear (Atlas medium, 1.5px) for things you read, bold (Atlas bold, 2px) for things
   you act on or that show state. Pass `weight` to override that for one icon. */

export type IconWeight = "thin" | "medium" | "bold";
/** "linear" is the name the design uses for Atlas's medium weight. */
export type IconWeightName = IconWeight | "linear";
export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number | string;
  weight?: IconWeightName;
  label?: string;
};

const STROKE: Record<IconWeightName, number> = { thin: 1, medium: 1.5, linear: 1.5, bold: 2 };

export function createIcon(name: string, markup: string) {
  function Icon({ size = 24, weight, label, style, ...props }: IconProps) {
    const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeMiterlimit={10}
        strokeWidth={STROKE[weight ?? "medium"]}
        focusable="false"
        data-atlas={name}
        // An explicit weight is inline, so it beats the context rules in CSS.
        style={weight ? { strokeWidth: STROKE[weight], ...style } : style}
        {...a11y}
        {...props}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    );
  }
  Icon.displayName = `${name}Icon`;
  return Icon;
}
