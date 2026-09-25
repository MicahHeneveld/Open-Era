export class DeterministicRng {
  state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x1_0000_0000;
  }

  between(minimum: number, maximum: number): number {
    return minimum + (maximum - minimum) * this.next();
  }

  integer(minimum: number, maximum: number): number {
    return Math.floor(this.between(minimum, maximum + 1));
  }

  pick<T>(values: T[]): T {
    if (values.length === 0) throw new Error("Cannot pick from an empty collection");
    return values[this.integer(0, values.length - 1)];
  }
}
