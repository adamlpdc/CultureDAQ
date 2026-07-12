"use client";
import { useState, useTransition } from "react";
import { backfillCurrentAssetRanks } from "@/actions/admin";
export function MaintenanceTools(){const [pending,start]=useTransition();const [message,setMessage]=useState("");return <div><button disabled={pending} onClick={()=>{if(!window.confirm("Backfill a rank snapshot for every current asset?"))return;start(async()=>{const result=await backfillCurrentAssetRanks();setMessage(`${result.recorded} rank snapshots recorded`);});}} className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background">Backfill Asset Ranks</button>{message&&<p className="mt-3 text-sm text-gain">{message}</p>}</div>}
