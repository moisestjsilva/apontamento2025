import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginForm = ({ open, onClose, onSuccess }: LoginFormProps) => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Buscar usuários com o email fornecido
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .eq('role', 'operator');

      if (error) throw error;

      // Verificar se encontrou algum usuário
      if (!users || users.length === 0) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado ou inativo",
          variant: "destructive",
        });
        return;
      }

      const user = users[0];

      // Atualizar último login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Armazenar informações do usuário no localStorage
      localStorage.setItem('operatorUser', JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loggedIn: true
      }));

      toast({
        title: "Sucesso",
        description: `Bem-vindo, ${user.name}!`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast({
        title: "Erro",
        description: "Falha ao fazer login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Login do Apontador</span>
          </DialogTitle>
          <DialogDescription>
            Faça login para acessar o sistema de apontamento de produção
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleLogin} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="operador1@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use: operador1@empresa.com ou operador2@empresa.com
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};