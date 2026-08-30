"use client";
import { useState } from "react";
import { commercePreview } from "@/lib/services";
import { products } from "@/lib/data";
export function Shop() { const [message, setMessage] = useState(""); async function preview(name: string) { const r = await commercePreview.beginCheckout(); setMessage(`${name}: ${r.message}`); } return <><div className="product-grid">{products.map((p, i) => <article className="product" key={p.name}><div className={`product-art art-${i % 3}`}><span>BYNV</span></div><p className="eyebrow">{p.category}</p><h2>{p.name}</h2><p>{p.description}</p><div><strong>{p.price}</strong><button onClick={() => preview(p.name)}>Preview item</button></div></article>)}</div><p className="shop-status" role="status">{message}</p></> }
