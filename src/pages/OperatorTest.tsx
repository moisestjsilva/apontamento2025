import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const OperatorTest = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se o usuário já está autenticado
    const storedUser = localStorage.getItem('operatorUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.loggedIn) {
          setIsAuthenticated(true);
          setCurrentUser(userData);
        }
      } catch (e) {
        console.error('Erro ao carregar usuário:', e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBatches();
    }
  }, [isAuthenticated]);

  const handleQuickLogin = async (email: string) => {
    console.log('🔐 Iniciando login para:', email);
    setIsLoading(true);

    try {
      console.log('📡 Fazendo query para usuários...');
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('active', true)
        .eq('role', 'operator');

      if (error) {
        console.error('❌ Erro na query de usuários:', error);
        throw error;
      }

      console.log('✅ Usuários encontrados:', users?.length || 0);
      console.log('👤 Dados do usuário:', users);

      if (!users || users.length === 0) {
        console.log('❌ Nenhum usuário encontrado');
        toast({
          title: "Erro",
          description: "Usuário não encontrado ou inativo",
          variant: "destructive",
        });
        return;
      }

      const user = users[0];
      console.log('✅ Usuário selecionado:', user.name);

      // Atualizar último login
      console.log('📡 Atualizando último login...');
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Armazenar informações do usuário no localStorage
      const userData = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loggedIn: true
      };

      console.log('💾 Salvando dados no localStorage...');
      localStorage.setItem('operatorUser', JSON.stringify(userData));

      toast({
        title: "Sucesso",
        description: `Bem-vindo, ${user.name}!`,
      });

      console.log('✅ Login realizado com sucesso');
      setIsAuthenticated(true);
      setCurrentUser(userData);
      
    } catch (error: any) {
      console.error('❌ Erro geral no login:', error);
      toast({
        title: "Erro",
        description: `Falha ao fazer login: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finalizando processo de login...');
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      console.log('🔄 Iniciando busca de lotes...');
      setIsLoading(true);
      
      console.log('📡 Fazendo query para batches...');
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('status', 'Em andamento')
        .order('created_at', { ascending: false });

      if (batchesError) {
        console.error('❌ Erro na query de batches:', batchesError);
        throw batchesError;
      }

      console.log('✅ Batches encontrados:', batchesData?.length || 0);
      console.log('📦 Dados dos batches:', batchesData);

      console.log('🔄 Buscando peças para cada lote...');
      const batchesWithPieces = await Promise.all(
        (batchesData || []).map(async (batch, index) => {
          console.log(`📡 Buscando peças para lote ${index + 1}/${batchesData?.length}: ${batch.name}`);
          
          const { data: pieces, error: piecesError } = await supabase
            .from('pieces')
            .select('*')
            .eq('batch_id', batch.id);

          if (piecesError) {
            console.error(`❌ Erro ao buscar peças do lote ${batch.name}:`, piecesError);
            return { ...batch, pieces: [] };
          }

          console.log(`✅ Peças encontradas para ${batch.name}:`, pieces?.length || 0);

          const piecesWithStatus = (pieces || []).map(piece => ({
            ...piece,
            completed: piece.produced_quantity >= piece.quantity
          }));

          return { ...batch, pieces: piecesWithStatus };
        })
      );

      console.log('✅ Processamento completo. Total de lotes:', batchesWithPieces.length);
      setBatches(batchesWithPieces);
      
      toast({
        title: "Sucesso",
        description: `${batchesWithPieces.length} lote(s) carregado(s)`,
      });
      
    } catch (error: any) {
      console.error('❌ Erro geral ao buscar lotes:', error);
      toast({
        title: "Erro",
        description: `Erro ao carregar dados: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 Finalizando busca de lotes...');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('operatorUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBatches([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-6 w-6 text-primary" />
                <span>Sistema de Produção - TESTE</span>
              </CardTitle>
              <CardDescription>
                Painel do Apontador - Versão de Teste
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="operador1@empresa.com"
                      className="w-full pl-10 pr-3 py-2 border border-input bg-background rounded-md text-sm"
                      defaultValue="operador1@empresa.com"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const email = (e.target as HTMLInputElement).value;
                          if (email) {
                            handleQuickLogin(email);
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use: operador1@empresa.com ou operador2@empresa.com
                  </p>
                </div>
                <Button 
                  onClick={() => {
                    const emailInput = document.getElementById('email') as HTMLInputElement;
                    if (emailInput?.value) {
                      handleQuickLogin(emailInput.value);
                    }
                  }}
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Apontamento - TESTE</h1>
                <p className="text-sm text-muted-foreground">Sistema funcionando!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{currentUser?.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">✅ Sistema Funcionando!</h2>
          <p className="text-muted-foreground">
            A tela de apontamento está carregando corretamente. 
            {batches.length > 0 ? ` Encontrados ${batches.length} lote(s) ativo(s).` : ' Nenhum lote ativo encontrado.'}
          </p>
        </div>

        {batches.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum lote ativo encontrado.</p>
                <Button onClick={fetchBatches} className="mt-4">
                  Recarregar
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {batches.map((batch) => (
              <Card key={batch.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Package className="h-5 w-5 text-primary" />
                    <span>{batch.name}</span>
                    <Badge variant="outline" className="ml-auto">{batch.code}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {batch.pieces.length} peças no lote • Status: {batch.status}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {batch.pieces.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      Nenhuma peça cadastrada neste lote.
                    </p>
                  ) : (
                    <div className="grid gap-4">
                      {batch.pieces.map((piece: any) => (
                        <Card key={piece.id} className="cursor-pointer hover:bg-muted/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge variant="outline">{piece.code}</Badge>
                                  {piece.completed && <Badge variant="default">✅ Completo</Badge>}
                                </div>
                                <h4 className="font-medium">{piece.description}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Produzido: {piece.produced_quantity}/{piece.quantity}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                  {Math.round((piece.produced_quantity / piece.quantity) * 100)}%
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OperatorTest;