const SIM={SPEED:1,USE:0.5,RESERVE:10,SERVICE:10,TOL:5,DT:0.5,TMAX:600,CHG_LOW:40,CHG_FULL:95,CHG_RATE:1};
const SCEN=[
 {id:'s1',name:'งานเดียว หุ่นว่าง 3 ตัว',short:'งานเดียว',
  desc:'มีงานไปพื้นที่ A งานเดียว หุ่น R1, R2, R3 รุ่นเดียวกันว่างพร้อมกัน R1 กับ R2 อยู่ห่างพอ ๆ กัน (40 กับ 42 ม.)',
  look:'FIFO และกฎทีละขั้นเลือก R1 เพราะ ETA ต่างกันไม่เกิน 5 วินาทีจึงไปตัดสินด้วยแบต แต่ Cost function เลือก R2 เพราะ R2 ว่างนานที่สุด ลองลดน้ำหนักเวลาว่างเหลือ 0 แล้วดูว่าผลเปลี่ยนไหม',
  robots:[{id:'R1',x:6,y:12,soc:80,idle:120},{id:'R2',x:6,y:10,soc:65,idle:600},{id:'R3',x:2,y:0,soc:90,idle:300}],
  tasks:[{id:'T1',area:'A',at:0,pri:1}]},
 {id:'s2',name:'สองงานพร้อมกัน',short:'สองงาน',
  desc:'งาน T1 ไปพื้นที่ C และ T2 ไปพื้นที่ A เข้ามาพร้อมกัน R1 อยู่ใกล้ทั้งสองจุด ส่วน R2 อยู่ใกล้แค่ C',
  look:'วิธีที่เลือกทีละงาน (FIFO, กฎ, Cost) ให้ R1 คว้า T1 ที่ใกล้สุดไปก่อน R2 จึงต้องวิ่งไกล 40 ม. ส่วน Hungarian จับคู่ทั้งชุดพร้อมกัน ระยะรวมและเวลารอสูงสุดจึงต่ำกว่า',
  robots:[{id:'R1',x:26,y:12,soc:80,idle:60},{id:'R2',x:6,y:12,soc:80,idle:60}],
  tasks:[{id:'T1',area:'C',at:0,pri:1},{id:'T2',area:'A',at:0,pri:1}]},
 {id:'s3',name:'หุ่นที่ใกล้สุดแบตต่ำ',short:'แบตต่ำ',
  desc:'งานไปพื้นที่ A หุ่นที่ใกล้ที่สุดคือ R1 (18 ม.) แต่เหลือแบต 8% ต้องใช้ 9% แค่ไปให้ถึง',
  look:'FIFO + ใกล้สุดไม่ได้ตรวจแบต R1 จึงแบตหมดกลางทางและงานล้มเหลว อีก 3 วิธีใช้ Hard constraint (แบตต้องพอไปทำงานแล้วกลับแท่นชาร์จ โดยยังเหลือ 10%) จึงข้าม R1 ไปเลือก R3',
  robots:[{id:'R1',x:20,y:20,soc:8,idle:60},{id:'R2',x:6,y:12,soc:90,idle:60},{id:'R3',x:30,y:6,soc:60,idle:60}],
  tasks:[{id:'T1',area:'A',at:0,pri:1}]},
 {id:'s4',name:'งานด่วนแทรกคิว',short:'งานด่วน',
  desc:'หุ่น 2 ตัวรับงาน T1, T2 ไปแล้ว ระหว่างนั้นมี T3 (ปกติ) เข้ามาที่วินาที 2 และ T4 (ด่วน) เข้ามาที่วินาที 4',
  look:'FIFO แจก T3 ก่อนเพราะมาก่อน งานด่วน T4 จึงรอนาน ส่วนวิธีที่เรียงคิวตาม Priority แจก T4 ก่อนทันทีที่มีหุ่นว่าง ดูคอลัมน์ "รองานด่วน"',
  robots:[{id:'R1',x:2,y:20,soc:90,idle:60},{id:'R2',x:2,y:4,soc:90,idle:60}],
  tasks:[{id:'T1',area:'A',at:0,pri:1},{id:'T2',area:'B',at:0,pri:1},{id:'T3',area:'C',at:2,pri:1},{id:'T4',area:'D',at:4,pri:2}]}
];

