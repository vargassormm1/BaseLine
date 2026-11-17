"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { removePhoto, uploadPhoto } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/** Center-crop to a square, scale to 256px and encode as WebP in the browser, so uploads are tiny and uniform. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob || blob.type !== "image/webp") throw new Error("unsupported");
  return blob;
}

export function PhotoForm({ current, initials }: { current: string | null; initials: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const pick = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("photo", await toSquareWebp(file), "photo.webp");
        const r = await uploadPhoto(fd);
        if (!r.ok) { setError(r.error); return; }
        toast("Photo updated."); router.refresh();
      } catch { setError("That file couldn't be used. Try a JPG or PNG photo."); }
      finally { if (input.current) input.current.value = ""; }
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-3 text-2xl font-bold text-text-2" aria-hidden="true">
        {current ? <img src={current} alt="" width={80} height={80} className="size-full object-cover" /> : initials}
      </span>
      <div className="flex flex-wrap gap-2">
        <input ref={input} id="photo-file" type="file" accept="image/*" aria-label="Choose a profile photo" tabIndex={-1} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="secondary" loading={pending} onClick={() => input.current?.click()}><Camera size={17} aria-hidden="true" />{current ? "Change photo" : "Add a photo"}</Button>
        {current ? <Button variant="ghost" disabled={pending} onClick={() => start(async () => { const r = await removePhoto(); if (r.ok) { toast("Photo removed."); router.refresh(); } else setError(r.error); })}><Trash2 size={16} aria-hidden="true" />Remove</Button> : null}
      </div>
      {error ? <p role="alert" className="basis-full text-sm font-semibold text-loss-ink">{error}</p> : null}
      <p className="basis-full text-caption text-text-3">Shown to other players. Without a photo, your initials are used.</p>
    </div>
  );
}
