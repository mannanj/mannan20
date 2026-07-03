'use client';

import { Modal } from '@/components/modal';
import { PdfViewer } from '@/components/pdf-viewer';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title: string;
  documentId: string;
}

export function PdfPreviewModal({ isOpen, onClose, src, title, documentId }: PdfPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidthClassName="max-w-[min(92vw,1100px)]">
      <div className="h-[80vh] w-[min(88vw,1040px)] pt-8">
        <PdfViewer src={src} title={title} documentId={documentId} />
      </div>
    </Modal>
  );
}
