import {
  AirplaneIcon, CarFrontIcon, ClothingHangerIcon, CookingStationIcon, CouchIcon, HammerIcon, HeadphonesIcon, HouseRealEstateIcon,
  LaptopIcon, LeafIcon, LotionIcon, MobilePortraitIcon, MotorcycleIcon, ShopBagIcon, TagIcon, WashingMachineIcon,
} from "@ws/components/icons";
import type { CategoryId } from "@ws/lib/data/types";

type Icon = typeof MobilePortraitIcon;

/*
 * Each department's Atlas glyph. The reference keyed a fixed list of ten ids; the live
 * catalogue names its own departments, so the glyph is chosen from words in the slug,
 * most specific first, with a tag for anything unmatched.
 */
const RULES: ReadonlyArray<readonly [RegExp, Icon]> = [
  [/phone|tablet|mobile/, MobilePortraitIcon],
  [/computer|laptop/, LaptopIcon],
  [/electronic|gadget|audio|tv/, HeadphonesIcon],
  [/appliance/, WashingMachineIcon],
  [/furniture/, CouchIcon],
  [/kitchen|home/, CookingStationIcon],
  [/fashion|cloth|wear|shoe/, ClothingHangerIcon],
  [/beauty|health|personal|cosmetic/, LotionIcon],
  [/motorcycle|bike/, MotorcycleIcon],
  [/vehicle|car|auto|motor/, CarFrontIcon],
  [/propert|estate|land|house/, HouseRealEstateIcon],
  [/food|agric|farm|grocer/, LeafIcon],
  [/service|repair|professional|business/, HammerIcon],
  [/travel|flight|tour/, AirplaneIcon],
  [/bag|accessor|jewel|watch/, ShopBagIcon],
];

export function categoryIcon(id: CategoryId): Icon {
  // Word starts only, so "personal-care" does not match "car".
  const words = id.split("-");
  return RULES.find(([re]) => words.some((w) => re.test(w) && w.search(re) === 0))?.[1] ?? TagIcon;
}
