const {loadData,makeLookup,wordsIn,unitText}=require('./lib/vocab');
const V=loadData();const lk=makeLookup(V);
const FUNC=new Set("the a an and or but if when while than then that this these those there here where how why what who whom whose which i you he she it we they me him her us them my your his its our their mine yours is am are was were be been being do does did done have has had will would shall should can could may might must not no nor so as at by for from in into of off on out over to up with about after before again ever never always only very much more most some any all both each other another such own same too also just even still yet once".split(/\s+/));
let before=new Set(); let rows=[];
V.UNITS.slice(0,8).forEach(u=>{
  const w=[...wordsIn(unitText(u),lk)];
  const fresh=w.filter(x=>!before.has(x));
  w.forEach(x=>before.add(x));
  const content=fresh.filter(x=>!FUNC.has(x));
  rows.push([u.id,fresh.length,content.length,'['+content.join(' ')+']']);
});
rows.forEach(r=>console.log(r[0]+' 新词(总) '+r[1]+' · 实词 '+r[2]+' '+r[3]));
const sum=rows.reduce((a,r)=>a+r[2],0);
console.log('实词合计 '+sum+' / 8 课，平均 '+(sum/8).toFixed(1));
