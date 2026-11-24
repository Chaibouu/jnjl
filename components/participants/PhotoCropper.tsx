"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

/** Côté (px) de la zone de cadrage affichée à l'écran. */
const VIEW = 300;
/** Côté (px) de la photo carrée envoyée au serveur. */
const OUTPUT = 800;
const MAX_ZOOM = 4;
/** Pas (px à l'écran) d'un appui sur une flèche. */
const MOVE_STEP = 12;

type Offset = { x: number; y: number };

/**
 * Cadrage de la photo du badge : on la fait glisser (doigt ou souris), on zoome (curseur, boutons, molette ou pincement),
 * le cercle montre exactement la zone visible sur le badge. La photo cadrée est renvoyée en JPEG carré (800 × 800).
 */
export function PhotoCropper({
  source,
  busy = false,
  onCancel,
  onConfirm,
}: {
  source: Blob;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ distance: number; zoom: number } | null>(null);

  // Décodage (l'orientation EXIF des photos de téléphone est respectée).
  useEffect(() => {
    let active = true;
    createImageBitmap(source, { imageOrientation: "from-image" })
      .then(decoded => {
        if (active) setBitmap(decoded);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [source]);

  // Échelle « couvrir » : à zoom 1, la photo remplit toute la zone de cadrage.
  const baseScale = bitmap ? Math.max(VIEW / bitmap.width, VIEW / bitmap.height) : 1;
  const scale = baseScale * zoom;

  /** Garde la photo toujours en couverture de la zone (jamais de bord vide). */
  const clamp = useCallback(
    (next: Offset, nextScale: number): Offset => {
      if (!bitmap) return next;
      const maxX = Math.max(0, (bitmap.width * nextScale - VIEW) / 2);
      const maxY = Math.max(0, (bitmap.height * nextScale - VIEW) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
    },
    [bitmap]
  );

  const changeZoom = (value: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, value));
    setZoom(next);
    setOffset(current => clamp(current, baseScale * next));
  };

  // Dessin : photo, puis voile sombre autour du cercle.
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !bitmap) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = VIEW * ratio;
    canvas.height = VIEW * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, VIEW, VIEW);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    context.drawImage(bitmap, VIEW / 2 + offset.x - width / 2, VIEW / 2 + offset.y - height / 2, width, height);

    context.fillStyle = "rgba(0,0,0,0.55)";
    context.beginPath();
    context.rect(0, 0, VIEW, VIEW);
    context.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 6, 0, Math.PI * 2, true);
    context.fill("evenodd");
    context.strokeStyle = charter.orange;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(VIEW / 2, VIEW / 2, VIEW / 2 - 6, 0, Math.PI * 2);
    context.stroke();
  }, [bitmap, scale, offset]);

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      changeZoom((pinchStart.current.zoom * distance) / Math.max(1, pinchStart.current.distance));
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setOffset(current => clamp({ x: current.x + dx, y: current.y + dy }, scale));
  };

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  /** Déplace la photo de quelques pixels (boutons fléchés et touches du clavier). */
  const moveBy = (dx: number, dy: number) => setOffset(current => clamp({ x: current.x + dx, y: current.y + dy }, scale));

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-MOVE_STEP, 0],
      ArrowRight: [MOVE_STEP, 0],
      ArrowUp: [0, -MOVE_STEP],
      ArrowDown: [0, MOVE_STEP],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveBy(move[0], move[1]);
    } else if (event.key === "+" || event.key === "=") {
      changeZoom(zoom + 0.1);
    } else if (event.key === "-") {
      changeZoom(zoom - 0.1);
    }
  };

  const confirm = () => {
    if (!bitmap) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = OUTPUT / VIEW;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, OUTPUT, OUTPUT);
    const width = bitmap.width * scale * ratio;
    const height = bitmap.height * scale * ratio;
    context.drawImage(bitmap, (VIEW / 2 + offset.x) * ratio - width / 2, (VIEW / 2 + offset.y) * ratio - height / 2, width, height);
    canvas.toBlob(
      blob => {
        if (blob) onConfirm(new File([blob], "photo-badge.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  };

  if (failed) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">Cette image ne peut pas être lue. Choisissez une photo JPEG, PNG ou WebP.</p>
        <Button type="button" variant="outline" onClick={onCancel}>
          Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="max-w-xs text-center text-xs" style={{ color: charter.inkSoft }}>
        Faites glisser la photo pour la cadrer et utilisez le curseur pour zoomer. Le cercle correspond à la zone visible sur
        le badge.
      </p>
      <canvas
        ref={canvasRef}
        style={{ width: VIEW, height: VIEW, touchAction: "none", cursor: "grab", borderRadius: 4, background: "#f4f4f5" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={event => changeZoom(zoom - event.deltaY * 0.002)}
        onKeyDown={onKeyDown}
        tabIndex={0}
        aria-label="Zone de cadrage de la photo : flèches pour déplacer, plus et moins pour zoomer"
      />
      <div className="flex w-full max-w-xs items-center gap-3">
        <button type="button" aria-label="Dézoomer" onClick={() => changeZoom(zoom - 0.25)} className="rounded-full border p-1.5">
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={event => changeZoom(Number(event.target.value))}
          className="h-2 flex-1 accent-[#F07321]"
          aria-label="Zoom"
        />
        <button type="button" aria-label="Zoomer" onClick={() => changeZoom(zoom + 0.25)} className="rounded-full border p-1.5">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-[repeat(3,2.75rem)] justify-center gap-1.5" role="group" aria-label="Déplacer la photo">
        <span />
        <Button type="button" variant="outline" className="size-11" aria-label="Monter la photo" onClick={() => moveBy(0, -MOVE_STEP)}>
          <ArrowUp aria-hidden="true" />
        </Button>
        <span />
        <Button type="button" variant="outline" className="size-11" aria-label="Déplacer la photo vers la gauche" onClick={() => moveBy(-MOVE_STEP, 0)}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="size-11" aria-label="Réinitialiser le cadrage" onClick={reset}>
          <RotateCcw aria-hidden="true" />
        </Button>
        <Button type="button" variant="outline" className="size-11" aria-label="Déplacer la photo vers la droite" onClick={() => moveBy(MOVE_STEP, 0)}>
          <ArrowRight aria-hidden="true" />
        </Button>
        <span />
        <Button type="button" variant="outline" className="size-11" aria-label="Descendre la photo" onClick={() => moveBy(0, MOVE_STEP)}>
          <ArrowDown aria-hidden="true" />
        </Button>
        <span />
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          loading={busy}
          disabled={!bitmap}
          onClick={confirm}
          className="text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: charter.orange }}
        >
          Valider cette photo
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
