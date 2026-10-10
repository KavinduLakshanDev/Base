const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node check_balance.cjs <file-path>');
  process.exit(1);
}

const resolved = path.resolve(filePath);
if (resolved !== path.normalize(resolved)) {
  console.error('Invalid file path');
  process.exit(1);
}

const s = fs.readFileSync(resolved, 'utf8');
const stacks = { '(':0, '{':0, '[':0 };
for(let i=0;i<s.length;i++){
  const ch = s[i];
  if(ch==='(') stacks['(']++;
  if(ch===')') stacks['(']--;
  if(ch==='{') stacks['{']++;
  if(ch==='}') stacks['{']--;
  if(ch==='[') stacks['[']++;
  if(ch===']') stacks['[']--;
}
console.log('Parens:', stacks);
const openTags = (s.match(/<([A-Za-z0-9_\-]+)/g) || []).map(x=>x.replace(/^</,''));
const closeTags = (s.match(/<\/([A-Za-z0-9_\-]+)/g) || []).map(x=>x.replace(/^<\//,''));
const tagCounts = {};
openTags.forEach(t=>tagCounts[t]=(tagCounts[t]||0)+1);
closeTags.forEach(t=>tagCounts[t]=(tagCounts[t]||0)-1);
console.log('Tag balance sample:', Object.entries(tagCounts).filter(([k,v])=>v!==0));
