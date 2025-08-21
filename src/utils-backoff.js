export async function withBackoff(fn, { retries=3, base=500 }={}){
  let lastErr;
  for (let i=0;i<=retries;i++){
    try{
      return await fn();
    }catch(e){
      lastErr = e;
      if (i<retries){
        const wait = base * Math.pow(2,i);
        await new Promise(r=>setTimeout(r, wait));
      }
    }
  }
  throw lastErr;
}
