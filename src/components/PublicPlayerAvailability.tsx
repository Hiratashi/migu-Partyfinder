"use client";

import { useEffect, useState } from "react";

type AvailabilityRow={
  day:string;
  ranges:string[];
};

export default function PublicPlayerAvailability({
  userId,
}:{
  userId:string;
}) {
  const [rows,setRows]=useState<AvailabilityRow[]|null>(null);
  const [timeZone,setTimeZone]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    let cancelled=false;

    const viewerTimeZone=
      Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC";

    async function load() {
      try {
        const response=await fetch(
          `/api/players/${encodeURIComponent(userId)}/availability?timezone=${encodeURIComponent(viewerTimeZone)}`,
          {
            method:"GET",
            cache:"no-store",
          },
        );

        const data=await response.json().catch(()=>({}));

        if(cancelled)return;

        if(!response.ok) {
          setError("Could not load availability.");
          return;
        }

        setRows(Array.isArray(data.rows)?data.rows:[]);
        setTimeZone(viewerTimeZone);
      } catch {
        if(!cancelled) {
          setError("Could not load availability.");
        }
      }
    }

    void load();

    return ()=>{
      cancelled=true;
    };
  },[userId]);

  return <section className="card public-profile-section">
    <div className="row between public-profile-section-header">
      <div>
        <div className="eyebrow">Weekly availability</div>
        <h2>Availability</h2>
      </div>

      {timeZone&&
        <span className="pill">
          Your local time
        </span>
      }
    </div>

    <p className="muted public-availability-note">
      Times are converted to your browser timezone. Multiple availability
      windows on the same day are shown separately.
    </p>

    {error&&
      <div className="error" role="status">
        {error}
      </div>
    }

    {!error&&rows===null&&
      <div className="muted">
        Loading availability...
      </div>
    }

    {!error&&rows!==null&&rows.length===0&&
      <div className="muted">
        No weekly availability has been saved.
      </div>
    }

    {!error&&rows!==null&&rows.length>0&&
      <div className="public-availability-list">
        {rows.map(row=>
          <div className="public-availability-row" key={row.day}>
            <strong>{row.day}</strong>

            <div className="public-availability-ranges">
              {row.ranges.map((range,index)=>
                <span className="pill" key={`${row.day}-${index}`}>
                  {range}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    }
  </section>;
}
