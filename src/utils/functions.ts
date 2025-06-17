export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getEncodedLength(array: Uint8Array): number {
    return 2 + array.length;
}

export function randomStringArray( texts: string[]): string {
  if (!texts || texts.length === 0) {
    throw new Error("Sayings array is empty or undefined.");
  }
  return texts[Math.floor(Math.random() * texts.length)];
}

export function capitalize(text: string): string {
  const thing = text.toLowerCase();
  return thing.charAt(0).toUpperCase() + thing.slice(1);
};