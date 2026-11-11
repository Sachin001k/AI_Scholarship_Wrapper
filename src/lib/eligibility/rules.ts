/**
 * Eligibility rules (design doc §6.2, §6.3, §7.3).
 *
 * - Rules are stored as JSON data and turned into objects by RuleRegistry
 *   (Factory/Registry). New condition types are new classes + one register()
 *   call; the engine never changes (Open/Closed).
 * - AllOfRule / AnyOfRule are Composites.
 * - Three-valued logic: a condition on an unanswered attribute returns
 *   UNKNOWN, never FAIL.
 */
import type { Money, RuleNode } from "../domain/types";
import { convert, type ExchangeRateProvider } from "../funding/fx";
import { formatMoney } from "../domain/values";
import { attributeLabel, valueLabel, type Attributes } from "./attributes";

export type Outcome = "PASS" | "FAIL" | "UNKNOWN";

export interface Reason {
  status: Outcome;
  attr: string;
  text: string;
}

export interface RuleResult {
  outcome: Outcome;
  reasons: Reason[];
  /** Number of leaf conditions that failed (for "near miss"). */
  failedLeafCount: number;
}

export interface EligibilityContext {
  attributes: Attributes;
  at: Date;
  rates: ExchangeRateProvider;
}

export interface EligibilityRule {
  evaluate(ctx: EligibilityContext): RuleResult;
}

// ---------- helpers ----------

const leaf = (outcome: Outcome, attr: string, text: string): RuleResult => ({
  outcome,
  reasons: [{ status: outcome, attr, text }],
  failedLeafCount: outcome === "FAIL" ? 1 : 0,
});

const isMissing = (v: unknown) =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

const list = (attr: string, values: string[], max = 4) => {
  const labels = values.map((v) => valueLabel(attr, v));
  return labels.length > max ? `${labels.slice(0, max).join(", ")} +${labels.length - max} more` : labels.join(", ");
};

// ---------- composite rules ----------

export class AllOfRule implements EligibilityRule {
  constructor(private readonly children: EligibilityRule[]) {}
  evaluate(ctx: EligibilityContext): RuleResult {
    // Evaluate every child (not short-circuited) so near-miss counts are exact.
    const results = this.children.map((c) => c.evaluate(ctx));
    const outcome: Outcome = results.some((r) => r.outcome === "FAIL")
      ? "FAIL"
      : results.some((r) => r.outcome === "UNKNOWN")
        ? "UNKNOWN"
        : "PASS";
    return {
      outcome,
      reasons: results.flatMap((r) => r.reasons),
      failedLeafCount: results.reduce((n, r) => n + r.failedLeafCount, 0),
    };
  }
}

export class AnyOfRule implements EligibilityRule {
  constructor(private readonly children: EligibilityRule[]) {}
  evaluate(ctx: EligibilityContext): RuleResult {
    const results = this.children.map((c) => c.evaluate(ctx));
    const pass = results.find((r) => r.outcome === "PASS");
    if (pass) return { outcome: "PASS", reasons: pass.reasons, failedLeafCount: 0 };
    const unknown = results.find((r) => r.outcome === "UNKNOWN");
    if (unknown) {
      return {
        outcome: "UNKNOWN",
        reasons: [
          {
            status: "UNKNOWN",
            attr: unknown.reasons[0]?.attr ?? "",
            text: `Any one of: ${results.flatMap((r) => r.reasons.map((x) => x.text)).join(" · or ")}`,
          },
        ],
        failedLeafCount: 0,
      };
    }
    // All failed: report the closest branch.
    const best = results.reduce((a, b) => (b.failedLeafCount < a.failedLeafCount ? b : a));
    return { outcome: "FAIL", reasons: best.reasons, failedLeafCount: best.failedLeafCount };
  }
}

// ---------- leaf rules ----------

export class InSetRule implements EligibilityRule {
  constructor(private readonly attr: string, private readonly values: string[]) {}
  evaluate({ attributes }: EligibilityContext): RuleResult {
    const v = attributes[this.attr];
    const label = attributeLabel(this.attr);
    if (isMissing(v)) return leaf("UNKNOWN", this.attr, `${label}: tell us to check (${list(this.attr, this.values)})`);
    if (this.values.includes("*") || this.values.includes(String(v))) {
      return leaf("PASS", this.attr, `${label}: ${valueLabel(this.attr, String(v))}`);
    }
    return leaf("FAIL", this.attr, `${label} must be ${list(this.attr, this.values)}`);
  }
}

export class SetOverlapRule implements EligibilityRule {
  constructor(private readonly attr: string, private readonly values: string[]) {}
  evaluate({ attributes }: EligibilityContext): RuleResult {
    const v = attributes[this.attr] as string[] | undefined;
    const label = attributeLabel(this.attr);
    if (isMissing(v)) return leaf("UNKNOWN", this.attr, `${label}: tell us to check (${list(this.attr, this.values)})`);
    if (this.values.includes("*")) return leaf("PASS", this.attr, `${label}: open to all`);
    const hit = v!.filter((x) => this.values.includes(x));
    if (hit.length) return leaf("PASS", this.attr, `${label}: ${list(this.attr, hit)}`);
    return leaf("FAIL", this.attr, `${label} must include ${list(this.attr, this.values)}`);
  }
}

