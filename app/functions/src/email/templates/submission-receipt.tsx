import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, EMAIL_TOKENS as T } from './layout.js';

/**
 * E-mail de recibo de entrega — disparado quando o aluno submete o trabalho.
 *
 * Objetivos (world-class):
 *  - Aluno tem prova imediata de que a entrega foi registrada.
 *  - Protocolo TRAB-XXXX em destaque (tipografia mono, fácil de citar).
 *  - Link opcional pra baixar cópia do arquivo (signed URL 30d).
 *  - Dark editorial matching com o app.
 */

export interface SubmissionReceiptProps {
  shortId: string;
  disciplineName: string;
  assignmentTitle: string;
  assignmentKindLabel: string;
  students: string[];
  submittedAt: Date;
  fileName: string;
  fileSizeBytes: number;
  downloadUrl: string | null;
  downloadUrlExpiresAt: Date | null;
  /** Entrega via URL (YouTube etc) em vez de arquivo no Storage. */
  isUrlDelivery?: boolean;
}

export function SubmissionReceiptEmail({
  shortId,
  disciplineName,
  assignmentTitle,
  assignmentKindLabel,
  students,
  submittedAt,
  fileName,
  fileSizeBytes,
  downloadUrl,
  downloadUrlExpiresAt,
  isUrlDelivery = false,
}: SubmissionReceiptProps) {
  const studentsLabel = students.length === 1 ? 'Aluno' : 'Integrantes';
  const studentsValue = students.join(', ');

  return (
    <EmailLayout
      preview={`Recibo ${shortId} — ${assignmentTitle}`}
      footerNote={
        isUrlDelivery
          ? 'Sua entrega é o link enviado. Guarde este e-mail como comprovante.'
          : downloadUrl
            ? `O link de download expira em ${formatDateOnly(downloadUrlExpiresAt)}. Não compartilhe este e-mail.`
            : undefined
      }
    >
      {/* Título */}
      <Text
        style={{
          margin: '0 0 4px',
          fontSize: '12px',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: T.textMuted,
          fontWeight: 500,
        }}
      >
        Recibo de entrega
      </Text>
      <Text
        style={{
          margin: '0 0 24px',
          fontSize: '22px',
          fontWeight: 600,
          color: T.text,
          lineHeight: '28px',
          letterSpacing: '-0.02em',
        }}
      >
        Seu trabalho foi registrado.
      </Text>

      {/* Protocolo em destaque */}
      <Section
        style={{
          backgroundColor: T.surfaceHi,
          border: `1px solid ${T.border}`,
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <Text
          style={{
            margin: '0 0 4px',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.textDim,
            fontWeight: 500,
          }}
        >
          Protocolo
        </Text>
        <Text
          style={{
            margin: 0,
            fontFamily:
              'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
            fontSize: '24px',
            fontWeight: 600,
            color: T.primary,
            letterSpacing: '0.02em',
          }}
        >
          {shortId}
        </Text>
      </Section>

      {/* Detalhes da entrega */}
      <DetailRow label="Disciplina" value={disciplineName} />
      <DetailRow
        label="Atividade"
        value={`${assignmentKindLabel} — ${assignmentTitle}`}
      />
      <DetailRow label={studentsLabel} value={studentsValue} />
      <DetailRow label="Data e hora" value={formatDateTime(submittedAt)} />
      <DetailRow
        label={isUrlDelivery ? 'Link entregue' : 'Arquivo'}
        value={
          isUrlDelivery
            ? fileName
            : `${fileName} · ${formatBytes(fileSizeBytes)}`
        }
      />

      {/* CTA — baixar arquivo ou abrir link */}
      {downloadUrl && (
        <Section style={{ marginTop: '28px', textAlign: 'center' as const }}>
          <Button
            href={downloadUrl}
            style={{
              display: 'inline-block',
              backgroundColor: T.primary,
              color: T.bg,
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {isUrlDelivery ? 'Abrir link enviado' : 'Baixar cópia do arquivo'}
          </Button>
        </Section>
      )}

      {/* Próximos passos */}
      <Section
        style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <Text
          style={{
            margin: '0 0 8px',
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: T.textMuted,
            fontWeight: 500,
          }}
        >
          Próximos passos
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: '13px',
            color: T.text,
            lineHeight: '20px',
          }}
        >
          A correção por IA inicia automaticamente. Depois da revisão do
          professor, você é notificado da nota. Guarde este e-mail como
          comprovante da entrega.
        </Text>
      </Section>
    </EmailLayout>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <table
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{
        borderCollapse: 'collapse',
        marginBottom: '12px',
      }}
    >
      <tr>
        <td
          style={{
            width: '110px',
            verticalAlign: 'top',
            paddingRight: '12px',
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: '11px',
              color: T.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 500,
              lineHeight: '18px',
            }}
          >
            {label}
          </Text>
        </td>
        <td style={{ verticalAlign: 'top' }}>
          <Text
            style={{
              margin: 0,
              fontSize: '13px',
              color: T.text,
              lineHeight: '18px',
            }}
          >
            {value}
          </Text>
        </td>
      </tr>
    </table>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function formatDateOnly(date: Date | null): string {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
