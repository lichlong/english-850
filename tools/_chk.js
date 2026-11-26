const fs=require('fs');
const {loadData,makeLookup,tokensOf,wordCount,isFunctionWord,wordsIn,unitText}=require('./lib/vocab');
const V=loadData();const lk=makeLookup(V);
const [file,keepStr,unitId]=process.argv.slice(2);
const keep=new Set(keepStr.split(',').filter(Boolean));
// 允许：前面各课已覆盖的词 + 本课保留词 + 功能词
const earlier=new Set();
if(unitId){
  const idx=V.UNITS.findIndex(u=>u.id===unitId);
  for(let i=0;i<Math.max(idx,0);i++) wordsIn(unitText(V.UNITS[i]),lk).forEach(w=>earlier.add(w));
}
const d=JSON.parse(fs.readFileSync(file,'utf8'));
const bad=new Set();
const all=[...d.short,...d.long,...d.passage.paragraphs];
all.forEach(s=>tokensOf(s.en).forEach(t=>{
  const h=lk.lookup(t);
  if(!h){bad.add(t);return;}
  if(h.kind==='word' && !isFunctionWord(h.base) && !keep.has(h.base) && !earlier.has(h.base)) bad.add(t);
  if(['allowed','deviation','contraction','glossary'].indexOf(h.kind)<0 && h.kind!=='word') bad.add(t);
}));
console.log('越界:',[...bad].join(' ')||'（无）');
console.log('短',d.short.map(s=>wordCount(s.en)).join('/'),'长',d.long.map(s=>wordCount(s.en)).join('/'));
const pw=d.passage.paragraphs.reduce((n,p)=>n+wordCount(p.en),0);
console.log('短文',pw,'合计',all.reduce((n,s)=>n+wordCount(s.en),0));
