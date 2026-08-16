export type WeeklySlot={day_of_week:number;minute_of_day:number};
const weekdayIndex:Record<string,number>={Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6};

function slotForInstant(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
  const get=(type:string)=>parts.find(p=>p.type===type)?.value??'';
  const day=weekdayIndex[get('weekday')];
  const hour=Number(get('hour')); const minute=Number(get('minute'));
  return `${day}:${hour*60+Math.floor(minute/30)*30}`;
}

export function weeklyScheduleCovers(start:Date,end:Date|null,timeZone:string,slots:WeeklySlot[]){
  const selected=new Set(slots.map(s=>`${s.day_of_week}:${s.minute_of_day}`));
  const effectiveEnd=end&&end>start?end:new Date(start.getTime()+30*60*1000);
  // Sample at least every 15 minutes and just before the end so partial 30-minute
  // blocks are also required. This handles parties that start at :15/:45 cleanly.
  for(let t=start.getTime();t<effectiveEnd.getTime();t+=15*60*1000){if(!selected.has(slotForInstant(new Date(t),timeZone)))return false;}
  if(effectiveEnd.getTime()-start.getTime()>1){const last=new Date(effectiveEnd.getTime()-1);if(!selected.has(slotForInstant(last,timeZone)))return false;}
  return true;
}
