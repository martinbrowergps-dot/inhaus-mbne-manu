import { onCLS, onFCP, onLCP, onINP, type Metric } from "web-vitals";

type VitalReporter = (metric: Metric) => void;

function logVital(metric: Metric): void {
  const rating =
    metric.rating === "good" ? "✅" : metric.rating === "needs-improvement" ? "⚠️" : "🔴";
  console.info(`[web-vital] ${rating} ${metric.name}: ${metric.value.toFixed(2)}`);
}

function sendToAnalytics(metric: Metric): void {
  // Placeholder — enviar para endpoint /_vitals no futuro
  if (typeof fetch !== "undefined" && import.meta.env.PROD) {
    fetch("/_vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        url: location.pathname,
      }),
    }).catch(() => {});
  }
}

export function reportWebVitals(reporter?: VitalReporter): void {
  const report = reporter ?? (import.meta.env.DEV ? logVital : sendToAnalytics);
  onCLS(report);
  onFCP(report);
  onLCP(report);
  onINP(report);
}
