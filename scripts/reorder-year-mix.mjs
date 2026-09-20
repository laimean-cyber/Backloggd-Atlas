import {writeFileSync} from 'node:fs';
import {page} from '../dist/server/page.js';
let h=page.replace('<option value="year">Year</option>','<option value="mix">Rating share (5 first)</option><option value="year">Year</option>');
h=h.replace("yearSort='year',genreSort", "yearSort='mix',yearListSort='year',yearMixSort='mix',genreSort");
h=h.replace(".sort((a,b)=>yearSort==='count'?", ".sort((a,b)=>yearSort==='mix'?compareYearMix(a,b):yearSort==='count'?");
h=h.replace("  function renderYearMix(years){", `  function yearRatingCounts(year){
    const counts=Array(11).fill(0);year.list.forEach(g=>{const index=Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5?Math.max(0,Math.min(9,Math.round(g.rating*2)-1)):10;counts[index]++});return counts;
  }
  function compareYearMix(a,b){
    const ac=yearRatingCounts(a),bc=yearRatingCounts(b);
    for(let i=9;i>=0;i--){const difference=bc[i]*a.count-ac[i]*b.count;if(difference)return difference}
    return +b.name-+a.name;
  }
  function renderYearMix(years){`);
h=h.replace("((i+1)/2).toFixed(1)+' / 5'", "((i+1)/2).toFixed(1)");
h=h.replace("    $('yearMixLegend').innerHTML=labels.map((label,i)=>", "    const order=[9,8,7,6,5,4,3,2,1,0,10];\n    $('yearMixLegend').innerHTML=order.map(i=>");
h=h.replace("+'></i>'+label", "+'></i>'+labels[i]"); // Legend uses a quoted style attribute; replace exact tail below.
h=h.replace("+'\"></i>'+label+'</span>'", "+'\"></i>'+labels[i]+'</span>'");
const old="const counts=Array(11).fill(0);year.list.forEach(g=>{const index=Number.isFinite(g.rating)&&g.rating>0&&g.rating<=5?Math.max(0,Math.min(9,Math.round(g.rating*2)-1)):10;counts[index]++});";
const start=h.indexOf('  function renderYearMix');h=h.slice(0,start)+h.slice(start).replace(old,'const counts=yearRatingCounts(year);').replace("counts.map((n,i)=>n?'<span class=\"year-mix-segment\"", "order.map(i=>{const n=counts[i];return n?'<span class=\"year-mix-segment\"").replace("+'</b></span>':'').join('')", "+'</b></span>':''}).join('')");
h=h.replace("yearView=view;for(const [button,value]", "yearView=view;yearSort=view==='mix'?yearMixSort:yearListSort;$('yearSort').querySelector('[value=\"mix\"]').hidden=view!=='mix';$('yearSort').value=yearSort;for(const [button,value]");
h=h.replace("yearSort=event.target.value;render()", "yearSort=event.target.value;if(yearView==='mix')yearMixSort=yearSort;else yearListSort=yearSort;render()");
writeFileSync('dist/server/page.js','export const page = '+JSON.stringify(h)+';\n');writeFileSync('dist/index.html',h);writeFileSync('public/index.html',h);
