"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Download,
  ImagePlus,
  RotateCcw,
  Share2,
  ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import charter from "@/settings/charter";

/** Un gabarit d'affiche : image (public/), taille en pixels, cadre réservé à la photo et textes. */
export type PosterConfig = {
  src: string;
  size: number;
  /** Cadre réservé à la photo, en pixels du gabarit. */
  frame: { x: number; y: number; width: number; height: number; radius: number };
  fileName: string;
  title: string;
  alt: string;
  shareTitle: string;
  /** Texte du cadre vide : clair sur un cadre sombre, foncé sur un cadre blanc. */
  placeholderTone: "light" | "dark";
};

/** Affiche « J'y serai » (site public). */
export const JY_SERAI_POSTER: PosterConfig = {
  src: "/affiche-jy-serai-2026.jpg",
  size: 1280,
  frame: { x: 54, y: 569, width: 520, height: 564, radius: 34 },
  fileName: "affiche-jy-serai-jnjl-2026.jpg",
  title: "Créez votre affiche",
  alt: "Aperçu de votre affiche « J'y serai » de la Journée Nationale du Jeune Leader",
  shareTitle: "J'y serai — JNJL 2026",
  placeholderTone: "light",
};

/** Affiche « Je suis ambassadeur JNJL » (espace ambassadeur). Cadre blanc mesuré sur le gabarit, 1 px de marge. */
export const AMBASSADOR_POSTER: PosterConfig = {
  src: "/affiche-ambassadeur-2026.jpg",
  size: 1280,
  frame: { x: 115, y: 487, width: 459, height: 568, radius: 40 },
  fileName: "affiche-ambassadeur-jnjl-2026.jpg",
  title: "Créez votre affiche d'ambassadeur",
  alt: "Aperçu de votre affiche « Je suis ambassadeur JNJL » de la Journée Nationale du Jeune Leader",
  shareTitle: "Je suis ambassadeur JNJL 2026",
  placeholderTone: "dark",
};

const MIN_SCALE = 1;
const MAX_SCALE = 3;
/** Pas de déplacement (flèches et boutons), en fraction du cadre. */
const MOVE_STEP = 0.03;
const FILE_NAME = "affiche-jy-serai-jnjl-2026.jpg";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Taille de la photo en « cadres » (1 = largeur ou hauteur du cadre) : elle le recouvre toujours. */
function coverSize(photo: HTMLImageElement, scale: number, frameRatio: number) {
  const ratio = photo.naturalWidth / photo.naturalHeight;
  return ratio > frameRatio
    ? { width: (ratio / frameRatio) * scale, height: scale }
    : { width: scale, height: (frameRatio / ratio) * scale };
}