const rooms=[101,102,103,104,105,106,107,108,109,110,111,112];
const MAPS={
 plain:{id:'plain',name:'พื้นที่โล่ง',short:'โล่ง',w:40,h:24,gap:15,walls:[],zones:[],
  st:{A:{x:38,y:20,n:'จุด A'},B:{x:38,y:4,n:'จุด B'},C:{x:20,y:12,n:'จุด C'},D:{x:2,y:20,n:'จุด D'}},
  ch:[{x:2,y:2},{x:38,y:12},{x:20,y:22},{x:20,y:2},{x:2,y:12},{x:30,y:22}],flows:null,
  desc:'พื้นที่โล่ง 40 × 24 ม. ไม่มีสิ่งกีดขวาง งานเป็นแบบไปจุดเดียว ใช้กับสถานการณ์ 1–4',look:'ใช้เป็นฐานเทียบกับแผนที่สถานที่จริง'},
 retail:{id:'retail',name:'ร้านค้า / ซูเปอร์มาร์เก็ต',short:'ร้านค้า',w:36,h:22,gap:40,
  walls:[[6,4,2,11],[12,4,2,11],[18,4,2,11],[24,4,2,11],[29,0,1,8],[29,12,1,10],[4,18,3,1],[11,18,3,1]],
  zones:[{x:33,y:9,t:'คลังหลังร้าน'},{x:16,y:2,t:'ชั้นวางสินค้า'},{x:4.5,y:21.6,t:'แคชเชียร์'}],
  st:{ST:{x:34,y:4,n:'คลังหลังร้าน'},L1:{x:10,y:9,n:'ช่องทางเดิน 1'},L2:{x:16,y:9,n:'ช่องทางเดิน 2'},L3:{x:22,y:9,n:'ช่องทางเดิน 3'},L4:{x:27,y:9,n:'ช่องทางเดิน 4'},K:{x:9,y:20,n:'จุดแคชเชียร์'}},
  ch:[{x:34,y:20},{x:2,y:2},{x:20,y:20},{x:34,y:12},{x:2,y:11},{x:27,y:20}],
  flows:[['ST','L1',3,'เติมสินค้า'],['ST','L2',3,'เติมสินค้า'],['ST','L3',3,'เติมสินค้า'],['ST','L4',3,'เติมสินค้า'],['K','ST',2,'เก็บตะกร้า/ของคืน'],['L1',null,1,'สแกนชั้นวาง'],['L3',null,1,'สแกนชั้นวาง']],
  desc:'ร้านขนาด 36 × 22 ม. ชั้นวาง 4 แถว ผนังกั้นคลังหลังร้านมีช่องประตูกลาง งานส่วนใหญ่คือขนสินค้าจากคลังไปเติมชั้นวาง',
  look:'ทุกงานเติมสินค้าต้องผ่านประตูคลังช่องเดียว ลองเพิ่มหุ่นแล้วดูว่าเวลารอลดลงช้ากว่าพื้นที่โล่งหรือไม่'},
 mall:{id:'mall',name:'ห้างสรรพสินค้า',short:'ห้าง',w:48,h:28,gap:40,
  walls:[[2,0,8,5],[12,0,8,5],[28,0,8,5],[38,0,8,5],[2,23,8,5],[12,23,8,5],[28,23,8,5],[38,23,8,5],[18,10,12,8]],
  zones:[{x:24,y:14.4,t:'โถงกลาง'},{x:6,y:2.6,t:'ร้าน'},{x:42,y:25.6,t:'ร้าน'}],
  st:{S1:{x:6,y:6,n:'ร้าน 1'},S2:{x:16,y:6,n:'ร้าน 2'},S3:{x:32,y:6,n:'ร้าน 3'},S4:{x:42,y:6,n:'ร้าน 4'},S5:{x:6,y:22,n:'ร้าน 5'},S6:{x:16,y:22,n:'ร้าน 6'},S7:{x:32,y:22,n:'ร้าน 7'},S8:{x:42,y:22,n:'ร้าน 8'},
   DK:{x:47,y:14,n:'ท่าขนสินค้า'},IN:{x:14,y:14,n:'จุดประชาสัมพันธ์'},FC:{x:24,y:2,n:'ศูนย์อาหาร'}},
  ch:[{x:47,y:8},{x:1,y:14},{x:24,y:27},{x:47,y:20},{x:21,y:1},{x:1,y:8}],
  flows:[['DK','S1',2,'ส่งสินค้า'],['DK','S2',2,'ส่งสินค้า'],['DK','S3',2,'ส่งสินค้า'],['DK','S4',2,'ส่งสินค้า'],['DK','S5',2,'ส่งสินค้า'],['DK','S6',2,'ส่งสินค้า'],['DK','S7',2,'ส่งสินค้า'],['DK','S8',2,'ส่งสินค้า'],
   ['S2','DK',1,'ขยะ/ของคืน'],['S7','DK',1,'ขยะ/ของคืน'],['IN','S1',1,'นำทางลูกค้า'],['IN','S4',1,'นำทางลูกค้า'],['IN','S5',1,'นำทางลูกค้า'],['IN','S8',1,'นำทางลูกค้า'],['FC',null,2,'ทำความสะอาด']],
  desc:'ห้าง 48 × 28 ม. ร้านเรียงสองฝั่ง มีโถงกลางที่หุ่นต้องวิ่งอ้อม ท่าขนสินค้าอยู่ทางขวา งานหลักคือส่งสินค้าเข้าร้าน รองลงมาคือนำทางลูกค้าจากจุดประชาสัมพันธ์',
  look:'ร้านฝั่งซ้าย (1, 2, 5, 6) อยู่ไกลท่าขนสินค้า งานไปร้านเหล่านี้จึงใช้เวลานาน ดูว่าหุ่นต้องวิ่งอ้อมโถงกลางแค่ไหน'},
 hotel:{id:'hotel',name:'โรงแรม (1 ชั้น)',short:'โรงแรม',w:44,h:24,gap:40,
  walls:[0,1,2,3,4,5].flatMap(i=>[[7+i*6,0,5,9],[7+i*6,15,5,9]]),
  zones:[{x:24,y:12.4,t:'ทางเดิน'}],
  st:Object.assign({KT:{x:2,y:3,n:'ครัว'},LD:{x:2,y:21,n:'ห้องซักรีด'},FD:{x:3,y:12,n:'ล็อบบี้/เคาน์เตอร์'},LF:{x:43,y:12,n:'ลิฟต์ (ไปชั้นอื่น)'}},
   Object.fromEntries(rooms.map((n,i)=>[String(n),{x:9+(i%6)*6,y:i<6?10:14,n:'ห้อง '+n}]))),
  ch:[{x:0,y:8},{x:44,y:8},{x:0,y:16},{x:44,y:16},{x:5,y:0},{x:5,y:24}],
  flows:[...rooms.map(n=>['KT',String(n),1,'รูมเซอร์วิส']),...rooms.map(n=>['FD',String(n),1,'ส่งของ/สัมภาระ']),...rooms.filter((n,i)=>i%2===0).map(n=>[String(n),'LD',1,'เก็บผ้าไปซัก']),['FD','LF',2,'ส่งของไปชั้นอื่น']],
  desc:'ชั้นห้องพัก 44 × 24 ม. ห้อง 12 ห้องอยู่สองฝั่งของทางเดินกลาง ครัว ซักรีด และล็อบบี้อยู่ด้านซ้าย ลิฟต์อยู่ปลายทางเดินด้านขวา แบบจำลองนี้มีชั้นเดียว ยังไม่ได้จำลองการรอลิฟต์',
  look:'หุ่นทุกตัวต้องใช้ทางเดินเส้นเดียว ห้องที่อยู่ปลายทางเดิน (106, 112) จึงไกลจากครัวที่สุด แบบจำลองนี้ยังไม่ได้ห้ามหุ่นวิ่งสวนกันในทางแคบ'},
 wh:{id:'wh',name:'โกดังสินค้า',short:'โกดัง',w:48,h:28,gap:60,
  walls:[[6,3,32,2],[6,8,32,2],[6,13,32,2],[6,18,32,2],[6,23,32,2]],
  zones:[{x:22,y:1.6,t:'ชั้นวางสินค้า (Rack)'},{x:44,y:14.4,t:'ทางขนถ่าย'}],
  st:{IB:{x:47,y:2,n:'ท่ารับสินค้าเข้า'},PK:{x:47,y:26,n:'จุดแพ็ก/ส่งออก'},P1:{x:14,y:6,n:'จุดหยิบ 1'},P2:{x:30,y:6,n:'จุดหยิบ 2'},P3:{x:14,y:11,n:'จุดหยิบ 3'},P4:{x:30,y:11,n:'จุดหยิบ 4'},
   P5:{x:14,y:16,n:'จุดหยิบ 5'},P6:{x:30,y:16,n:'จุดหยิบ 6'},P7:{x:14,y:21,n:'จุดหยิบ 7'},P8:{x:30,y:21,n:'จุดหยิบ 8'}},
  ch:[{x:1,y:1},{x:1,y:27},{x:1,y:14},{x:44,y:14},{x:20,y:27},{x:20,y:0}],
  flows:[...[1,2,3,4,5,6,7,8].map(i=>['IB','P'+i,1,'จัดเก็บเข้าชั้น']),...[1,2,3,4,5,6,7,8].map(i=>['P'+i,'PK',2,'หยิบไปแพ็ก'])],
  desc:'โกดัง 48 × 28 ม. ชั้นวาง 5 แถวยาว 32 ม. ทางเดินระหว่างชั้นกว้าง 2 ม. ทางขนถ่ายอยู่ด้านขวา งาน 2 ใน 3 คือหยิบสินค้าไปจุดแพ็ก ที่เหลือคือจัดเก็บสินค้าเข้าชั้น',
  look:'จุดหยิบฝั่งซ้าย (1, 3, 5, 7) อยู่ลึกเข้าไปในแถวชั้นวาง เส้นทางยาวกว่าฝั่งขวาเกือบเท่าตัว ลองเทียบกับกรณีย้ายสินค้าขายดีมาไว้ฝั่งขวา'},
 fac:{id:'fac',name:'โรงงานผลิต',short:'โรงงาน',w:48,h:28,gap:30,
  walls:[[10,4,26,3],[10,12,26,3],[10,20,26,3],[40,0,1,10],[40,18,1,10]],
  zones:[{x:23,y:5.9,t:'สายการผลิต 1'},{x:23,y:13.9,t:'สายการผลิต 2'},{x:23,y:21.9,t:'สายการผลิต 3'},{x:44.5,y:5,t:'คลังสินค้า'},{x:4,y:17.6,t:'วัตถุดิบ'}],
  st:{RM:{x:2,y:14,n:'คลังวัตถุดิบ'},FG:{x:46,y:14,n:'คลังสินค้าสำเร็จรูป'},I1:{x:9,y:5,n:'ต้นสาย 1'},I2:{x:9,y:13,n:'ต้นสาย 2'},I3:{x:9,y:21,n:'ต้นสาย 3'},
   O1:{x:37,y:5,n:'ปลายสาย 1'},O2:{x:37,y:13,n:'ปลายสาย 2'},O3:{x:37,y:21,n:'ปลายสาย 3'},QC:{x:24,y:26,n:'ห้องตรวจคุณภาพ'}},
  ch:[{x:2,y:2},{x:2,y:26},{x:24,y:1},{x:20,y:27},{x:45,y:2},{x:24,y:9}],
  flows:[['RM','I1',3,'ส่งวัตถุดิบเข้าสาย'],['RM','I2',3,'ส่งวัตถุดิบเข้าสาย'],['RM','I3',3,'ส่งวัตถุดิบเข้าสาย'],['O1','FG',3,'ส่งสินค้าเข้าคลัง'],['O2','FG',3,'ส่งสินค้าเข้าคลัง'],['O3','FG',3,'ส่งสินค้าเข้าคลัง'],['O1','QC',1,'ส่งตัวอย่างตรวจ'],['O2','QC',1,'ส่งตัวอย่างตรวจ'],['O3','QC',1,'ส่งตัวอย่างตรวจ']],
  desc:'โรงงาน 48 × 28 ม. สายการผลิต 3 สายยาว 26 ม. คลังวัตถุดิบอยู่ซ้าย คลังสินค้าสำเร็จรูปอยู่ขวาหลังผนังที่มีประตูกลาง ห้องตรวจคุณภาพอยู่ด้านล่าง',
  look:'งานแบ่งเป็นสองฝั่งชัดเจน ฝั่งซ้ายส่งวัตถุดิบเข้าต้นสาย ฝั่งขวาขนสินค้าจากปลายสาย ดูว่าหุ่นต้องวิ่งกลับข้ามโรงงานบ่อยแค่ไหน'}
};
const AREAS=MAPS.plain.st,CHS=MAPS.plain.ch;
const NB=[[1,0],[-1,0],[0,1],[0,-1]];
const idx=(m,x,y)=>y*(m.w+1)+x;
function prep(m){if(m._free)return;const N=(m.w+1)*(m.h+1);m._free=new Uint8Array(N);m._f={};
 for(let y=0;y<=m.h;y++)for(let x=0;x<=m.w;x++){let ok=1;for(const [wx,wy,ww,wh] of m.walls)if(x>=wx&&x<=wx+ww&&y>=wy&&y<=wy+wh){ok=0;break;}m._free[idx(m,x,y)]=ok;}}
