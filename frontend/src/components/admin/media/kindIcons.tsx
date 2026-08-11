import { FileVideo, FileText, FileImage, Presentation, File as FileIcon } from "lucide-react";

export const KIND_LABEL: Record<string, string> = {
  VIDEO: "Vidéo",
  PDF: "PDF",
  IMAGE: "Image",
  SLIDE: "Diapositive",
  DOCUMENT: "Document",
};

export function KindIcon({ kind, className = "h-8 w-8" }: { kind: string; className?: string }) {
  switch (kind) {
    case "VIDEO":
      return <FileVideo className={className} />;
    case "PDF":
      return <FileText className={className} />;
    case "IMAGE":
      return <FileImage className={className} />;
    case "SLIDE":
      return <Presentation className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

const EXT_TO_KIND: Record<string, string> = {
  mp4: "VIDEO",
  webm: "VIDEO",
  m3u8: "VIDEO",
  ts: "VIDEO",
  pdf: "PDF",
  png: "IMAGE",
  jpg: "IMAGE",
  jpeg: "IMAGE",
  gif: "IMAGE",
  webp: "IMAGE",
  doc: "DOCUMENT",
  docx: "DOCUMENT",
  odt: "DOCUMENT",
  ods: "DOCUMENT",
  ppt: "SLIDE",
  pptx: "SLIDE",
  odp: "SLIDE",
};

export function inferKindFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_KIND[ext] ?? "DOCUMENT";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
