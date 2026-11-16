import type { Metadata } from 'next';
import { PlannedScreen } from '@/components/planned-screen';

export const metadata: Metadata = {
  title: 'Forecasts',
};

export default function ForecastsPage() {
  return (
    <PlannedScreen
      eyebrow="Prediction"
      title="Forecasts"
      lede="PV and load forecasts as separate targets, scored per horizon against named naïve baselines, with a learned model admitted only when it measurably improves on them."
      phase="Phase 07"
      refs={['FR-FCT-01', 'FR-FCT-02', 'FR-FCT-05']}
      items={[
        {
          title: 'Baselines before models',
          detail:
            'Persistence, time-of-day and weather-driven baselines are built and scored first. Only then is a learned model trained, and only if it improves on the relevant baseline.',
          refs: ['FR-FCT-02', 'FR-FCT-04'],
        },
        {
          title: 'Per-horizon scoring',
          detail:
            'MAE and RMSE with sample counts, and MAPE only for windows whose observed mean is at least 10% of the series mean. A negative result is reported, not hidden.',
          refs: ['FR-FCT-05'],
        },
        {
          title: 'One pinned artifact',
          detail:
            'A single browser inference runtime loads the exact model that was evaluated, with its feature schema and seed versioned alongside it. Silent substitution is prohibited.',
          refs: ['FR-FCT-06', 'DEC-010'],
        },
      ]}
    />
  );
}
