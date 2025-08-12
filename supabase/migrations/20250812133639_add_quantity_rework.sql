-- Adicionar coluna quantity_rework à tabela production_records
ALTER TABLE public.production_records ADD COLUMN quantity_rework INTEGER;

-- Modificar a restrição de quantity_produced para permitir zero quando quantity_rework > 0
ALTER TABLE public.production_records DROP CONSTRAINT IF EXISTS production_records_quantity_produced_check;
ALTER TABLE public.production_records ADD CONSTRAINT production_records_quantity_produced_check CHECK (quantity_produced >= 0);

-- Adicionar restrição para garantir que pelo menos um dos campos (quantity_produced ou quantity_rework) seja maior que zero
ALTER TABLE public.production_records ADD CONSTRAINT production_records_quantity_check CHECK (quantity_produced > 0 OR quantity_rework > 0);