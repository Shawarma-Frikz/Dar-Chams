export type PrimaryRoute = {
  href: string;
  label: string;
  title: string;
  summary: string;
  phase: string;
  refs: readonly string[];
};

// One source for the navigation and the overview index, so a route cannot be
// advertised in one place and missing from the other. Only built routes are
// listed here; unbuilt screens are named as planned work, not as links.
export const PRIMARY_ROUTES: readonly PrimaryRoute[] = [
  {
    href: '/',
    label: 'Overview',
    title: 'Overview',
    summary:
      'Current generation, household load, battery reserve, grid state and the next recommended action, read from one snapshot.',
    phase: 'Phase 09',
    refs: ['FR-UX-01', 'FR-UX-02'],
  },
  {
    href: '/twin',
    label: 'System twin',
    title: 'System twin',
    summary:
      'A 2D system map and a low-poly 3D cutaway of the same installation. The 2D map is authoritative and carries every critical state and control.',
    phase: 'Phase 08',
    refs: ['FR-TWN-01', 'FR-UX-10'],
  },
  {
    href: '/energy',
    label: 'Energy',
    title: 'Energy',
    summary:
      'Interval series for PV, battery, grid and appliances, with each loss term reported separately and the balance closing every step.',
    phase: 'Phase 09',
    refs: ['FR-SIM-04', 'FR-PV-05'],
  },
  {
    href: '/forecasts',
    label: 'Forecasts',
    title: 'Forecasts',
    summary:
      'PV and load forecasts scored against named naïve baselines per horizon, with a retained learned model only if it beats them.',
    phase: 'Phase 07',
    refs: ['FR-FCT-02', 'FR-FCT-05'],
  },
  {
    href: '/analytics',
    label: 'Analytics',
    title: 'Analytics',
    summary:
      'Paired baseline-versus-scheduler runs, the perfect-foresight upper bound, and anomaly records with their evidence windows.',
    phase: 'Phase 07',
    refs: ['FR-EMS-09', 'FR-ANM-03'],
  },
  {
    href: '/scenarios',
    label: 'Scenarios',
    title: 'Scenarios',
    summary:
      'The scenario file, its validated parameters, and the run manifest that makes a result reproducible and citable.',
    phase: 'Phase 02',
    refs: ['FR-SIM-10', 'NFR-03'],
  },
];
