import { getRisk } from "@valrify/domain";
export function RiskBadge({count}:{count:number}){const risk=getRisk(count);return <div className={`risk risk-${risk.level.toLowerCase()}`}><span>{risk.label}</span><p>{risk.explanation}</p></div>}
