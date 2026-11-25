import type { WeightedEntry } from "./types.js";

// Habilidades legales (máximo 3 por especie) normalizadas por nombre de especie en minúsculas
const SPECIES_LEGAL_ABILITIES: Record<string, readonly string[]> = {
  "rillaboom": ["Overgrow", "Grassy Surge"],
  "sneasler": ["Poison Touch", "Unburden", "Pickpocket"],
  "incineroar": ["Blaze", "Intimidate"],
  "garchomp": ["Sand Veil", "Rough Skin"],
  "charizard": ["Blaze", "Solar Power"],
  "archaludon": ["Stamina", "Inner Focus", "Sturdy"],
  "farigiraf": ["Cud Chew", "Armor Tail", "Sap Sipper"],
  "golisopod": ["Emergency Exit"],
  "kingambit": ["Defiant", "Supreme Overlord", "Pressure"],
  "indeedee": ["Inner Focus", "Synchronize", "Psychic Surge"],
  "indeedee ♀": ["Own Tempo", "Synchronize", "Psychic Surge"],
  "female indeedee": ["Own Tempo", "Synchronize", "Psychic Surge"],
  "salamence": ["Intimidate", "Moxie"],
  "raichu": ["Static", "Lightning Rod"],
  "basculegion": ["Swift Swim", "Adaptability", "Mold Breaker"],
  "basculegion ♀": ["Swift Swim", "Adaptability", "Mold Breaker"],
  "female basculegion": ["Swift Swim", "Adaptability", "Mold Breaker"],
  "gholdengo": ["Good as Gold"],
  "politoed": ["Water Absorb", "Damp", "Drizzle"],
  "grimmsnarl": ["Prankster", "Frisk", "Pickpocket"],
  "pelipper": ["Keen Eye", "Drizzle", "Rain Dish"],
  "whimsicott": ["Prankster", "Infiltrator", "Chlorophyll"],
  "milotic": ["Marvel Scale", "Competitive", "Cute Charm"],
  "tyranitar": ["Sand Stream", "Unnerve"],
  "sylveon": ["Cute Charm", "Pixilate"],
  "staraptor": ["Intimidate", "Reckless"],
  "volcarona": ["Flame Body", "Swarm"],
  "eternal flower floette": ["Flower Veil"],
  "hisuian arcanine": ["Intimidate", "Flash Fire", "Rock Head"],
  "sinistcha": ["Hospitality", "Heatproof"],
  "excadrill": ["Sand Rush", "Sand Force", "Mold Breaker"],
  "floette": ["Flower Veil", "Symbiosis"],
  "gardevoir": ["Synchronize", "Trace", "Telepathy"],
  "froslass": ["Snow Cloak", "Cursed Body"],
  "armarouge": ["Flash Fire", "Weak Armor"],
  "torkoal": ["White Smoke", "Drought", "Shell Armor"],
  "metagross": ["Clear Body", "Light Metal"],
  "venusaur": ["Overgrow", "Chlorophyll"],
  "primarina": ["Torrent", "Liquid Voice"],
  "gengar": ["Cursed Body"],
  "glimmora": ["Toxic Debris", "Corrosion"],
  "dragonite": ["Inner Focus", "Multiscale"],
  "swampert": ["Torrent", "Damp"],
  "alolan ninetales": ["Snow Cloak", "Snow Warning"],
  "lucario": ["Steadfast", "Inner Focus", "Justified"],
  "delphox": ["Blaze", "Magician"],
  "kommo-o": ["Bulletproof", "Soundproof", "Overcoat"],
  "camerupt": ["Magma Armor", "Solid Rock", "Anger Point"],
  "aerodactyl": ["Rock Head", "Pressure", "Unnerve"],
  "annihilape": ["Vital Spirit", "Inner Focus", "Defiant"],
  "baxcalibur": ["Thermal Exchange", "Ice Body"],
  "hatterene": ["Healer", "Anticipation", "Magic Bounce"],
  "corviknight": ["Pressure", "Unnerve", "Mirror Armor"],
  "blaziken": ["Blaze", "Speed Boost"],
  "blastoise": ["Torrent", "Rain Dish"],
  "dragapult": ["Clear Body", "Infiltrator", "Cursed Body"],
  "absol": ["Pressure", "Super Luck", "Justified"],
  "clefable": ["Cute Charm", "Magic Guard", "Unaware"],
  "talonflame": ["Flame Body", "Gale Wings"],
  "ceruledge": ["Flash Fire", "Weak Armor"],
  "mawile": ["Hyper Cutter", "Intimidate", "Sheer Force"],
  "sableye": ["Keen Eye", "Stall", "Prankster"],
  "pawmot": ["Volt Absorb", "Natural Cure", "Iron Fist"],
  "toxapex": ["Merciless", "Limber", "Regenerator"],
  "vivillon": ["Shield Dust", "Compound Eyes", "Friend Guard"],
  "hydreigon": ["Levitate"],
  "hippowdon": ["Sand Stream", "Sand Force"],
  "maushold": ["Friend Guard", "Cheek Pouch", "Technician"],
  "sceptile": ["Overgrow", "Unburden"],
  "drampa": ["Berserk", "Sap Sipper", "Cloud Nine"],
  "aegislash": ["Stance Change"],
  "heat rotom": ["Levitate"],
  "scovillain": ["Chlorophyll", "Insomnia", "Moody"],
  "scrafty": ["Shed Skin", "Intimidate", "Moxie"],
  "meganium": ["Overgrow", "Leaf Guard"],
  "altaria": ["Natural Cure", "Cloud Nine"],
  "kangaskhan": ["Early Bird", "Scrappy", "Inner Focus"],
  "tsareena": ["Leaf Guard", "Queenly Majesty", "Sweet Veil"],
  "gliscor": ["Hyper Cutter", "Sand Veil", "Poison Heal"],
  "lycanroc dusk": ["Tough Claws"],
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function getLegalAbilitiesForSpecies(speciesName: string): readonly string[] {
  const key = normalizeKey(speciesName);
  const direct = SPECIES_LEGAL_ABILITIES[key];
  if (direct) return direct.slice(0, 3);

  const withoutGender = key.replace(/\s*[♀♂]$/, "").replace(/^female\s+/, "").trim();
  const genderMatch = SPECIES_LEGAL_ABILITIES[withoutGender];
  if (genderMatch) return genderMatch.slice(0, 3);

  return [];
}

export function filterLegalAbilities(
  speciesName: string,
  abilities: readonly WeightedEntry[]
): WeightedEntry[] {
  const legal = getLegalAbilitiesForSpecies(speciesName);
  if (legal.length === 0) {
    return [...abilities]
      .sort((a, b) => (b.usage ?? 0) - (a.usage ?? 0))
      .slice(0, 3);
  }

  const legalOrder = new Map<string, number>();
  legal.forEach((name, idx) => legalOrder.set(normalizeKey(name), idx));

  const presentMap = new Map<string, WeightedEntry>();
  for (const entry of abilities) {
    const k = normalizeKey(entry.name);
    if (legalOrder.has(k) && !presentMap.has(k)) {
      presentMap.set(k, entry);
    }
  }

  const merged: WeightedEntry[] = legal.map((name) => {
    const existing = presentMap.get(normalizeKey(name));
    return existing ?? { name, usage: 0 };
  });

  merged.sort((a, b) => {
    const diff = (b.usage ?? 0) - (a.usage ?? 0);
    if (diff !== 0) return diff;
    const ia = legalOrder.get(normalizeKey(a.name)) ?? Number.MAX_SAFE_INTEGER;
    const ib = legalOrder.get(normalizeKey(b.name)) ?? Number.MAX_SAFE_INTEGER;
    return ia - ib;
  });

  return merged.slice(0, 3);
}
