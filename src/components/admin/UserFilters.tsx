"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function UserFilters({
  q,
  status,
}:{
  q:string;
  status:string;
}) {
  const router=useRouter();
  const pathname=usePathname();
  const [search,setSearch]=useState(q);
  const debounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  function navigate(next:{q?:string;status?:string}) {
    const params=new URLSearchParams();
    const nextQ=next.q??search;
    const nextStatus=next.status??status;

    if(nextQ.trim())params.set("q",nextQ.trim());
    if(nextStatus&&nextStatus!=="all")params.set("status",nextStatus);

    const suffix=params.toString();
    router.replace(suffix?`${pathname}?${suffix}`:pathname,{
      scroll:false,
    });
  }

  useEffect(()=>{
    setSearch(q);
  },[q]);

  useEffect(()=>{
    if(search===q)return;

    if(debounceRef.current)clearTimeout(debounceRef.current);

    debounceRef.current=setTimeout(()=>{
      navigate({q:search});
    },300);

    return ()=>{
      if(debounceRef.current)clearTimeout(debounceRef.current);
    };
  },[search,q]);

  const anyFilter=Boolean(q||status!=="all");

  return <div className="card admin-user-filters admin-user-filters-live">
    <label>
      Search
      <input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder="Discord name or username"
        aria-label="Search users"
      />
    </label>

    <label>
      Status
      <select
        value={status}
        onChange={e=>navigate({status:e.target.value})}
      >
        <option value="all">All users</option>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
        <option value="admins">Admins</option>
      </select>
    </label>

    {anyFilter&&
      <Link className="btn" href="/admin/users" scroll={false}>
        Clear
      </Link>
    }
  </div>;
}
