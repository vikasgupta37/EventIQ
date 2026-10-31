import type { Category } from "@/lib/types";
import { money } from "@/lib/engines";

export const budgetColors = [
  "#167568",
  "#4c9e8a",
  "#91c2ad",
  "#e88e73",
  "#f0b39a",
  "#ddbc70",
  "#708b9e",
  "#a2b6c2",
  "#a8b88d",
  "#d9d7b8",
];

/** A small SVG keeps exact values accessible without a chart-library runtime. */
export default function BudgetChart({
  categories,
  currency,
  contingency,
}: {
  categories: Category[];
  currency: string;
  contingency: number;
}) {
  const total = categories.reduce(
    (sum, category) => sum + category.allocated,
    0,
  );
  const fmt = (amount: number) => money(amount, currency);
  const segments = categories.map((category, index) => {
    const length = total ? (category.allocated / total) * 100 : 0;
    const start = total
      ? (categories
          .slice(0, index)
          .reduce((sum, item) => sum + item.allocated, 0) /
          total) *
        100
      : 0;
    return (
      <circle
        key={category.id}
        cx="100"
        cy="100"
        r="76"
        pathLength="100"
        fill="none"
        stroke={budgetColors[index % budgetColors.length]}
        strokeWidth="22"
        strokeDasharray={`${length} ${100 - length}`}
        strokeDashoffset={-start}
        transform="rotate(-90 100 100)"
      >
        <title>
          {category.name}: {fmt(category.allocated)}
        </title>
      </circle>
    );
  });
  return (
    <div className="budget-chart">
      <div className="donut">
        <svg
          viewBox="0 0 200 200"
          width="190"
          height="190"
          role="img"
          aria-label={`Budget allocation: ${categories.map((c) => `${c.name} ${fmt(c.allocated)}`).join(", ")}`}
        >
          <circle
            cx="100"
            cy="100"
            r="76"
            fill="none"
            stroke="var(--line)"
            strokeWidth="22"
          />
          {segments}
        </svg>
        <div className="donut-center">
          <small>Allocated</small>
          <b>{fmt(total)}</b>
        </div>
      </div>
      <div className="chart-legend">
        {categories.slice(0, 5).map((c, i) => (
          <div key={c.id}>
            <span>
              <i aria-hidden="true" style={{ background: budgetColors[i] }} />
              {c.name}
            </span>
            <b>{fmt(c.allocated)}</b>
          </div>
        ))}
        <small>
          {Math.max(0, categories.length - 5)} more categories ·{" "}
          {fmt(contingency)} reserve
        </small>
      </div>
    </div>
  );
}
