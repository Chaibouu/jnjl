"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import CharacterCount from "@tiptap/extension-character-count";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Code2,
  Highlighter,
  ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
  Upload,
  Youtube as YoutubeIcon,
} from "lucide-react";
import { cn } from "cn";
import { uploadEditorImageAction } from "@/actions/editor-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Panel = "link" | "image" | "video" | null;

function ToolbarButton({
  title,
  active,
  disabled,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // mouseDown : évite de faire perdre la sélection à l'éditeur avant la commande.
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center px-1.5 text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40",
        active && "bg-orange-100 text-brand"
      )}
    >
      {children}
    </button>
  );
}

const Separator = () => <span className="mx-1 h-5 w-px self-center bg-gray-300" aria-hidden="true" />;

/**
 * Éditeur de texte riche (WYSIWYG) : titres, styles, couleurs, listes, tâches, alignement,
 * liens, images (téléversement ou lien), tableaux, vidéo YouTube, citation, bloc de code.
 * Produit du HTML, nettoyé côté serveur avant enregistrement.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Rédigez votre contenu…",
  minHeight = 280,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [panelValue, setPanelValue] = useState("");
  const [panelError, setPanelError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    // Évite l'erreur d'hydratation avec le rendu serveur de Next.js.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer" } }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Subscript,
      Superscript,
      Placeholder.configure({ placeholder }),
      Youtube.configure({ nocookie: true, controls: true }),
      CharacterCount,
    ],
    content: value,
    editorProps: {
      attributes: { class: "rich-content px-4 py-3 outline-none", style: `min-height:${minHeight}px` },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.isEmpty ? "" : current.getHTML());
    },
  });

  if (!editor) {
    return (
      <div
        className="animate-pulse border border-gray-300 bg-gray-50"
        style={{ minHeight: minHeight + 90 }}
        aria-busy="true"
      />
    );
  }

  const openPanel = (next: Exclude<Panel, null>) => {
    setPanelError("");
    setPanelValue(next === "link" ? (editor.getAttributes("link").href ?? "") : "");
    setPanel(current => (current === next ? null : next));
  };

  const closePanel = () => {
    setPanel(null);
    setPanelError("");
  };

  const isHttpUrl = (raw: string) => /^https?:\/\/\S+$/i.test(raw.trim());

  const applyPanel = () => {
    const url = panelValue.trim();
    if (panel === "link") {
      if (!url) {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return closePanel();
      }
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) {
        return setPanelError("Le lien doit commencer par https://, mailto: ou tel:");
      }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    if (panel === "image") {
      if (!isHttpUrl(url)) return setPanelError("Saisissez l'adresse complète de l'image (https://…)");
      editor.chain().focus().setImage({ src: url }).run();
    }
    if (panel === "video") {
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(url)) {
        return setPanelError("Saisissez un lien YouTube (https://www.youtube.com/watch?v=…)");
      }
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
    closePanel();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setPanelError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { url } = await uploadEditorImageAction(formData);
      editor.chain().focus().setImage({ src: url }).run();
      closePanel();
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : "Téléversement impossible");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const headingValue = [1, 2, 3, 4].find(level => editor.isActive("heading", { level }))?.toString() ?? "0";
  const inTable = editor.isActive("table");
  const words = editor.storage.characterCount.words() as number;
  const characters = editor.storage.characterCount.characters() as number;

  return (
    <div className="flex flex-col border border-gray-300 bg-white">
      {/* Barre d'outils */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-300 bg-gray-100 p-1">
        <ToolbarButton title="Annuler" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Rétablir" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <Separator />

        <select
          aria-label="Style de paragraphe"
          value={headingValue}
          onChange={event => {
            const level = Number(event.target.value);
            const chain = editor.chain().focus();
            if (level === 0) chain.setParagraph().run();
            else chain.toggleHeading({ level: level as 1 | 2 | 3 | 4 }).run();
          }}
          className="h-8 border-0 bg-transparent px-2 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none"
        >
          <option value="0">Paragraphe</option>
          <option value="1">Titre 1</option>
          <option value="2">Titre 2</option>
          <option value="3">Titre 3</option>
          <option value="4">Titre 4</option>
        </select>
        <Separator />

        <ToolbarButton title="Gras" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Italique" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Souligné" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Barré" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Exposant" active={editor.isActive("superscript")} onClick={() => editor.chain().focus().toggleSuperscript().run()}>
          <SuperscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Indice" active={editor.isActive("subscript")} onClick={() => editor.chain().focus().toggleSubscript().run()}>
          <SubscriptIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <Separator />

        <label
          title="Couleur du texte"
          className="relative flex h-8 min-w-8 cursor-pointer items-center justify-center px-1.5 text-gray-700 hover:bg-gray-200"
        >
          <Palette className="h-4 w-4" />
          <span
            className="absolute bottom-1 left-1.5 right-1.5 h-0.5"
            style={{ backgroundColor: editor.getAttributes("textStyle").color ?? "#111827" }}
          />
          <input
            type="color"
            aria-label="Couleur du texte"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={editor.getAttributes("textStyle").color ?? "#111827"}
            onChange={event => editor.chain().focus().setColor(event.target.value).run()}
          />
        </label>
        <label
          title="Surlignage"
          className={cn(
            "relative flex h-8 min-w-8 cursor-pointer items-center justify-center px-1.5 text-gray-700 hover:bg-gray-200",
            editor.isActive("highlight") && "bg-orange-100 text-brand"
          )}
        >
          <Highlighter className="h-4 w-4" />
          <input
            type="color"
            aria-label="Couleur de surlignage"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            value={editor.getAttributes("highlight").color ?? "#fde68a"}
            onChange={event => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
          />
        </label>
        <ToolbarButton
          title="Effacer la mise en forme"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
        <Separator />

        <ToolbarButton title="Liste à puces" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Liste numérotée" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Liste de tâches" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks className="h-4 w-4" />
        </ToolbarButton>
        <Separator />

        <ToolbarButton title="Aligner à gauche" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Centrer" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Aligner à droite" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Justifier" active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}>
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
        <Separator />

        <ToolbarButton title="Lien" active={editor.isActive("link") || panel === "link"} onClick={() => openPanel("link")}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Image" active={panel === "image"} onClick={() => openPanel("image")}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Vidéo YouTube" active={panel === "video"} onClick={() => openPanel("video")}>
          <YoutubeIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Insérer un tableau"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Citation" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Bloc de code" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Ligne horizontale" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Actions sur le tableau (visibles quand le curseur est dans un tableau) */}
      {inTable && <TableBar editor={editor} />}

      {/* Panneau lien / image / vidéo */}
      {panel && (
        <div className="flex flex-col gap-2 border-b border-gray-300 bg-gray-50 p-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              autoFocus
              value={panelValue}
              onChange={event => {
                setPanelValue(event.target.value);
                setPanelError("");
              }}
              onKeyDown={event => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyPanel();
                }
                if (event.key === "Escape") closePanel();
              }}
              placeholder={
                panel === "link"
                  ? "https://exemple.org/page"
                  : panel === "image"
                    ? "https://exemple.org/image.jpg"
                    : "https://www.youtube.com/watch?v=…"
              }
              className="h-9 min-w-[220px] flex-1 rounded-none border border-gray-300 bg-white"
            />
            <Button type="button" size="sm" onClick={applyPanel}>
              {panel === "link" ? "Appliquer" : "Insérer"}
            </Button>
            {panel === "link" && editor.isActive("link") && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  closePanel();
                }}
              >
                <Unlink className="mr-1 h-3.5 w-3.5" />
                Retirer
              </Button>
            )}
            {panel === "image" && (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={uploading}
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  Téléverser
                </Button>
              </>
            )}
            <Button type="button" size="sm" variant="cancel" onClick={closePanel}>
              Annuler
            </Button>
          </div>
          {panelError && <p className="text-xs text-red-600">{panelError}</p>}
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Pied : compteurs, comme dans CKEditor */}
      <div className="flex items-center justify-end gap-4 border-t border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
        <span>{words} mot{words > 1 ? "s" : ""}</span>
        <span>{characters} caractère{characters > 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

function TableBar({ editor }: { editor: Editor }) {
  const actions: { label: string; run: () => void }[] = [
    { label: "Colonne avant", run: () => editor.chain().focus().addColumnBefore().run() },
    { label: "Colonne après", run: () => editor.chain().focus().addColumnAfter().run() },
    { label: "Supprimer la colonne", run: () => editor.chain().focus().deleteColumn().run() },
    { label: "Ligne avant", run: () => editor.chain().focus().addRowBefore().run() },
    { label: "Ligne après", run: () => editor.chain().focus().addRowAfter().run() },
    { label: "Supprimer la ligne", run: () => editor.chain().focus().deleteRow().run() },
    { label: "En-tête", run: () => editor.chain().focus().toggleHeaderRow().run() },
    { label: "Fusionner / scinder", run: () => editor.chain().focus().mergeOrSplit().run() },
    { label: "Supprimer le tableau", run: () => editor.chain().focus().deleteTable().run() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-300 bg-gray-50 p-1">
      <span className="px-2 text-xs font-medium text-gray-500">Tableau</span>
      {actions.map(action => (
        <button
          key={action.label}
          type="button"
          onMouseDown={event => event.preventDefault()}
          onClick={action.run}
          className={cn(
            "px-2 py-1 text-xs text-gray-700 hover:bg-gray-200",
            action.label === "Supprimer le tableau" && "text-red-600 hover:bg-red-50"
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
