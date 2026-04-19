import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { useSubmissionDownloadUrl } from '../lib/use-submissions';
import { cn } from '@/lib/cn';

// PDF.js worker — serve do mesmo package, bundled via Vite
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface Props {
  submissionId: string;
  mimeType: string;
  fileName: string;
}

export function PdfPreview({ submissionId, mimeType, fileName }: Props) {
  const { data: url, isLoading, error } = useSubmissionDownloadUrl(submissionId);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (isLoading) {
    return <SkeletonPreview />;
  }

  if (error || !url) {
    return (
      <div className="rounded-sm border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
        Não foi possível carregar o arquivo. Tente reabrir.
      </div>
    );
  }

  // Imagem: renderiza direto
  if (mimeType.startsWith('image/')) {
    return (
      <div className="rounded-sm border border-border bg-bg">
        <HeaderBar fileName={fileName} url={url} />
        <div className="flex max-h-[500px] items-center justify-center overflow-auto bg-black/20 p-2">
          <img src={url} alt={fileName} className="max-h-[480px] object-contain" />
        </div>
      </div>
    );
  }

  // PDF: renderiza com react-pdf
  return (
    <div className="rounded-sm border border-border bg-bg">
      <HeaderBar fileName={fileName} url={url}>
        {numPages > 0 && (
          <div className="flex items-center gap-1 text-text-muted">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-bg-surface-hi disabled:opacity-30"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-[11px] tabular-nums">
              {page} / {numPages}
            </span>
            <button
              type="button"
              disabled={page >= numPages}
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              className="inline-flex h-6 w-6 items-center justify-center rounded-sm hover:bg-bg-surface-hi disabled:opacity-30"
              aria-label="Próxima página"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </HeaderBar>

      <div
        className={cn(
          'flex max-h-[500px] items-start justify-center overflow-auto bg-zinc-800 p-2',
        )}
      >
        {loadError ? (
          <div className="p-8 text-center text-xs text-danger">{loadError}</div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={(data) => setNumPages(data.numPages)}
            onLoadError={(err) => setLoadError(err.message)}
            loading={<SkeletonPreview />}
          >
            <Page
              pageNumber={page}
              width={480}
              renderAnnotationLayer={false}
              renderTextLayer={false}
            />
          </Document>
        )}
      </div>
    </div>
  );
}

function HeaderBar({
  fileName,
  url,
  children,
}: {
  fileName: string;
  url: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2">
      <span className="truncate font-mono text-[11px] text-text-secondary">
        {fileName}
      </span>
      <div className="flex items-center gap-2">
        {children}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-bg-surface-hi hover:text-text"
          aria-label="Abrir em nova aba"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <a
          href={url}
          download={fileName}
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-text-muted hover:bg-bg-surface-hi hover:text-text"
          aria-label="Baixar"
        >
          <Download className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div className="flex h-60 items-center justify-center rounded-sm border border-border bg-bg-surface/50 text-xs text-text-muted">
      <div className="h-4 w-4 animate-spin rounded-pill border-2 border-text-muted border-t-transparent" />
      <span className="ml-2">Carregando arquivo…</span>
    </div>
  );
}
