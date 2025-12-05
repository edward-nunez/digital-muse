export class PetProfile {
  constructor({
    id = null,
    name = "Pet",
    className = "Paladin",
    personality = "Friendly",
    alignment = 0,
    stats = {},
  } = {}) {
    this.id = id ?? `pet_${Date.now()}`;
    this.name = name;
    this.className = className;
    this.personality = personality;
    this.alignment = alignment; // neutral by default, can be -100 (evil) to +100 (good)
    this.neglectCount = 0; // 25 neglects lead to game over
    // structured default stats
    const defaultStats = {
      attributes: {
        strength: 5,
        dexterity: 5,
        constitution: 5,
        intelligence: 5,
        wisdom: 5,
        charisma: 5,
        luck: 5,
      },
      vitals: {
        hp: 100,
        mp: 30,
        energy: 50,
        mood: 100,
        hunger: 100,
      },
      physical: {
        attack: 10,
        defense: 5,
        speed: 10,
        accuracy: 90,
        critical: 5,
        evasion: 5,
      },
      magic: {
        magicAttack: 8,
        magicDefense: 4,
      },
    };

    // deep merge provided stats into defaults (shallow nested merge is sufficient here)
    this.stats = mergeStats(defaultStats, stats);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      className: this.className,
      personality: this.personality,
      alignment: this.alignment,
      neglectCount: this.neglectCount,
      stats: this.stats,
    };
  }

  static fromJSON(obj) {
    if (!obj) return null;
    return new PetProfile({
      id: obj.id,
      name: obj.name,
      className: obj.className,
      personality: obj.personality,
      alignment: obj.alignment,
      neglectCount: obj.neglectCount,
      stats: obj.stats,
    });
  }
}

// Helper: merge two stats objects (default <- provided). Handles nested objects one level deep.
function mergeStats(defaults, provided) {
  if (!provided) return JSON.parse(JSON.stringify(defaults));
  const out = JSON.parse(JSON.stringify(defaults));
  Object.keys(provided).forEach((k) => {
    if (
      provided[k] &&
      typeof provided[k] === "object" &&
      !Array.isArray(provided[k])
    ) {
      out[k] = out[k] || {};
      Object.keys(provided[k]).forEach((sub) => {
        out[k][sub] = provided[k][sub];
      });
    } else {
      out[k] = provided[k];
    }
  });
  return out;
}