/** Empêche de sortir la photo du cadre : aucun vide ne peut apparaître. */
function clampOffset(photo: HTMLImageElement, scale: number, offset: { x: number; y: number }, frameRatio: number) {
  const size = coverSize(photo, scale, frameRatio);
  const maxX = (size.width - 1) / 2;
  const maxY = (size.height - 1) / 2;
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

/**
 * Générateur d'affiche « J'y serai » : la photo du visiteur est placée dans le cadre du gabarit,
 * recadrée au doigt ou à la souris, puis exportée en JPEG. Tout se passe dans le navigateur :
 * la photo n'est jamais envoyée au serveur.
 */
export function PosterGenerator({ config = JY_SERAI_POSTER }: { config?: PosterConfig }) {
  const { src: POSTER_SRC, size: POSTER_SIZE, frame: FRAME, fileName: FILE_NAME } = config;
  const FRAME_RATIO = FRAME.width / FRAME.height;
  const pct = (value: number) => `${(value / POSTER_SIZE) * 100}%`;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

  const [poster, setPoster] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(MIN_SCALE);
  // Décalage de la photo par rapport au centre, en fraction du cadre.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    loadImage(POSTER_SRC)
      .then(setPoster)
      .catch(() => setError("Impossible de charger l'affiche. Rechargez la page."));
    // Le partage de fichiers n'existe que sur certains navigateurs (surtout mobiles).
    try {
      const probe = new File([""], FILE_NAME, { type: "image/jpeg" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShare(false);
    }
  }, [POSTER_SRC, FILE_NAME]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !poster) return;

    ctx.drawImage(poster, 0, 0, POSTER_SIZE, POSTER_SIZE);
    if (!photo) return;

    const size = coverSize(photo, scale, FRAME_RATIO);
    const width = size.width * FRAME.width;
    const height = size.height * FRAME.height;
    const x = FRAME.x + (FRAME.width - width) / 2 + offset.x * FRAME.width;
    const y = FRAME.y + (FRAME.height - height) / 2 + offset.y * FRAME.height;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(FRAME.x + FRAME.radius, FRAME.y);
    ctx.arcTo(FRAME.x + FRAME.width, FRAME.y, FRAME.x + FRAME.width, FRAME.y + FRAME.height, FRAME.radius);
    ctx.arcTo(FRAME.x + FRAME.width, FRAME.y + FRAME.height, FRAME.x, FRAME.y + FRAME.height, FRAME.radius);
    ctx.arcTo(FRAME.x, FRAME.y + FRAME.height, FRAME.x, FRAME.y, FRAME.radius);
    ctx.arcTo(FRAME.x, FRAME.y, FRAME.x + FRAME.width, FRAME.y, FRAME.radius);
    ctx.closePath();
    ctx.clip();
    // Fond blanc : une photo détourée (PNG transparent) ne laisse pas voir le bleu du cadre.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(FRAME.x, FRAME.y, FRAME.width, FRAME.height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo, x, y, width, height);
    ctx.restore();
  }, [poster, photo, scale, offset, POSTER_SRC, POSTER_SIZE, FRAME]);

  const applyScale = useCallback(
    (next: number) => {
      if (!photo) return;
      const value = clamp(next, MIN_SCALE, MAX_SCALE);
      setScale(value);
      setOffset(current => clampOffset(photo, value, current, FRAME_RATIO));
    },
    [photo]
  );

  const moveBy = useCallback(
    (dx: number, dy: number) => {
      if (!photo) return;
      setOffset(current => clampOffset(photo, scale, { x: current.x + dx, y: current.y + dy }, FRAME_RATIO));
    },
    [photo, scale]
  );

  // Molette : écouteur natif non passif, sinon la page défile en même temps que le zoom.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !photo) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      applyScale(scale + (event.deltaY > 0 ? -0.08 : 0.08));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [photo, scale, applyScale]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Même fichier choisi deux fois de suite : l'événement doit se redéclencher.
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      setPhoto(image);
      setScale(MIN_SCALE);
      setOffset({ x: 0, y: 0 });
      setError(null);
    } catch {
      setError("Cette photo ne peut pas être lue. Essayez-en une autre (JPG ou PNG).");
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!photo) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: pinchDistance(), scale };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous || !photo) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinch.current) {
      applyScale((pinch.current.scale * pinchDistance()) / (pinch.current.distance || 1));
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    moveBy((event.clientX - previous.x) / rect.width, (event.clientY - previous.y) / rect.height);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!photo) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        inputRef.current?.click();
      }
      return;
    }
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
      applyScale(scale + 0.1);
    } else if (event.key === "-") {
      applyScale(scale - 0.1);
    }
  };

  const exportBlob = () =>
    new Promise<Blob>((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) return reject(new Error("canvas"));
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("export"))), "image/jpeg", 0.92);
    });

  const handleDownload = async () => {
    setExporting(true);
    try {
      const url = URL.createObjectURL(await exportBlob());
      const link = document.createElement("a");
      link.href = url;
      link.download = FILE_NAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Le téléchargement a échoué. Faites un appui long sur l'affiche pour l'enregistrer.");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    setExporting(true);
    try {
      const file = new File([await exportBlob()], FILE_NAME, { type: "image/jpeg" });
      await navigator.share({ files: [file], title: config.shareTitle });
    } catch (shareError) {
      // Fermeture de la fenêtre de partage par l'utilisateur : ce n'est pas une erreur.
      if ((shareError as Error)?.name !== "AbortError") {
        setError("Le partage a échoué. Téléchargez l'affiche puis partagez-la depuis votre galerie.");
      }
    } finally {
      setExporting(false);
    }
  };

  const ready = !!poster && !!photo;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* Affiche : le cadre photo se manipule directement dessus */}
      <div
        className="relative mx-auto w-full max-w-xl overflow-hidden rounded-2xl border bg-white shadow-lg"
        style={{ borderColor: charter.border }}
      >
        <canvas
          ref={canvasRef}
          width={POSTER_SIZE}
          height={POSTER_SIZE}
          className="block aspect-square h-auto w-full"
          role="img"
          aria-label={config.alt}
        />
        <div
          ref={frameRef}
          role={photo ? "group" : "button"}
          tabIndex={0}
          aria-label={
            photo
              ? "Cadrage de la photo : glissez, ou utilisez les flèches et les touches plus et moins"
              : "Choisir ma photo"
          }
          className={`absolute flex touch-none select-none items-center justify-center outline-none focus-visible:ring-4 focus-visible:ring-[#FFBC01] ${
            photo ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
          }`}
          style={{
            left: pct(FRAME.x),
            top: pct(FRAME.y),
            width: pct(FRAME.width),
            height: pct(FRAME.height),
            borderRadius: `${(FRAME.radius / FRAME.width) * 100}% / ${(FRAME.radius / FRAME.height) * 100}%`,
          }}
          onClick={() => !photo && inputRef.current?.click()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
        >
          {!photo && (
            <span className={`flex flex-col items-center gap-2 px-3 text-center text-xs font-semibold sm:text-sm ${
                config.placeholderTone === "light" ? "text-white" : "text-neutral-700"
              }`}
            >
              <ImagePlus className="h-7 w-7 sm:h-9 sm:w-9" style={{ color: config.placeholderTone === "light" ? charter.gold : charter.orange }} aria-hidden="true" />
              Votre photo ici
            </span>
          )}
        </div>
      </div>

      

      {/* Commandes */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: charter.border }}>
        <h2 className="text-lg font-bold" style={{ color: charter.ink }}>
          {config.title}
        </h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed" style={{ color: charter.inkSoft }}>
          <li>Choisissez votre photo.</li>
          <li>Glissez-la dans le cadre et zoomez pour la cadrer.</li>
          <li>Téléchargez l’affiche et partagez-la.</li>
        </ol>

        <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={handleFile} />

        <div className="mt-6 flex flex-col gap-3">
          <Button
            type="button"
            variant="default"
            className="h-11 text-sm font-semibold"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="mr-1.5" aria-hidden="true" />
            {photo ? "Changer de photo" : "Choisir ma photo"}
          </Button>

          {photo && (
            <div className="flex items-center gap-3 py-1">
              <label htmlFor="poster-zoom" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: charter.ink }}>
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
                Zoom
              </label>
              <input
                id="poster-zoom"
                type="range"
                min={MIN_SCALE}
                max={MAX_SCALE}
                step={0.01}
                value={scale}
                onChange={event => applyScale(Number(event.target.value))}
                className="h-8 min-w-0 flex-1"
                style={{ accentColor: charter.orange }}
              />
            </div>
          )}

          {photo && (
            <div className="grid grid-cols-[repeat(3,2.75rem)] justify-center gap-1.5" role="group" aria-label="Déplacer la photo">
              <span />
              <Button type="button" variant="outline" className="size-11" aria-label="Monter la photo" onClick={() => moveBy(0, -MOVE_STEP)}>
                <ArrowUp aria-hidden="true" />
              </Button>
              <span />
              <Button type="button" variant="outline" className="size-11" aria-label="Déplacer la photo vers la gauche" onClick={() => moveBy(-MOVE_STEP, 0)}>
                <ArrowLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="size-11"
                aria-label="Réinitialiser le cadrage"
                onClick={() => {
                  setScale(MIN_SCALE);
                  setOffset({ x: 0, y: 0 });
                }}
              >
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
          )}

          <Button
            type="button"
            className="h-11 text-sm font-semibold"
            disabled={!ready}
            loading={exporting}
            onClick={handleDownload}
          >
            <Download className="mr-1.5" aria-hidden="true" />
            Télécharger mon affiche
          </Button>

          {canShare && (
            <Button
              type="button"
              variant="outline"
              className="h-11 text-sm font-semibold"
              disabled={!ready || exporting}
              onClick={handleShare}
            >
              <Share2 className="mr-1.5" aria-hidden="true" />
              Partager
            </Button>
          )}
        </div>

        {error && (
          <p role="alert" className="mt-4 border-l-4 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="mt-5 text-xs leading-relaxed" style={{ color: charter.inkFaint }}>
          Votre photo reste sur votre appareil : elle n’est ni envoyée ni enregistrée sur nos serveurs.
        </p>
      </div>
    </div>
  );
}
