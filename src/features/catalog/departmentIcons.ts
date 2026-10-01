import {
  BookOpen, Box, Building2, Flower2, Home, Monitor, Music, Puzzle, ShoppingBag, Smartphone,
  Sparkles, Tag, Trophy, Truck, Wrench,
} from 'lucide-react';

/** Department name to icon, as the sandbox pairs them. Tag is the fallback. */
export function departmentIcon(name: string) {
  const n = name.toLowerCase();
  // Whole words: a bare /car/ also matches "Personal Care".
  if (/vehicle|\bcars?\b|\bauto/.test(n)) return Truck;
  if (/phone|tablet|mobile/.test(n)) return Smartphone;
  if (/electronic|computer|laptop/.test(n)) return Monitor;
  if (/fashion|cloth|wear/.test(n)) return ShoppingBag;
  // Before "home": "Home appliances" would otherwise take the house.
  if (/appliance/.test(n)) return Box;
  if (/home|furniture|living/.test(n)) return Home;
  if (/sport|fitness|outdoor/.test(n)) return Trophy;
  if (/beauty|health|personal/.test(n)) return Flower2;
  if (/propert|estate|land/.test(n)) return Building2;
  if (/jewel|watch/.test(n)) return Sparkles;
  if (/baby|kid|child/.test(n)) return Puzzle;
  if (/book|media/.test(n)) return BookOpen;
  if (/music|instrument/.test(n)) return Music;
  if (/service/.test(n)) return Wrench;
  return Tag;
}

/** Drawn in outline while the rest are solid: filled in, a screen is a black
 *  slab and the tag loses the hole that makes it a tag. */
export const OUTLINED = new Set([Monitor, Smartphone, Tag, Music, Wrench]);
