
-- Criar tabela de lotes (batches)
CREATE TABLE public.batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  status TEXT NOT NULL DEFAULT 'Em andamento' CHECK (status IN ('Em andamento', 'Concluído', 'Pausado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de peças (pieces)
CREATE TABLE public.pieces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  produced_quantity INTEGER NOT NULL DEFAULT 0 CHECK (produced_quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(batch_id, code)
);

-- Criar tabela de apontamentos de produção (production_records)
CREATE TABLE public.production_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  piece_id UUID NOT NULL REFERENCES public.pieces(id) ON DELETE CASCADE,
  operator_name TEXT NOT NULL,
  quantity_produced INTEGER NOT NULL CHECK (quantity_produced > 0),
  production_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security (RLS) nas tabelas
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pieces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_records ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS para permitir acesso público (já que não há autenticação ainda)
CREATE POLICY "Allow all operations on batches" ON public.batches FOR ALL USING (true);
CREATE POLICY "Allow all operations on pieces" ON public.pieces FOR ALL USING (true);
CREATE POLICY "Allow all operations on production_records" ON public.production_records FOR ALL USING (true);

-- Criar índices para melhor performance
CREATE INDEX idx_pieces_batch_id ON public.pieces(batch_id);
CREATE INDEX idx_production_records_piece_id ON public.production_records(piece_id);
CREATE INDEX idx_batches_status ON public.batches(status);
CREATE INDEX idx_production_records_date ON public.production_records(production_date);

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pieces_updated_at BEFORE UPDATE ON public.pieces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
