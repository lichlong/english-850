const {loadData,makeLookup,wordsIn,unitText,isFunctionWord}=require('./lib/vocab');
const V=loadData();const lk=makeLookup(V);
let before=new Set(); let sum=0;
V.UNITS.slice(0,8).forEach(u=>{
  const w=[...wordsIn(unitText(u),lk)];
  const all=w.filter(x=>!before.has(x));
  all.forEach(x=>before.add(x));
  const fresh=all.filter(x=>!isFunctionWord(x));
  sum+=fresh.length;
  console.log(u.id+' '+fresh.length+' : '+fresh.join(' '));
});
console.log('合计 '+sum);
const seen=new Set();V.UNITS.forEach(u=>wordsIn(unitText(u),lk).forEach(w=>seen.add(w)));
console.log('未覆盖:',Object.keys(V.WORDS).filter(w=>!seen.has(w)).join(' ')||'（无）');
