/* Compiles first-party offline airport names from OurAirports Public Domain.
   https://ourairports.com/data/ -- contains no passenger data. */
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const SOURCE='https://raw.githubusercontent.com/davidmegginson/ourairports-data/master/airports.csv';
const OUTPUT=resolve(import.meta.dirname,'../site/assets/data/airport-names.js');
function csvRecords(input){
  let field='',row=[],quoted=false;
  const records=[];
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(c==='"'){
      if(quoted&&input[i+1]==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(c===','&&!quoted){row.push(field);field='';}
    else if((c==='\r'||c==='\n')&&!quoted){
      if(c==='\r'&&input[i+1]==='\n')i++;
      row.push(field);field='';
      if(row.length>1)records.push(row);
      row=[];
    }else field+=c;
  }
  if(quoted)throw new Error('CSV quotation error');
  if(field||row.length){row.push(field);records.push(row);}
  return records;
}
export function compile(csv){
  const rows=csvRecords(csv);
  const head=rows.shift();
  const field=(name)=>{const i=head.indexOf(name);if(i<0)throw new Error('Missing CSV header '+name);return i;};
  const iata=field('iata_code'),name=field('name'),type=field('type'),scheduled=field('scheduled_service');
  const weights={large_airport:4,medium_airport:3,small_airport:2,seaplane_base:1,heliport:1,closed:-20};
  const entries=new Map();
  for(const row of rows){
    const code=(row[iata]||'').trim().toUpperCase(),airport=(row[name]||'').trim();
    if(!/^[A-Z]{3}$/.test(code)||!airport)continue;
    const rank=(row[scheduled]==='yes'?10:0)+(weights[row[type]]??0);
    if(!entries.has(code)||rank>entries.get(code).rank)entries.set(code,{name:airport,rank});
  }
  return Object.fromEntries([...entries.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>[k,v.name]));
}
async function main(){
  const reply=await fetch(SOURCE,{signal:AbortSignal.timeout(60000)});
  if(!reply.ok)throw new Error('OurAirports download '+reply.status);
  const names=compile(await reply.text());
  const count=Object.keys(names).length;
  if(count<6500||count>17576)throw Error('Invalid airport count '+count);
  for(const code of ['NBO','KUL','DOH','TPE','BKK','AKL'])if(!names[code])throw Error('Airport missing '+code);
  const literal=JSON.stringify(names).replaceAll('<','\\u003c');
  const output='/* OurAirports Public Domain, https://ourairports.com/data/ */\n'+
    '(function(global){global.AirportNameIndex=Object.freeze('+literal+');})(typeof window!=="undefined"?window:globalThis);\n';
  await mkdir(resolve(import.meta.dirname,'../site/assets/data'),{recursive:true});
  await writeFile(OUTPUT,output,'utf8');
  console.log('PASS generated airport index '+count+' codes, '+output.length+' characters');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname))await main();
