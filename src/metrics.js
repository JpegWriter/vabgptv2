const metrics = {
  startTime: Date.now(),
  counts: {},
  durations: {},
  errors: {},
  tokens: { prompt: 0, completion: 0 }
};

export function mark(stage, ms){
  metrics.counts[stage] = (metrics.counts[stage]||0)+1;
  metrics.durations[stage] = (metrics.durations[stage]||0)+ms;
}
export function markError(stage){
  metrics.errors[stage] = (metrics.errors[stage]||0)+1;
}
export function addTokens({ prompt=0, completion=0 }){
  metrics.tokens.prompt += prompt; metrics.tokens.completion += completion;
}
export function snapshot(){
  const uptime = Math.round((Date.now()-metrics.startTime)/1000);
  const avg = {};
  for (const k of Object.keys(metrics.durations)){
    const c = metrics.counts[k]||1;
    avg[k] = Number((metrics.durations[k]/c).toFixed(1));
  }
  return { uptime_s: uptime, counts: metrics.counts, avg_ms: avg, errors: metrics.errors, tokens: metrics.tokens };
}
export function timer(stage){
  const t0 = Date.now();
  return () => mark(stage, Date.now()-t0);
}
