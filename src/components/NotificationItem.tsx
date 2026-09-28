"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LocalDateTime from "@/components/LocalDateTime";
import type { NotificationChange } from "@/lib/notifications";

type Item={
  id:string;
  title:string;
  body:string;
  partyId:string|null;
  read:boolean;
  createdAt:string;
  changeDetails:NotificationChange[];
};

export default function NotificationItem({item}:{item:Item}) {
  const router=useRouter();
  const [expanded,setExpanded]=useState(false);
  const [read,setRead]=useState(item.read);
  const markRead=async()=>{
    if(read)return;
    try {
      const response=await fetch(`/api/notifications/${item.id}/read`,{method:"POST"});
      if(response.ok) {
        setRead(true);
        window.dispatchEvent(new Event("partyfinder:notifications-changed"));
      }
    } catch { /* Keep the alert unread if the request fails. */ }
  };
  const display=(value:string,format?:"datetime")=>
    format==="datetime"&&value!=="None"
      ? <LocalDateTime iso={value}/>
      : value;

  return <li className={`notification-item ${read?"":"notification-unread"}`}>
    <div>
      <strong>{item.title}</strong>{!read&&<span className="notification-unread-label"> · Unread</span>}
      <p>{item.body}</p>
      <small><LocalDateTime iso={item.createdAt}/></small>
      {expanded&&item.changeDetails.length>0&&<div className="notification-change-list">
        {item.changeDetails.map((change,index)=><div className="notification-change" key={`${change.label}-${index}`}>
          <strong>{change.label}</strong>
          <div className="notification-change-values">
            <span className="notification-before"><small>Before</small>{display(change.before,change.format)}</span>
            <span className="notification-after"><small>After</small>{display(change.after,change.format)}</span>
          </div>
        </div>)}
      </div>}
    </div>
    <div className="notification-actions">
      {(item.changeDetails.length>0||!item.partyId)&&<button className="btn" type="button" aria-expanded={expanded} onClick={()=>{
        setExpanded(!expanded);
        if(!expanded)void markRead();
      }}>{expanded?"Close":"Review"}</button>}
      {item.partyId&&<button className="btn" type="button" onClick={async()=>{
        await markRead();
        router.push(`/parties/${item.partyId}`);
      }}>View party</button>}
    </div>
  </li>;
}
