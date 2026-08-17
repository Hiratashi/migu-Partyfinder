"use client";

import { useEffect, useState } from "react";

export default function ClassIcon({
  src,
  abbreviation,
  name,
  size="normal",
}:{
  src:string|null|undefined;
  abbreviation:string;
  name?:string;
  size?:"small"|"normal"|"large";
}) {
  const [failed,setFailed]=useState(false);

  useEffect(()=>{
    setFailed(false);
  },[src]);

  const showImage=Boolean(src)&&!failed;

  return <div
    className={`classicon classicon-${size}`}
    title={name??abbreviation}
    aria-label={name??abbreviation}
  >
    {showImage
      ? <img
          src={src!}
          alt=""
          aria-hidden="true"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={()=>setFailed(true)}
        />
      : <span>{abbreviation}</span>
    }
  </div>;
}
