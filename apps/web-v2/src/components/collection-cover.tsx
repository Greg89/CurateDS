"use client";
import { useState } from "react";
import { isCoverUrl } from "@/lib/collections";
export function CollectionCover({
  url,
  name,
}: {
  url?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="collection-cover" aria-hidden="true">
      {url && isCoverUrl(url) && !failed ? (
        <img
          src={url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span>{name.slice(0, 1).toUpperCase()}</span>
          <i />
          <i />
        </>
      )}
    </div>
  );
}
