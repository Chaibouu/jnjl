import { notFound } from "next/navigation";
import { getDocumentTemplateAction } from "@/actions/document-template-actions";
import { DocumentTemplateEditor } from "@/components/admin/DocumentTemplateEditor";
import type { PdfmeTemplate } from "@/lib/pdf-templates/definitions";

export default async function DocumentTemplateEditorPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const template = await getDocumentTemplateAction(templateId).catch(() => null);
  if (!template) notFound();

  return (
    <DocumentTemplateEditor
      id={template.id}
      type={template.type}
      initialName={template.name}
      initialTemplate={template.template as unknown as PdfmeTemplate}
      editionLabel={`${template.edition.name} (${template.edition.year})`}
      isActive={template.isActive}
    />
  );
}
