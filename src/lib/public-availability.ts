export type PublicWeeklySlot={
  day_of_week:number;
  minute_of_day:number;
};

export type PublicAvailabilityRow={
  day:string;
  ranges:string[];
};

const DAY_MS=24*60*60*1000;
const SLOT_MS=30*60*1000;

type WallParts={
  year:number;
  month:number;
  day:number;
  hour:number;
  minute:number;
};

function wallParts(date:Date,timeZone:string):WallParts {
  const parts=new Intl.DateTimeFormat("en-CA",{
    timeZone,
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
    hour:"2-digit",
    minute:"2-digit",
    hourCycle:"h23",
  }).formatToParts(date);

  const value=(type:string)=>
    Number(parts.find(p=>p.type===type)?.value??"0");

  return {
    year:value("year"),
    month:value("month"),
    day:value("day"),
    hour:value("hour"),
    minute:value("minute"),
  };
}

function civilDateStamp(parts:Pick<WallParts,"year"|"month"|"day">) {
  return Date.UTC(parts.year,parts.month-1,parts.day);
}

function addCivilDays(
  parts:Pick<WallParts,"year"|"month"|"day">,
  days:number,
) {
  const date=new Date(civilDateStamp(parts)+days*DAY_MS);

  return {
    year:date.getUTCFullYear(),
    month:date.getUTCMonth()+1,
    day:date.getUTCDate(),
  };
}

function mondayFor(date:Date,timeZone:string) {
  const local=wallParts(date,timeZone);
  const stamp=civilDateStamp(local);
  const jsDay=new Date(stamp).getUTCDay();
  const daysSinceMonday=(jsDay+6)%7;

  return addCivilDays(local,-daysSinceMonday);
}

// Convert a wall-clock time in an IANA timezone to an instant.
// Iterating the offset difference keeps the implementation dependency-free
// while correctly handling ordinary DST offset changes.
function wallTimeToInstant(
  local:{
    year:number;
    month:number;
    day:number;
    hour:number;
    minute:number;
  },
  timeZone:string,
) {
  const wanted=Date.UTC(
    local.year,
    local.month-1,
    local.day,
    local.hour,
    local.minute,
  );

  let guess=wanted;

  for(let i=0;i<4;i++) {
    const seen=wallParts(new Date(guess),timeZone);
    const seenStamp=Date.UTC(
      seen.year,
      seen.month-1,
      seen.day,
      seen.hour,
      seen.minute,
    );

    const difference=wanted-seenStamp;
    if(difference===0)break;

    guess+=difference;
  }

  return new Date(guess);
}

function timeLabel(date:Date,timeZone:string) {
  return new Intl.DateTimeFormat("en-GB",{
    timeZone,
    hour:"2-digit",
    minute:"2-digit",
    hourCycle:"h23",
  }).format(date);
}

function weekdayLabel(date:Date,timeZone:string) {
  return new Intl.DateTimeFormat("en-US",{
    timeZone,
    weekday:"long",
  }).format(date);
}

function nextLocalMidnight(date:Date,timeZone:string) {
  const local=wallParts(date,timeZone);
  const next=addCivilDays(local,1);

  return wallTimeToInstant({
    ...next,
    hour:0,
    minute:0,
  },timeZone);
}

function isLocalMidnight(date:Date,timeZone:string) {
  const local=wallParts(date,timeZone);
  return local.hour===0&&local.minute===0;
}

export function availabilityRangesForViewer(
  slots:PublicWeeklySlot[],
  ownerTimeZone:string,
  viewerTimeZone:string,
  now=new Date(),
):PublicAvailabilityRow[] {
  if(slots.length===0)return [];

  const ownerMonday=mondayFor(now,ownerTimeZone);
  const viewerMonday=mondayFor(now,viewerTimeZone);

  const viewerWeekStart=wallTimeToInstant({
    ...viewerMonday,
    hour:0,
    minute:0,
  },viewerTimeZone);

  const nextViewerMonday=addCivilDays(viewerMonday,7);
  const viewerWeekEnd=wallTimeToInstant({
    ...nextViewerMonday,
    hour:0,
    minute:0,
  },viewerTimeZone);

  const occurrences:{start:Date;end:Date}[]=[];

  // Build adjacent owner-local weeks too, because timezone conversion can
  // move Sunday/Monday slots across the viewer's week boundary.
  for(const weekShift of [-7,0,7]) {
    for(const slot of slots) {
      if(
        !Number.isInteger(slot.day_of_week)||
        slot.day_of_week<0||
        slot.day_of_week>6||
        !Number.isInteger(slot.minute_of_day)||
        slot.minute_of_day<0||
        slot.minute_of_day>=1440
      ) {
        continue;
      }

      const civil=addCivilDays(
        ownerMonday,
        weekShift+slot.day_of_week,
      );

      const start=wallTimeToInstant({
        ...civil,
        hour:Math.floor(slot.minute_of_day/60),
        minute:slot.minute_of_day%60,
      },ownerTimeZone);

      occurrences.push({
        start,
        end:new Date(start.getTime()+SLOT_MS),
      });
    }
  }

  occurrences.sort(
    (a,b)=>a.start.getTime()-b.start.getTime(),
  );

  // Merge adjoining slots into continuous real-time ranges first.
  const merged:{start:Date;end:Date}[]=[];

  for(const occurrence of occurrences) {
    const previous=merged[merged.length-1];

    if(
      previous&&
      occurrence.start.getTime()<=previous.end.getTime()
    ) {
      if(occurrence.end>previous.end) {
        previous.end=occurrence.end;
      }
    } else {
      merged.push({
        start:new Date(occurrence.start),
        end:new Date(occurrence.end),
      });
    }
  }

  const visible=merged
    .filter(range=>
      range.end>viewerWeekStart&&
      range.start<viewerWeekEnd
    )
    .map(range=>({
      start:
        range.start<viewerWeekStart
          ? new Date(viewerWeekStart)
          : range.start,
      end:
        range.end>viewerWeekEnd
          ? new Date(viewerWeekEnd)
          : range.end,
    }));

  // Public profiles are day-oriented. Split continuous ranges at every
  // viewer-local midnight so a long availability block never appears as
  // "Tuesday 00:00 - Sun 00:00".
  const daySegments:{start:Date;end:Date}[]=[];

  for(const range of visible) {
    let cursor=new Date(range.start);

    while(cursor<range.end) {
      const midnight=nextLocalMidnight(cursor,viewerTimeZone);
      const segmentEnd=
        midnight<range.end
          ? midnight
          : new Date(range.end);

      daySegments.push({
        start:new Date(cursor),
        end:segmentEnd,
      });

      cursor=new Date(segmentEnd);
    }
  }

  const grouped=new Map<string,string[]>();

  for(const segment of daySegments) {
    const day=weekdayLabel(segment.start,viewerTimeZone);
    const startsAtMidnight=isLocalMidnight(
      segment.start,
      viewerTimeZone,
    );
    const endsAtMidnight=isLocalMidnight(
      segment.end,
      viewerTimeZone,
    );

    let text:string;

    if(startsAtMidnight&&endsAtMidnight) {
      text="All day";
    } else {
      const start=timeLabel(segment.start,viewerTimeZone);
      const end=endsAtMidnight
        ? "midnight"
        : timeLabel(segment.end,viewerTimeZone);

      text=`${start} – ${end}`;
    }

    const current=grouped.get(day)??[];
    current.push(text);
    grouped.set(day,current);
  }

  const order=[
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return order
    .filter(day=>grouped.has(day))
    .map(day=>({
      day,
      ranges:grouped.get(day)??[],
    }));
}
