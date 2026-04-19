import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Check, X, FileText } from 'lucide-react';
import { Drawer } from '@/shared/ui/Drawer';
import { Button } from '@/shared/ui/Button';
import { Textarea } from '@/shared/ui/Input';
import { cn } from '@/lib/cn';
import { StatusDot } from './StatusDot';
import { PdfPreview } from './PdfPreview';
import { RubricReviewEditor } from './RubricReviewEditor';
import {
  useSubmission,
  usePublishGrade,
  useRejectSubmission,
  useReprocessSubmission,
} from '../lib/use-submissions';
import { useDiscipline } from '@/features/disciplines/lib/use-disciplines';
import type { Submission } from '@/core/domain/submission';

interface Props {
  open: boolean;
  submission: Submission;
  onClose: () => void;
}

export function ReviewDrawer({ open, submission, onClose }: Props) {
  const { data: discipline } = useDiscipline(submission.disciplineId);
  const { data: fresh } = useSubmission(submission.id); // real-time update
  const sub = fresh ?? submission;

  const publishMut = usePublishGrade();
  const rejectMut = useRejectSubmission();
  const reprocessMut = useReprocessSubmission();

  const aiEval = sub.ai?.evaluation;
  const reviewEval = sub.review?.finalEvaluation;

  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState('');
  const [showOcr, setShowOcr] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Popula estado ao abrir ou ao sub atualizar
  useEffect(() => {
    if (!open) return;
    const source = reviewEval?.criterionScores ?? aiEval?.criterionScores ?? {};
    setScores(source);
    setFeedback(sub.review?.professorFeedback ?? '');
    setShowOcr(false);
    setRejectMode(false);
    setRejectReason('');
  }, [open, sub.id, aiEval?.criterionScores, reviewEval?.criterionScores, sub.review?.professorFeedback]);

  const finalScore = useMemo(
    () => Object.values(scores).reduce((s, v) => s + v, 0),
    [scores],
  );

  const manuallyAdjusted = useMemo(() => {
    if (!aiEval) return false;
    return Object.entries(scores).some(
      ([k, v]) => Math.abs(v - (aiEval.criterionScores[k] ?? 0)) > 0.01,
    );
  }, [scores, aiEval]);

  const canPublish = sub.status === 'PENDING_REVIEW' || sub.status === 'APPROVED';
  const canReject = sub.status === 'PENDING_REVIEW';
  const canReprocess = sub.status !== 'AI_PROCESSING';

  const handlePublish = async () => {
    if (!aiEval) return;
    const bigDelta = Math.abs(finalScore - aiEval.finalScore) > 3;
    if (bigDelta) {
      const ok = window.confirm(
        `Nota final ${finalScore.toFixed(1)} difere da IA em mais de 3 pontos (IA sugeriu ${aiEval.finalScore.toFixed(1)}). Confirmar?`,
      );
      if (!ok) return;
    }
    await publishMut.mutateAsync({
      submissionId: sub.id,
      review: {
        criterionScores: scores,
        finalScore,
        answers: aiEval.answers,
        report: aiEval.report,
        professorFeedback: feedback.trim() || null,
        manuallyAdjusted,
      },
    });
    onClose();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await rejectMut.mutateAsync({
      submissionId: sub.id,
      reason: rejectReason.trim(),
    });
    onClose();
  };

  const handleReprocess = async () => {
    const ok = window.confirm('Reprocessar com IA? A avaliação atual será sobrescrita.');
    if (!ok) return;
    await reprocessMut.mutateAsync(sub.id);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`${sub.shortId} · ${sub.students.map((s) => s.name.split(' ')[0]).join(', ')}`}
      width={640}
    >
      <div className="space-y-5 px-6 py-6">
        {/* Meta header */}
        <div className="flex items-center justify-between rounded-sm border border-border bg-bg px-3 py-2 text-xs">
          <StatusDot status={sub.status} />
          {sub.submittedAt && (
            <span className="font-mono text-text-muted">
              {sub.submittedAt.toDate().toLocaleString('pt-BR')}
            </span>
          )}
        </div>

        {sub.status === 'AI_PROCESSING' && (
          <div className="flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs text-primary">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            IA processando este trabalho agora…
          </div>
        )}

        {sub.status === 'WAITING_FOR_AI' && sub.ai?.error && (
          <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <div>
              <b>Falha na IA</b>
              <p className="mt-1 font-mono text-[10px] opacity-80">{sub.ai.error}</p>
            </div>
          </div>
        )}

        {/* Arquivo original */}
        <section>
          <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
            Arquivo entregue
          </h3>
          <PdfPreview
            submissionId={sub.id}
            mimeType={sub.file.mimeType}
            fileName={sub.file.fileName}
          />
        </section>

        {/* Texto OCR (toggleable) */}
        {sub.ai?.extractedText && (
          <section>
            <button
              type="button"
              onClick={() => setShowOcr((v) => !v)}
              className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-text-muted hover:text-text-secondary"
            >
              <FileText className="h-3 w-3" />
              Texto extraído pela IA {showOcr ? '(ocultar)' : '(ver)'}
            </button>
            {showOcr && (
              <pre className="mt-2 max-h-48 overflow-y-auto rounded-sm border border-border bg-bg p-3 font-mono text-[10px] leading-relaxed text-text-secondary">
                {sub.ai.extractedText}
              </pre>
            )}
            {sub.ai.truncationNotice && (
              <p className="mt-2 text-[10px] text-warning">{sub.ai.truncationNotice}</p>
            )}
          </section>
        )}

        {/* Plágio scores */}
        {sub.plagiarism && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Integridade
            </h3>
            <div className="space-y-2">
              <ProgressBar
                label="Probabilidade de IA na escrita"
                value={sub.plagiarism.aiProbability ?? 0}
                max={1}
              />
              <ProgressBar
                label="Similaridade com outros grupos"
                value={sub.plagiarism.similarityScore ?? 0}
                max={1}
              />
            </div>
          </section>
        )}

        {/* Rubrica */}
        {aiEval && discipline && (
          <section>
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Rubrica {manuallyAdjusted && <span className="text-primary">· ajustada</span>}
            </h3>
            <RubricReviewEditor
              criteria={discipline.rubric.criteria}
              aiScores={aiEval.criterionScores}
              scores={scores}
              onChange={setScores}
              readOnly={sub.status === 'APPROVED' || sub.status === 'REJECTED'}
            />
          </section>
        )}

        {/* Relatório da IA */}
        {aiEval?.report && (
          <section>
            <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Relatório da IA
            </h3>
            <p className="rounded-sm border border-border bg-bg p-3 text-xs leading-relaxed text-text-secondary">
              {aiEval.report}
            </p>
          </section>
        )}

        {/* Feedback do professor */}
        {canPublish && (
          <section>
            <Textarea
              label="Feedback pro aluno (opcional)"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Comentários adicionais — ficará registrado no histórico"
              hint="Visível no futuro canal de consulta por protocolo"
            />
          </section>
        )}

        {/* Modo reject */}
        {rejectMode && (
          <section className="rounded-sm border border-danger/30 bg-danger/5 p-3">
            <Textarea
              label="Motivo da devolução"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex: arquivo incompleto, fora do formato pedido…"
            />
          </section>
        )}
      </div>

      {/* Footer de ações */}
      <footer className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-bg-surface px-6 py-4">
        {rejectMode ? (
          <>
            <Button variant="ghost" onClick={() => setRejectMode(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleReject()}
              loading={rejectMut.isPending}
              disabled={!rejectReason.trim()}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Confirmar devolução
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-2">
              {canReprocess && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleReprocess()}
                  loading={reprocessMut.isPending}
                  leftIcon={<RefreshCw className="h-3 w-3" />}
                >
                  Reprocessar
                </Button>
              )}
              {canReject && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRejectMode(true)}
                  leftIcon={<X className="h-3 w-3" />}
                >
                  Devolver
                </Button>
              )}
            </div>
            {canPublish && aiEval && (
              <Button
                onClick={() => void handlePublish()}
                loading={publishMut.isPending}
                leftIcon={<Check className="h-3.5 w-3.5" />}
              >
                {sub.status === 'APPROVED' ? 'Atualizar nota' : `Publicar ${finalScore.toFixed(1)}`}
              </Button>
            )}
          </>
        )}
      </footer>
    </Drawer>
  );
}

function ProgressBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = (value / max) * 100;
  const color = pct >= 70 ? 'bg-danger' : pct >= 40 ? 'bg-warning' : 'bg-success';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono tabular-nums text-text-muted">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-pill bg-bg">
        <div className={cn('h-full transition-all', color)} style={{ width: `${String(pct)}%` }} />
      </div>
    </div>
  );
}
