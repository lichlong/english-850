const {loadData,makeLookup,wordsIn,unitText}=require('./lib/vocab');
const V=loadData();const lk=makeLookup(V);
let before=new Set();
V.UNITS.slice(0,8).forEach((u,i)=>{
  const w=[...wordsIn(unitText(u),lk)];
  const fresh=w.filter(x=>!before.has(x));
  w.forEach(x=>before.add(x));
  console.log(u.id+' '+u.mnemonic+' 新词 '+fresh.length);
  if(i<3) console.log('     '+fresh.join(' '));
});