function bfs(m,p){prep(m);const D=new Int32Array((m.w+1)*(m.h+1)).fill(-1),q=[p.x,p.y];D[idx(m,p.x,p.y)]=0;let h=0;
 while(h<q.length){const x=q[h++],y=q[h++],d=D[idx(m,x,y)];for(const [dx,dy] of NB){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>m.w||ny>m.h)continue;const j=idx(m,nx,ny);if(!m._free[j]||D[j]>=0)continue;D[j]=d+1;q.push(nx,ny);}}
 return D;}
function fieldOf(m,key){prep(m);if(!m._f[key])m._f[key]=bfs(m,key.startsWith('CH')?m.ch[+key.slice(2)]:m.st[key]);return m._f[key];}
function dist(m,key,p){const v=fieldOf(m,key)[idx(m,p.x,p.y)];return v<0?Infinity:v;}
function isFree(m,x,y){prep(m);return x>=0&&y>=0&&x<=m.w&&y<=m.h&&m._free[idx(m,x,y)]===1;}
const STRAT=[{id:'fifo',name:'FIFO + ใกล้สุด'},{id:'rules',name:'กฎทีละขั้น'},{id:'cost',name:'Cost function'},{id:'hung',name:'Hungarian'}];
const f3=v=>v.toFixed(3);
function newSim(sc,strat,w,opt){
 opt=opt||{};const map=MAPS[sc.map||'plain'];prep(map);
 const chs=map.ch.slice(0,opt.chargers||1).map((p,i)=>({x:p.x,y:p.y,key:'CH'+i,busy:null,q:[],tU:0}));
 const chF=new Float64Array((map.w+1)*(map.h+1)).fill(Infinity);for(const c of chs){const F=fieldOf(map,c.key);for(let j=0;j<F.length;j++)if(F[j]>=0&&F[j]<chF[j])chF[j]=F[j];}
 return {sc,strat,map,chF,w:w||[.6,.3,.1],t:0,done:false,log:[],charge:!!opt.charge,use:opt.use||SIM.USE,chs,tmax:opt.tmax||SIM.TMAX,quiet:!!opt.quiet,chq:[],charges:0,
  robots:sc.robots.map(r=>({id:r.id,x:r.x,y:r.y,soc:r.soc,idle0:r.idle,idleSince:0,state:'idle',task:null,dist:0,until:0,tB:0,tC:0,tI:0})),
  tasks:sc.tasks.map(k=>({...k,state:'future',robot:null,startT:null,doneT:null}))};
}
function eta(s,r,k){return dist(s.map,k.area,r)/SIM.SPEED}
function nearCh(s,p){return s.chF[idx(s.map,p.x,p.y)]}
function legLen(s,k){return k.to?dist(s.map,k.to,s.map.st[k.area]):0}
function feasible(s,r,k){const last=s.map.st[k.to||k.area];return r.soc-(dist(s.map,k.area,r)+legLen(s,k)+nearCh(s,last))*s.use>=SIM.RESERVE}
function idleFor(s,r){return r.idle0+(s.t-r.idleSince)}
function byQueue(s,list){
 if(s.strat==='fifo')return list.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 return list.sort((a,b)=>b.pri-a.pri||a.at-b.at||a.id.localeCompare(b.id));
}
function ruleBetter(s,a,b,k){
 const ea=eta(s,a,k),eb=eta(s,b,k);
 if(Math.abs(ea-eb)>SIM.TOL)return ea<eb?[true,'ETA']:[false,'ETA'];
 if(a.soc!==b.soc)return [a.soc>b.soc,'แบต'];
 const ia=idleFor(s,a),ib=idleFor(s,b);
 if(ia!==ib)return [ia>ib,'เวลาว่าง'];
 return [a.id<b.id,'รหัสหุ่น'];
}
function costOf(s,cands,k){
 const mE=Math.max(...cands.map(r=>eta(s,r,k)))||1,mI=Math.max(...cands.map(r=>idleFor(s,r)))||1,w=s.w;
 return cands.map(r=>({r,c:w[0]*eta(s,r,k)/mE+w[1]*(1-r.soc/100)+w[2]*(1-idleFor(s,r)/mI)}));
}
function dispatch(s){
 const pend=byQueue(s,s.tasks.filter(k=>k.state==='waiting'));
 let idle=s.robots.filter(r=>r.state==='idle');
 const out=[];
 if(!pend.length||!idle.length)return out;
 if(s.strat==='hung'){
  const ks=pend.filter(k=>idle.some(r=>feasible(s,r,k))).slice(0,idle.length);let best={c:Infinity,a:[]};
  const rec=(i,used,c,a)=>{
   if(c>=best.c)return;
   if(i===ks.length){best={c,a:a.slice()};return;}
   let any=false;
   for(const r of idle){if(used.has(r.id)||!feasible(s,r,ks[i]))continue;any=true;used.add(r.id);a.push([ks[i],r]);rec(i+1,used,c+eta(s,r,ks[i]),a);a.pop();used.delete(r.id);}
   rec(i+1,used,c+1e6,a);
  };
  rec(0,new Set(),0,[]);
  for(const [k,r] of best.a)out.push([k,r,'จับคู่ทั้งชุด ETA รวม '+best.a.reduce((x,[kk,rr])=>x+eta(s,rr,kk),0)+' วิ']);
  return out;
 }
 for(const k of pend){
  let c=s.strat==='fifo'?idle.slice():idle.filter(r=>feasible(s,r,k));
  if(!c.length)continue;
  let pick,why;
  if(s.strat==='fifo'){
   c.sort((a,b)=>eta(s,a,k)-eta(s,b,k)||a.id.localeCompare(b.id));pick=c[0];why='ใกล้สุด ETA '+eta(s,pick,k)+' วิ';
  }else if(s.strat==='rules'){
   pick=c[0];let stage='มีตัวเดียว';
   for(const r of c.slice(1)){const [b]=ruleBetter(s,r,pick,k);if(b)pick=r;}
   const rest=c.filter(r=>r!==pick);
   if(rest.length){const run=rest.reduce((x,r)=>ruleBetter(s,r,x,k)[0]?r:x);stage='ตัดสินที่เกณฑ์ '+ruleBetter(s,pick,run,k)[1]+' (เทียบ '+run.id+')';}
   why=stage;
  }else{
   const cs=costOf(s,c,k).sort((a,b)=>a.c-b.c||a.r.id.localeCompare(b.r.id));pick=cs[0].r;
   why='cost '+cs.map(x=>x.r.id+' '+f3(x.c)).join(', ');
  }
  out.push([k,pick,why]);idle=idle.filter(r=>r!==pick);
  if(!idle.length)break;
 }
 return out;
}
function advance(s,r,dt){
 const m=s.map,F=fieldOf(m,r.goalKey);let rem=SIM.SPEED*dt;
 while(rem>1e-9){
  if(!r.nxt){const i=idx(m,r.x,r.y);if(F[i]<=0)break;let b=null;
   for(const [dx,dy] of NB){const nx=r.x+dx,ny=r.y+dy;if(nx<0||ny<0||nx>m.w||ny>m.h)continue;if(F[idx(m,nx,ny)]===F[i]-1){b={x:nx,y:ny};break;}}
   if(!b)break;r.nxt=b;}
  const dx=r.nxt.x-r.x,dy=r.nxt.y-r.y,d=Math.min(rem,Math.abs(dx)+Math.abs(dy));
  r.x+=Math.sign(dx)*d;r.y+=Math.sign(dy)*d;rem-=d;r.dist+=d;r.soc-=d*s.use;
  if(Math.abs(r.x-r.nxt.x)<1e-9&&Math.abs(r.y-r.nxt.y)<1e-9){r.x=r.nxt.x;r.y=r.nxt.y;r.nxt=null;}
  if(r.soc<=1e-9){r.soc=0;break;}
 }
}
function pathOf(s,r){
 const m=s.map,F=fieldOf(m,r.goalKey),pts=[[r.x,r.y]];let p=r.nxt?{...r.nxt}:{x:r.x,y:r.y};if(r.nxt)pts.push([p.x,p.y]);
 for(let g=0;g<400;g++){const i=idx(m,p.x,p.y);if(F[i]<=0)break;let b=null;for(const [dx,dy] of NB){const nx=p.x+dx,ny=p.y+dy;if(nx<0||ny<0||nx>m.w||ny>m.h)continue;if(F[idx(m,nx,ny)]===F[i]-1){b={x:nx,y:ny};break;}}if(!b)break;p=b;pts.push([p.x,p.y]);}
 return pts;
}
function L(s,t,m){if(!s.quiet)s.log.push([t,m]);}
function step(s){
 if(s.done)return;
 for(const k of s.tasks)if(k.state==='future'&&k.at<=s.t+1e-9){k.state='waiting';L(s,s.t,k.id+(k.pri>1?' (ด่วน)':'')+' เข้าคิว → '+k.area+(k.to?' ส่งที่ '+k.to:''));}
 const goCharge=(r,why)=>{r.ch=s.chs.map((c,i)=>i).reduce((a,i)=>dist(s.map,s.chs[i].key,r)<dist(s.map,s.chs[a].key,r)?i:a,0);
  r.state='toCharge';r.goal=s.chs[r.ch];r.goalKey=s.chs[r.ch].key;r.nxt=null;L(s,s.t,r.id+' แบต '+r.soc.toFixed(0)+'% ไปชาร์จ · '+why);};
 if(s.charge)for(const r of s.robots)if(r.state==='idle'&&r.soc<SIM.CHG_LOW)goCharge(r,'ต่ำกว่า '+SIM.CHG_LOW+'%');
 for(const [k,r,why] of dispatch(s)){
  k.state='assigned';k.robot=r.id;r.state='moving';r.task=k;r.leg=0;r.goal=s.map.st[k.area];r.goalKey=k.area;r.nxt=null;
  L(s,s.t,k.id+' → '+r.id+' · '+why);
 }
 if(s.charge){const wt=s.tasks.filter(k=>k.state==='waiting');
  if(wt.length)for(const r of s.robots)if(r.state==='idle'&&r.soc<SIM.CHG_FULL&&!wt.some(k=>feasible(s,r,k)))goCharge(r,'แบตไม่พอรับงานที่รออยู่');}
 const t1=s.t+SIM.DT;
 for(const r of s.robots){
  if(r.state==='moving'||r.state==='service')r.tB+=SIM.DT;else if(r.state==='idle')r.tI+=SIM.DT;else if(r.state!=='dead')r.tC+=SIM.DT;
  if(r.state==='moving'||r.state==='toCharge'){
   const g=r.goal;advance(s,r,SIM.DT);
   const at=!r.nxt&&r.x===g.x&&r.y===g.y;
   if(r.soc<=1e-9&&!at){
    if(r.task){r.task.state='failed';L(s,t1,r.id+' แบตหมดกลางทาง · '+r.task.id+' ล้มเหลว');}else L(s,t1,r.id+' แบตหมดก่อนถึงแท่นชาร์จ');
    r.state='dead';r.task=null;
   }else if(at&&r.state==='moving'){r.state='service';r.until=t1+SIM.SERVICE;if(r.leg===0){r.task.state='service';r.task.startT=t1;L(s,t1,r.id+' ถึง '+r.task.area+' · '+r.task.id+' รอ '+(t1-r.task.at)+' วิ');}else L(s,t1,r.id+' ส่ง '+r.task.id+' ถึง '+r.task.to);}
   else if(at){s.charges++;const c=s.chs[r.ch];if(c.busy){r.state='chargeWait';c.q.push(r);L(s,t1,r.id+' รอคิวแท่นชาร์จ');}else{c.busy=r;r.state='charging';L(s,t1,r.id+' เริ่มชาร์จ');}}
  }else if(r.state==='service'&&t1>=r.until-1e-9){
   if(r.task.to&&r.leg===0){r.leg=1;r.state='moving';r.goal=s.map.st[r.task.to];r.goalKey=r.task.to;r.nxt=null;L(s,t1,r.id+' รับ '+r.task.id+' แล้ว กำลังไปส่งที่ '+r.task.to);}
   else{r.task.state='done';r.task.doneT=t1;L(s,t1,r.id+' ทำ '+r.task.id+' เสร็จ');r.task=null;r.state='idle';r.idleSince=t1;r.idle0=0;}
  }else if(r.state==='charging'){
   r.soc=Math.min(SIM.CHG_FULL,r.soc+SIM.CHG_RATE*SIM.DT);
   if(r.soc>=SIM.CHG_FULL){r.state='idle';r.idleSince=t1;r.idle0=0;L(s,t1,r.id+' ชาร์จเต็ม');const c=s.chs[r.ch];c.busy=null;const n=c.q.shift();if(n){c.busy=n;n.state='charging';L(s,t1,n.id+' เริ่มชาร์จ');}}
  }else if(r.state==='chargeWait'){r.waitChg=(r.waitChg||0)+SIM.DT;}
 }
 for(const c of s.chs)if(c.busy)c.tU+=SIM.DT;
 s.t=t1;
 if(s.tasks.every(k=>k.state==='done'||k.state==='failed')||s.t>=s.tmax)s.done=true;
}
function metrics(s){
 const w=s.tasks.filter(k=>k.startT!==null).map(k=>k.startT-k.at);
 const u=s.tasks.filter(k=>k.pri>1&&k.startT!==null).map(k=>k.startT-k.at);
 const ws=w.slice().sort((a,b)=>a-b);
 return {dist:s.robots.reduce((a,r)=>a+r.dist,0),avg:w.length?w.reduce((a,b)=>a+b,0)/w.length:null,max:w.length?Math.max(...w):null,
  p95:ws.length?ws[Math.min(ws.length-1,Math.ceil(ws.length*0.95)-1)]:null,
  urgent:u.length?Math.max(...u):null,urgentAvg:u.length?u.reduce((a,b)=>a+b,0)/u.length:null,
  failed:s.tasks.filter(k=>k.state!=='done').length,end:Math.max(0,...s.tasks.map(k=>k.doneT||0)),
  n:s.tasks.length,charges:s.charges,chUtil:s.chs.reduce((a,c)=>a+c.tU,0)/(s.chs.length*Math.max(s.t,1))*100,busy:(()=>{const T=s.robots.reduce((a,r)=>a+r.tB+r.tC+r.tI,0)||1;return s.robots.reduce((a,r)=>a+r.tB,0)/T*100;})(),chgPct:(()=>{const T=s.robots.reduce((a,r)=>a+r.tB+r.tC+r.tI,0)||1;return s.robots.reduce((a,r)=>a+r.tC,0)/T*100;})(),chgWait:s.robots.reduce((a,r)=>a+(r.waitChg||0),0)};
}
function runAll(sc,strat,w,opt){const s=newSim(sc,strat,w,opt);while(!s.done)step(s);return s;}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function genScen(seed,n,gap,urg,nr,mapId){
 if(mapId&&mapId!=='plain')return genVenue(seed,n,gap,urg,nr,mapId);
 nr=nr||3;const R=rng(seed),R2=rng(seed*7919+17),ar=['A','B','C','D'],robots=[],tasks=[];let t=0;
 const mk=(G,i)=>({id:'R'+(i+1),x:2*Math.floor(G()*21),y:2*Math.floor(G()*13),soc:50+Math.round(G()*50),idle:Math.round(G()*300)});
 for(let i=0;i<3;i++){const r=mk(R,i);if(i<nr)robots.push(r);}
 for(let i=3;i<nr;i++)robots.push(mk(R2,i));
 for(let i=0;i<n;i++){tasks.push({id:'T'+(i+1),area:ar[Math.floor(R()*4)],at:t,pri:R()<urg?2:1});t+=Math.round(-Math.log(1-R())*gap*2)/2;}
 return {id:'mc'+seed,robots,tasks};
}
function genVenue(seed,n,gap,urg,nr,mapId){
 nr=nr||3;const m=MAPS[mapId];prep(m);const R=rng(seed),R2=rng(seed*7919+17),robots=[],tasks=[];let t=0;
 const F0=fieldOf(m,Object.keys(m.st)[0]);
 const mk=(G,i)=>{let x,y,g=0;do{x=Math.floor(G()*(m.w+1));y=Math.floor(G()*(m.h+1));g++;}while((!isFree(m,x,y)||F0[idx(m,x,y)]<0)&&g<500);return {id:'R'+(i+1),x,y,soc:50+Math.round(G()*50),idle:Math.round(G()*300)};};
 for(let i=0;i<3;i++){const r=mk(R,i);if(i<nr)robots.push(r);}
 for(let i=3;i<nr;i++)robots.push(mk(R2,i));
 const tot=m.flows.reduce((a,f)=>a+f[2],0);
 for(let i=0;i<n;i++){let u=R()*tot,f=m.flows[0];for(const x of m.flows){if(u<x[2]){f=x;break;}u-=x[2];}
  const k={id:'T'+(i+1),area:f[0],at:t,pri:R()<urg?2:1,kind:f[3]};if(f[1])k.to=f[1];tasks.push(k);t+=Math.round(-Math.log(1-R())*gap*2)/2;}
 return {id:mapId+seed,map:mapId,robots,tasks};
}
function monteCarlo(o,w){
 const out={};for(const st of STRAT)out[st.id]=[];
 for(let i=0;i<o.runs;i++){const sc=genScen(o.seed+i,o.n,o.gap,o.urg,o.robots,o.map);
  for(const st of STRAT)out[st.id].push(metrics(runAll(sc,st.id,w,{charge:true,quiet:true,use:o.use,chargers:o.chargers,tmax:o.n*o.gap*6+2000})));}
 return out;
}
function summarize(out){
 const res={},ids=Object.keys(out),n=out[ids[0]].length,wins={};ids.forEach(id=>wins[id]=0);
 for(let i=0;i<n;i++){const m=Math.min(...ids.map(id=>out[id][i].avg??Infinity));ids.filter(id=>(out[id][i].avg??Infinity)-m<1e-9).forEach(id=>wins[id]++);}
 for(const id of ids){const a=out[id],mean=f=>{const v=a.map(f).filter(x=>x!==null);return v.length?v.reduce((x,y)=>x+y,0)/v.length:null;};
  const av=a.map(m=>m.avg).filter(x=>x!==null),mu=mean(m=>m.avg),sd=Math.sqrt(av.reduce((x,y)=>x+(y-mu)**2,0)/Math.max(1,av.length-1));
  res[id]={avg:mu,ci:1.96*sd/Math.sqrt(Math.max(1,av.length)),p95:mean(m=>m.p95),urgentAvg:mean(m=>m.urgentAvg),distPer:mean(m=>m.dist/m.n),
   failed:mean(m=>m.failed),charges:mean(m=>m.charges),chgWait:mean(m=>m.chgWait),busy:mean(m=>m.busy),chUtil:mean(m=>m.chUtil),chgPct:mean(m=>m.chgPct),wins:wins[id]};}
 return res;
}
function sweep(o,w,strat,configs){
 return configs.map(([nr,nc])=>{const a=[];
  for(let i=0;i<o.runs;i++){const sc=genScen(o.seed+i,o.n,o.gap,o.urg,nr,o.map);a.push(metrics(runAll(sc,strat,w,{charge:true,quiet:true,use:o.use,chargers:nc,tmax:o.n*o.gap*6+2000})));}
  return {nr,nc,...summarize({x:a}).x};});
}
if(typeof module!=='undefined')module.exports={SIM,AREAS,SCEN,STRAT,MAPS,newSim,step,metrics,runAll,genScen,monteCarlo,summarize,sweep,CHS,dist,isFree,fieldOf,pathOf,prep};