export class RangeRule implements EligibilityRule {
  constructor(private readonly attr: string, private readonly min?: number, private readonly max?: number) {}
  evaluate({ attributes }: EligibilityContext): RuleResult {
    const v = attributes[this.attr];
    const label = attributeLabel(this.attr);
    const need =
      this.min !== undefined && this.max !== undefined
        ? `between ${this.min} and ${this.max}`
        : this.min !== undefined
          ? `at least ${this.min}`
          : `at most ${this.max}`;
    if (typeof v !== "number") return leaf("UNKNOWN", this.attr, `${label}: needs to be ${need}`);
    const ok = (this.min === undefined || v >= this.min) && (this.max === undefined || v <= this.max);
    return ok
      ? leaf("PASS", this.attr, `${label} ${v} (needs ${need})`)
      : leaf("FAIL", this.attr, `${label} ${v}, needs ${need}`);
  }
}

/** Compares money after converting to the rule's currency (MoneyThresholdRule). */
export class MoneyThresholdRule implements EligibilityRule {
  constructor(private readonly attr: string, private readonly max: Money) {}
  evaluate({ attributes, rates }: EligibilityContext): RuleResult {
    const v = attributes[this.attr] as Money | undefined;
    const label = attributeLabel(this.attr);
    const limit = formatMoney(this.max);
    if (!v) return leaf("UNKNOWN", this.attr, `${label}: must be under ${limit} (optional question)`);
    const inRuleCcy = convert(v, this.max.currency, rates);
    return inRuleCcy.amount <= this.max.amount
      ? leaf("PASS", this.attr, `${label} is under ${limit}`)
      : leaf("FAIL", this.attr, `${label} is above the ${limit} limit`);
  }
}

export class IsTrueRule implements EligibilityRule {
  constructor(private readonly attr: string) {}
  evaluate({ attributes }: EligibilityContext): RuleResult {
    const v = attributes[this.attr];
    const label = attributeLabel(this.attr);
    if (typeof v !== "boolean") return leaf("UNKNOWN", this.attr, `${label}: tell us to check`);
    return v ? leaf("PASS", this.attr, `${label}: yes`) : leaf("FAIL", this.attr, `Only for: ${label.toLowerCase()}`);
  }
}

class AlwaysRule implements EligibilityRule {
  evaluate(): RuleResult {
    return { outcome: "PASS", reasons: [], failedLeafCount: 0 };
  }
}

// ---------- registry ----------

type Factory = (node: RuleNode, build: (n: RuleNode) => EligibilityRule) => EligibilityRule;

export class RuleRegistry {
  private readonly factories = new Map<string, Factory>();
  private readonly cache = new Map<string, EligibilityRule>();

  register(type: string, factory: Factory): this {
    this.factories.set(type, factory);
    return this;
  }

  build = (node: RuleNode): EligibilityRule => {
    const f = this.factories.get(node.type);
    if (!f) throw new Error(`Unknown rule type "${node.type}"`);
    return f(node, this.build);
  };

  /** Parsed once per (opportunity, version) and cached (doc §6.8 rule:{id}:{v}). */
  get(key: string, node: RuleNode): EligibilityRule {
    let rule = this.cache.get(key);
    if (!rule) {
      rule = this.build(node);
      this.cache.set(key, rule);
    }
    return rule;
  }
}

export function createDefaultRegistry(): RuleRegistry {
  return new RuleRegistry()
    .register("allOf", (n, b) => new AllOfRule((n as Extract<RuleNode, { type: "allOf" }>).children.map(b)))
    .register("anyOf", (n, b) => new AnyOfRule((n as Extract<RuleNode, { type: "anyOf" }>).children.map(b)))
    .register("inSet", (n) => {
      const x = n as Extract<RuleNode, { type: "inSet" }>;
      return new InSetRule(x.attr, x.values);
    })
    .register("overlap", (n) => {
      const x = n as Extract<RuleNode, { type: "overlap" }>;
      return new SetOverlapRule(x.attr, x.values);
    })
    .register("range", (n) => {
      const x = n as Extract<RuleNode, { type: "range" }>;
      return new RangeRule(x.attr, x.min, x.max);
    })
    .register("moneyMax", (n) => {
      const x = n as Extract<RuleNode, { type: "moneyMax" }>;
      return new MoneyThresholdRule(x.attr, x.max);
    })
    .register("isTrue", (n) => new IsTrueRule((n as Extract<RuleNode, { type: "isTrue" }>).attr))
    .register("always", () => new AlwaysRule());
}
