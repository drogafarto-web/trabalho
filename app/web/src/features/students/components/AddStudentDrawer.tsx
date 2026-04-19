import { useState } from 'react';
import { Drawer } from '@/shared/ui/Drawer';
import { Input, Textarea } from '@/shared/ui/Input';
import { Button } from '@/shared/ui/Button';
import { StudentInputSchema } from '@/core/domain/student';
import { useCreateStudent } from '../lib/use-students';

interface Props {
  open: boolean;
  onClose: () => void;
  disciplineId: string;
  disciplineName: string;
}

export function AddStudentDrawer({ open, onClose, disciplineId, disciplineName }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMut = useCreateStudent();

  const handleSubmit = async () => {
    setError(null);
    const parsed = StudentInputSchema.safeParse({
      name,
      email: email || null,
      note: note || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }

    try {
      await createMut.mutateAsync({ input: parsed.data, disciplineId });
      setName('');
      setEmail('');
      setNote('');
      onClose();
    } catch (err) {
      console.error('[add student] erro:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title={`Novo aluno — ${disciplineName}`} width={440}>
      <div className="space-y-4 px-6 py-6">
        <Input
          label="Nome do aluno"
          name="name"
          placeholder="ALICE SOARES MOREIRA"
          value={name}
          onChange={(e) => setName(e.target.value.toUpperCase())}
          autoFocus
        />
        <Input
          label="E-mail (opcional)"
          name="email"
          type="email"
          placeholder="aluno@institucional.edu.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Textarea
          label="Observações (opcional)"
          name="note"
          rows={3}
          placeholder="Ex: aluno de intercâmbio, precisa de prazo estendido, etc."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          hint="Visível apenas para você, nunca para o aluno."
        />

        {error && (
          <div className="rounded-sm border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            {error}
          </div>
        )}
      </div>

      <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-border bg-bg-surface px-6 py-4">
        <Button variant="ghost" onClick={onClose} disabled={createMut.isPending}>
          Cancelar
        </Button>
        <Button onClick={() => void handleSubmit()} loading={createMut.isPending}>
          Adicionar aluno
        </Button>
      </footer>
    </Drawer>
  );
}
