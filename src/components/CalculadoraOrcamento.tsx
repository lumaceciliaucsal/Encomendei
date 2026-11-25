import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  calcularOrcamentoArtesanal,
  formatarMoedaBrl,
  type CalculadoraResultado,
  type ItemMaterialCalculadora,
} from '../lib/regras';

export interface DadosOrcamentoGerado {
  itensMateriais: ItemMaterialCalculadora[];
  horasTrabalho: number;
  valorHora: number;
  percentualIndireto: number;
  percentualMargem: number;
  percentualTaxa: number;
  descontoValor: number;
  prazoEstimadoDias: number;
  validadeDias: number;
  observacoes: string;
  resultado: CalculadoraResultado;
}

interface CalculadoraOrcamentoProps {
  valorHoraInicial?: number;
  margemInicial?: number;
  taxaInicial?: number;
  indiretoInicial?: number;
  prazoInicialDias?: number;
  modoCompacto?: boolean;
  textoBotaoSalvar?: string;
  salvando?: boolean;
  onSalvarOrcamento?: (dados: DadosOrcamentoGerado) => void | Promise<void>;
}

export function CalculadoraOrcamento({
  valorHoraInicial = 55,
  margemInicial = 35,
  taxaInicial = 4.99,
  indiretoInicial = 12,
  prazoInicialDias = 14,
  modoCompacto = false,
  textoBotaoSalvar = 'Salvar nova versão de orçamento',
  salvando = false,
  onSalvarOrcamento,
}: CalculadoraOrcamentoProps) {
  const [itens, setItens] = useState<ItemMaterialCalculadora[]>([
    { id: 'mat-1', nome: 'Matéria-prima principal', quantidade: 2, custoUnitario: 42 },
    { id: 'mat-2', nome: 'Aviamentos / embalagem', quantidade: 1, custoUnitario: 24 },
  ]);
  const [horasTrabalho, setHorasTrabalho] = useState<number>(6);
  const [valorHora, setValorHora] = useState<number>(valorHoraInicial);
  const [percentualIndireto, setPercentualIndireto] = useState<number>(indiretoInicial);
  const [percentualMargem, setPercentualMargem] = useState<number>(margemInicial);
  const [percentualTaxa, setPercentualTaxa] = useState<number>(taxaInicial);
  const [descontoValor, setDescontoValor] = useState<number>(0);
  const [percentualSinal, setPercentualSinal] = useState<number>(50);
  const [prazoEstimadoDias, setPrazoEstimadoDias] = useState<number>(prazoInicialDias);
  const [validadeDias, setValidadeDias] = useState<number>(10);
  const [observacoes, setObservacoes] = useState<string>('');

  const resultado = useMemo(
    () =>
      calcularOrcamentoArtesanal({
        itensMateriais: itens,
        horasTrabalho,
        valorHora,
        percentualIndireto,
        percentualMargem,
        percentualTaxa,
        descontoValor,
        percentualSinal,
      }),
    [
      itens,
      horasTrabalho,
      valorHora,
      percentualIndireto,
      percentualMargem,
      percentualTaxa,
      descontoValor,
      percentualSinal,
    ]
  );

  const adicionarMaterial = () => {
    if (itens.length >= 25) return;
    setItens((prev) => [
      ...prev,
      {
        id: `mat-${Date.now()}`,
        nome: 'Novo insumo',
        quantidade: 1,
        custoUnitario: 0,
      },
    ]);
  };

  const atualizarItem = (
    id: string,
    campo: keyof ItemMaterialCalculadora,
    valor: string | number
  ) => {
    setItens((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [campo]: valor } : it))
    );
  };

  const removerItem = (id: string) => {
    setItens((prev) => prev.filter((it) => it.id !== id));
  };

  return (
    <div className={`grid gap-6 ${modoCompacto ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-12'}`}>
      <div className={`${modoCompacto ? '' : 'lg:col-span-7'} space-y-5`}>
        {/* Materiais */}
        <div className="bg-white border border-[#E4DFEC] rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-display text-base font-semibold text-[#2D254E]">
                Materiais e insumos
              </h3>
              <p className="text-xs text-[#728168]">
                Liste tecidos, argilas, ferragens ou embalagens usadas na peça.
              </p>
            </div>
            <button
              type="button"
              onClick={adicionarMaterial}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E4DFEC] text-xs font-medium text-[#2D254E] hover:bg-[#F4F2F7] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </button>
          </div>

          <div className="space-y-2.5">
            {itens.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-2 items-center"
              >
                <input
                  type="text"
                  value={item.nome}
                  onChange={(e) => atualizarItem(item.id, 'nome', e.target.value)}
                  placeholder="Nome do material"
                  aria-label="Nome do material"
                  className="col-span-6 px-3 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={item.quantidade}
                  onChange={(e) =>
                    atualizarItem(item.id, 'quantidade', Number(e.target.value))
                  }
                  aria-label="Quantidade"
                  className="col-span-2 px-2.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                />
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={item.custoUnitario}
                  onChange={(e) =>
                    atualizarItem(item.id, 'custoUnitario', Number(e.target.value))
                  }
                  aria-label="Custo unitário em reais"
                  className="col-span-3 px-2.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                />
                <button
                  type="button"
                  onClick={() => removerItem(item.id)}
                  aria-label="Remover material"
                  className="col-span-1 flex items-center justify-center p-2 text-[#728168] hover:text-[#2D254E] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mão de obra e parâmetros */}
        <div className="bg-white border border-[#E4DFEC] rounded-xl p-5">
          <h3 className="font-display text-base font-semibold text-[#2D254E] mb-4">
            Tempo de bancada, custos e margem
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Horas de trabalho
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={horasTrabalho}
                onChange={(e) => setHorasTrabalho(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Valor da hora (R$)
              </span>
              <input
                type="number"
                min={0}
                step="1"
                value={valorHora}
                onChange={(e) => setValorHora(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Custos fixos (%)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="1"
                value={percentualIndireto}
                onChange={(e) => setPercentualIndireto(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Margem de lucro (%)
              </span>
              <input
                type="number"
                min={0}
                max={300}
                step="1"
                value={percentualMargem}
                onChange={(e) => setPercentualMargem(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Taxa maquininha (%)
              </span>
              <input
                type="number"
                min={0}
                max={45}
                step="0.1"
                value={percentualTaxa}
                onChange={(e) => setPercentualTaxa(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#728168] mb-1">
                Desconto (R$)
              </span>
              <input
                type="number"
                min={0}
                step="5"
                value={descontoValor}
                onChange={(e) => setDescontoValor(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
              />
            </label>
          </div>

          {onSalvarOrcamento && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#E4DFEC]">
              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Prazo de entrega (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={prazoEstimadoDias}
                  onChange={(e) => setPrazoEstimadoDias(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E]"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Validade da proposta (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={validadeDias}
                  onChange={(e) => setValidadeDias(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E]"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Sinal de entrada (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={percentualSinal}
                  onChange={(e) => setPercentualSinal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E]"
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="block text-xs font-medium text-[#728168] mb-1">
                  Observações comerciais para esta versão
                </span>
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Ex.: Inclui acabamento em verniz fosco e embalagem para presente."
                  className="w-full px-3 py-2 text-sm bg-[#FAF9FC] border border-[#E4DFEC] rounded-lg text-[#2D254E] focus:outline-none focus:border-[#D065D6]"
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Resumo calculado */}
      <div className={`${modoCompacto ? '' : 'lg:col-span-5'}`}>
        <div className="bg-[#2D254E] text-white rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs text-white/70 mb-1">Preço sugerido ao cliente</p>
            <p className="font-display text-3xl sm:text-4xl font-semibold font-mono tabular-nums tracking-tight">
              {formatarMoedaBrl(resultado.valorTotal)}
            </p>
          </div>

          <div className="space-y-2.5 text-sm border-t border-white/15 pt-4">
            <div className="flex justify-between gap-4">
              <span className="text-white/75">Materiais</span>
              <span className="font-mono tabular-nums">{formatarMoedaBrl(resultado.custoMateriais)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/75">Mão de obra ({horasTrabalho}h)</span>
              <span className="font-mono tabular-nums">{formatarMoedaBrl(resultado.custoMaoDeObra)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/75">Custos indiretos ({percentualIndireto}%)</span>
              <span className="font-mono tabular-nums">{formatarMoedaBrl(resultado.custoIndireto)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/75">Taxa de pagamento ({percentualTaxa}%)</span>
              <span className="font-mono tabular-nums">{formatarMoedaBrl(resultado.taxaPagamento)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-2 border-t border-white/15">
              <span className="text-white/85 font-medium">Lucro líquido estimado</span>
              <span className="font-mono tabular-nums font-semibold text-[#94D665]">
                {formatarMoedaBrl(resultado.lucroLiquidoEstimado)} ({resultado.margemRealPercentual}%)
              </span>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-white/70">Sinal ({percentualSinal}%)</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-white">
                {formatarMoedaBrl(resultado.sinalEntrada)}
              </span>
            </div>
            <div>
              <span className="block text-white/70">Na entrega</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-white">
                {formatarMoedaBrl(resultado.saldoEntrega)}
              </span>
            </div>
          </div>

          {onSalvarOrcamento && (
            <button
              type="button"
              disabled={salvando}
              onClick={() =>
                onSalvarOrcamento({
                  itensMateriais: itens,
                  horasTrabalho,
                  valorHora,
                  percentualIndireto,
                  percentualMargem,
                  percentualTaxa,
                  descontoValor,
                  prazoEstimadoDias,
                  validadeDias,
                  observacoes,
                  resultado,
                })
              }
              className="w-full py-3 px-4 rounded-lg bg-[#94D665] text-[#2D254E] text-sm font-semibold hover:bg-[#94D665]/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {salvando ? 'Salvando versão...' : textoBotaoSalvar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
