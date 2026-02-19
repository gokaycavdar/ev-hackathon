export type DensityLevel = "LOW" | "MEDIUM" | "HIGH";

export function getDensityLevel(load: number): DensityLevel {
  if (load < 40) return "LOW";
  if (load < 70) return "MEDIUM";
  return "HIGH";
}

export function calculateGreenRewards(isGreen: boolean, basePrice: number) {
  if (!isGreen) return { coins: 10, xp: 5, co2: 0 };
  return {
    coins: 50,
    xp: 25,
    co2: 1.2, // kg
  };
}
