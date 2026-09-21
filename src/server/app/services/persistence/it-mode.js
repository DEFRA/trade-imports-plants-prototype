const mode = process.env.HIGH_RISK_PLANTS_IT ?? 'stubs'
export const runsIt = (kind) => mode === kind || mode === 'all'
