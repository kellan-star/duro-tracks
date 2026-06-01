// Simple token-bucket rate limiter. Refills `capacity` tokens every
// `intervalMs`. `take()` resolves once a token is available.

export class RateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private readonly refillMs: number;
  private lastRefill: number;

  constructor(capacity: number, intervalMs = 60_000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillMs = intervalMs / capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    const refilled = Math.floor(elapsed / this.refillMs);
    if (refilled > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + refilled);
      this.lastRefill += refilled * this.refillMs;
    }
  }

  async take(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }
    const wait = this.refillMs - (Date.now() - this.lastRefill);
    await new Promise((r) => setTimeout(r, Math.max(0, wait)));
    return this.take();
  }
}
