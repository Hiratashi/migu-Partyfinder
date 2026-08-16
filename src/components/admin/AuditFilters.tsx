"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Option={
  value:string;
  label:string;
};

export default function AuditFilters({
  q,
  category,
  action,
  entity,
  categories,
  actions,
  entities,
}:{
  q:string;
  category:string;
  action:string;
  entity:string;
  categories:Option[];
  actions:Option[];
  entities:Option[];
}) {
  const router=useRouter();
  const pathname=usePathname();
  const [search,setSearch]=useState(q);
  const debounceRef=useRef<ReturnType<typeof setTimeout>|null>(null);

  function navigate(next:{
    q?:string;
    category?:string;
    action?:string;
    entity?:string;
  }) {
    const params=new URLSearchParams();

    const nextQ=next.q??search;
    const nextCategory=next.category??category;
    const nextAction=next.action??action;
    const nextEntity=next.entity??entity;

    if(nextQ.trim())params.set("q",nextQ.trim());
    if(nextCategory)params.set("category",nextCategory);
    if(nextAction)params.set("action",nextAction);
    if(nextEntity)params.set("entity",nextEntity);

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
    // q is intentionally included so external navigation resets cleanly.
  },[search,q]);

  const anyFilter=Boolean(q||category||action||entity);

  return <div className="card admin-audit-filters admin-audit-filters-readable">
    <label>
      Search
      <input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder="User, action, target or details"
        aria-label="Search audit log"
      />
    </label>

    <label>
      Category
      <select
        value={category}
        onChange={e=>navigate({category:e.target.value})}
      >
        <option value="">All categories</option>
        {categories.map(item=>
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        )}
      </select>
    </label>

    <label>
      Action
      <select
        value={action}
        onChange={e=>navigate({action:e.target.value})}
      >
        <option value="">All actions</option>
        {actions.map(item=>
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        )}
      </select>
    </label>

    <label>
      Target
      <select
        value={entity}
        onChange={e=>navigate({entity:e.target.value})}
      >
        <option value="">All targets</option>
        {entities.map(item=>
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        )}
      </select>
    </label>

    {anyFilter&&
      <Link className="btn" href="/admin/audit" scroll={false}>
        Clear
      </Link>
    }
  </div>;
}
