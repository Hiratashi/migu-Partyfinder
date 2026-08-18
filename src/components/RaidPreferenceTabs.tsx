"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Raid={
  slug:string;
  name:string;
};

export default function RaidPreferenceTabs({
  raids,
  selectedSlug,
}:{
  raids:Raid[];
  selectedSlug:string;
}) {
  const router=useRouter();
  const searchParams=useSearchParams();

  function selectRaid(slug:string) {
    const params=new URLSearchParams(searchParams.toString());
    params.set("raid",slug);

    router.replace(
      `/availability?${params.toString()}#raid-preferences`,
      {scroll:false},
    );

    requestAnimationFrame(()=>{
      document
        .getElementById("raid-preferences")
        ?.scrollIntoView({block:"start"});
    });
  }

  return <div className="raid-preference-tabs" role="tablist" aria-label="Raid preferences">
    {raids.map(raid=>{
      const active=raid.slug===selectedSlug;

      return <button
        key={raid.slug}
        type="button"
        role="tab"
        aria-selected={active}
        className={`raid-preference-tab ${active?"active":""}`}
        onClick={()=>selectRaid(raid.slug)}
      >
        {raid.name}
      </button>;
    })}
  </div>;
}
