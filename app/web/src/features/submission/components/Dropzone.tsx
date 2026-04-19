import { useCallback, useRef, useState, type DragEvent } from 'react';
import { FileText, Image as ImageIcon, Upload, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  MAX_FILE_SIZE_MB,
  ACCEPTED_MIME_TYPES,
  isAcceptedMime,
  MAX_FILE_SIZE_BYTES,
} from '@/core/domain/submission';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  progress?: number; // 0-100
  state?: 'idle' | 'uploading' | 'success' | 'error';
  error?: string | null;
}

export function Dropzone({ file, onChange, progress = 0, state = 'idle', error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = useCallback((f: File): string | null => {
    if (!isAcceptedMime(f.type)) {
      return 'Formato não aceito. Use PDF, JPG ou PNG.';
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `Arquivo maior que ${String(MAX_FILE_SIZE_MB)}MB.`;
    }
    return null;
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      setLocalError(null);
      const f = files?.[0];
      if (!f) return;
      const err = validate(f);
      if (err) {
        setLocalError(err);
        return;
      }
      onChange(f);
    },
    [onChange, validate],
  );

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragging(true);
    } else if (e.type === 'dragleave') {
      setDragging(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const errorMsg = error ?? localError;

  // ---------------------------------------------------------------------
  // Estado: com arquivo selecionado
  // ---------------------------------------------------------------------
  if (file && state !== 'idle') {
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <FileIcon mime={file.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{file.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-text-muted tabular-nums">
              {formatBytes(file.size)}
            </p>
          </div>
          {state === 'uploading' && (
            <span className="font-mono text-xs text-primary tabular-nums">
              {progress}%
            </span>
          )}
        </div>

        {state === 'uploading' && (
          <div className="mt-3 h-1 overflow-hidden rounded-pill bg-bg-surface-hi">
            <div
              className="h-full bg-primary transition-all duration-medium"
              style={{ width: `${String(progress)}%` }}
            />
          </div>
        )}

        {state === 'success' && (
          <p className="mt-2 text-xs text-success">Arquivo enviado</p>
        )}

        {state === 'error' && errorMsg && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5" />
            {errorMsg}
          </div>
        )}
      </div>
    );
  }

  if (file) {
    // idle com arquivo
    return (
      <div className="rounded-lg border border-border bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <FileIcon mime={file.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{file.name}</p>
            <p className="mt-0.5 font-mono text-[11px] text-text-muted tabular-nums">
              {formatBytes(file.size)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-text-muted hover:bg-bg-surface-hi hover:text-text"
            aria-label="Remover arquivo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // Estado: vazio
  // ---------------------------------------------------------------------
  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Arraste um arquivo ou clique para selecionar"
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed',
          'px-4 py-10 text-center transition-colors',
          'focus-visible:border-primary focus-visible:bg-primary/5 focus-visible:outline-none',
          dragging
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-bg-surface/50 text-text-secondary hover:border-border-strong hover:text-text',
        )}
      >
        <Upload className="mb-3 h-5 w-5" />
        <p className="text-sm font-medium">
          {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para enviar'}
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          PDF, JPG ou PNG · até {MAX_FILE_SIZE_MB}MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME_TYPES.join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="sr-only"
      />

      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function FileIcon({ mime }: { mime: string }) {
  const isImage = mime.startsWith('image/');
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-bg text-primary">
      {isImage ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
