export function ArrowIcon({ direction = "diagonal" }: { direction?: "diagonal" | "right" | "left" }) {
  const paths = { diagonal: "M7 17 17 7M7 7h10v10", right: "M4 12h16m-7-7 7 7-7 7", left: "M20 12H4m7-7-7 7 7 7" };
  return <svg aria-hidden="true" focusable="false" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "-0.125em", flexShrink: 0 }}><path d={paths[direction]}/></svg>;
}
