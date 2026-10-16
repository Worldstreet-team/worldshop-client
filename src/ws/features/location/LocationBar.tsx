import { ArrowDownIcon, LocationIcon } from "@ws/components/icons";
import { buttonClass } from "@ws/components/ui";
import { areasByCity, type Anchor } from "@ws/lib/areas";
import { RADII, radiusLabel, radiusParam, type Radius } from "@ws/lib/search/radius";
import { ApplyButton, UseMyLocation } from "./UseMyLocation";

/* LocationBar and ShipToSelector (R-001, spec §3). The bar is inline, never a blocking
   modal: "Showing items near Lekki · within 25 km · Change". Change opens the selector:
   a native popover (top layer, Escape and light dismiss built in), centred on desktop
   and a bottom sheet on phones. It's a plain form posting to a Server Action, so it
   works before any script loads. */

type Props = {
  anchor: Anchor;
  /** True when the anchor is the IP guess, not the buyer's choice. */
  inferred: boolean;
  radius: Radius;
  /** Where to come back to after choosing (current path and query). */
  returnTo: string;
  /** The Server Action (features/location/actions.ts); injectable for stories. */
  action: (formData: FormData) => void | Promise<void>;
};

const SELECT_ID = "ship-to-area";
export const SHIP_TO_ID = "ship-to";
const POPOVER_ID = SHIP_TO_ID;

export function LocationBar({ anchor, inferred, radius, returnTo, action }: Props) {
  return (
    <div className="ws-locbar">
      <p className="ws-locbar__text">
        <LocationIcon />
        <span>
          Showing items near <strong>{anchor.label}</strong>
          {radius === null ? " · nationwide" : ` · within ${radius} km`}
          {/* IP location is often far off on mobile networks, so say it's a guess. */}
          {inferred && <span className="ws-locbar__hint">Based on your connection. Not right?</span>}
        </span>
      </p>
      <button type="button" className={buttonClass({ variant: "quiet", size: "sm" })} popoverTarget={POPOVER_ID} aria-haspopup="dialog">
        Change<span className="cx-sr-only"> location</span>
      </button>
      <ShipToSelector anchor={anchor} radius={radius} returnTo={returnTo} action={action} />
    </div>
  );
}

/** Without a `radius` (the listing page) there's no distance to choose, only the area. */
export function ShipToSelector({ anchor, radius, returnTo, action }: Omit<Props, "inferred" | "radius"> & { radius?: Radius }) {
  return (
    <div id={POPOVER_ID} popover="auto" role="dialog" aria-modal="false" aria-labelledby="ship-to-title" className="ws-shipto">
      <form action={action} className="ws-shipto__form">
        <h2 id="ship-to-title" className="ws-shipto__title">
          Choose your location
        </h2>
        <p className="ws-shipto__lead">We show items near this area and work out delivery to it.</p>
        <input type="hidden" name="return" value={returnTo} />

        <div className="ws-field">
          <label htmlFor={SELECT_ID}>Area</label>
          <span className="ws-select-wrap">
            <select id={SELECT_ID} name="area" defaultValue={anchor.id} className="ws-select" autoFocus>
              {areasByCity().map(([city, areas]) => (
                <optgroup key={city} label={city}>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label === city ? `${city} (all areas)` : a.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ArrowDownIcon />
          </span>
          <UseMyLocation selectId={SELECT_ID} />
        </div>

        {radius !== undefined && (
          <fieldset className="ws-field ws-radios">
            <legend>Distance</legend>
            <div className="ws-radios__row">
              {RADII.map((r) => (
                <label key={radiusParam(r)} className="ws-radio-pill">
                  <input type="radio" name="radius" value={radiusParam(r)} defaultChecked={r === radius} />
                  <span>{radiusLabel(r)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="ws-shipto__actions">
          <button type="button" className={buttonClass({ variant: "ghost" })} popoverTarget={POPOVER_ID} popoverTargetAction="hide">
            Cancel
          </button>
          <ApplyButton />
        </div>
      </form>
    </div>
  );
}
