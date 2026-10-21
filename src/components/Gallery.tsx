"use client";

import Image from "next/image";
import { useState } from "react";

export function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-[24px] bg-sand">
        {list[i] && <Image src={list[i]} alt={`${name} — image ${i + 1} of ${list.length}`} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" unoptimized={list[i].endsWith(".svg")} />}
      </div>
      {list.length > 1 && (
        <div className="mt-4 flex gap-3" role="tablist" aria-label="Product images">
          {list.map((src, idx) => (
            <button
              key={src}
              role="tab"
              aria-selected={idx === i}
              aria-label={`Show image ${idx + 1}`}
              onClick={() => setI(idx)}
              className={`relative h-20 w-20 overflow-hidden rounded-xl bg-sand ring-offset-2 transition ${idx === i ? "ring-2 ring-olive" : "opacity-70 hover:opacity-100"}`}
            >
              <Image src={src} alt="" fill sizes="80px" className="object-cover" unoptimized={src.endsWith(".svg")} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
