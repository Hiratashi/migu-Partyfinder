export type CompositionCharacter = {
  damage_type: string | null;
  role: string | null;
};

export type CompositionTargets = {
  need_physical: number;
  need_magical: number;
  need_support: number;
};

export type RemainingNeeds = {
  physical: number;
  magical: number;
  support: number;
};

export function characterCategories(character: CompositionCharacter) {
  return {
    physical: character.damage_type === "PHYSICAL" && ["DPS", "FLEX"].includes(character.role ?? ""),
    magical: character.damage_type === "MAGICAL" && ["DPS", "FLEX"].includes(character.role ?? ""),
    support: character.role === "SUPPORT"
  };
}

export function remainingNeeds(targets: CompositionTargets, members: CompositionCharacter[]): RemainingNeeds {
  let physical = 0;
  let magical = 0;
  let support = 0;
  for (const member of members) {
    const categories = characterCategories(member);
    if (categories.support) support += 1;
    else if (categories.physical) physical += 1;
    else if (categories.magical) magical += 1;
  }
  return {
    physical: Math.max(0, targets.need_physical - physical),
    magical: Math.max(0, targets.need_magical - magical),
    support: Math.max(0, targets.need_support - support)
  };
}

export function characterFitsRemaining(character: CompositionCharacter, remaining: RemainingNeeds) {
  const categories = characterCategories(character);
  const hasRequestedSlots = remaining.physical > 0 || remaining.magical > 0 || remaining.support > 0;
  if (!hasRequestedSlots) return true;
  return (
    (categories.physical && remaining.physical > 0) ||
    (categories.magical && remaining.magical > 0) ||
    (categories.support && remaining.support > 0)
  );
}

export function characterAllowed(character: CompositionCharacter, remaining: RemainingNeeds, openSeats: number, restricted: boolean) {
  if (!restricted) return true;
  const requestedStillOpen = remaining.physical + remaining.magical + remaining.support;
  // Any capacity beyond the still-requested roles is a flexible slot.
  if (openSeats > requestedStillOpen) return true;
  return characterFitsRemaining(character, remaining);
}

export function remainingLabel(remaining: RemainingNeeds) {
  return `${remaining.physical} Physical · ${remaining.magical} Magical · ${remaining.support} Support`;
}
