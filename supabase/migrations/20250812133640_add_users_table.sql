-- Criar tabela de usuários (users)
CREATE TABLE public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Habilitar Row Level Security (RLS) na tabela
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para permitir acesso público (temporário)
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true);

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuários iniciais
INSERT INTO public.users (name, email, password, role, active)
VALUES 
  ('Admin', 'admin@empresa.com', 'admin123', 'admin', true),
  ('Operador 1', 'operador1@empresa.com', 'operador123', 'operator', true),
  ('Operador 2', 'operador2@empresa.com', 'operador123', 'operator', true);

-- Atualizar tabela production_records para referenciar usuários
ALTER TABLE public.production_records ADD COLUMN user_id UUID REFERENCES public.users(id);