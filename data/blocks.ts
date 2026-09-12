export type Andar = 'terreo' | 'andar1';

export interface BlocoInfo {
  id: string;
  nome: string;
  andares: Andar[];
  nota?: string;
}

export const blocos: BlocoInfo[] = [
  { id: 'administracao', nome: 'Administração', andares: ['terreo', 'andar1'] },
  { id: 'biblioteca', nome: 'Biblioteca e Auditório', andares: ['terreo'] },
  { id: 'complementar', nome: 'Recortes 04/05', andares: ['terreo'], nota: 'Recortes 04/05: pavimento e ligação com o térreo a confirmar.' },
];

export const andarLabel: Record<Andar, string> = { terreo: 'Térreo', andar1: '1º Andar' };

export const findBloco = (id: string): BlocoInfo | undefined => blocos.find(bloco => bloco.id === id);
