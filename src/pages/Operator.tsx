
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wifi, WifiOff, LogOut, User } from "lucide-react";
import { SearchHeader } from "@/components/operator/SearchHeader";
import { PieceCard } from "@/components/operator/PieceCard";
import { ProductionForm } from "@/components/operator/ProductionForm";

import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Batch {
  id: string;
  code: string;
  name: string;
  status: string;
  color?: string;
  pieces: Piece[];
}

interface Piece {
  id: string;
  code: string;
  description: string;
  color?: string;
  quantity: number;
  produced_quantity: number;
  rework_total?: number;
  completed: boolean;
}

// Interface for PieceCard component
interface PieceCardData {
  id: string;
  code: string;
  description: string;
  color: string;
  planned: number;
  produced: number;
  rework: number;
  completed: boolean;
}

const Operator = () => {
  const [selectedPiece, setSelectedPiece] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { isOnline, saveRecord, hasPendingRecords } = useOfflineStorage();
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
        console.error('Erro ao carregar usuário do localStorage:', e);
      }
    }
    setIsInitializing(false);
  }, []);

  // Separar o useEffect para fetchBatches
  useEffect(() => {
    if (isAuthenticated) {
      fetchBatches();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem('operatorUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setBatches([]);
  };

  const handleQuickLogin = async (email: string) => {
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

      setIsAuthenticated(true);
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loggedIn: true
      });

      // Não chamar fetchBatches aqui pois será chamado pelo useEffect
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

  const fetchBatches = async () => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);

      // Buscar lotes ativos
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
        .eq('status', 'Em andamento')
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      // Buscar peças para cada lote
      const batchesWithPieces = await Promise.all(
        (batchesData || []).map(async (batch) => {
          const { data: pieces, error: piecesError } = await supabase
            .from('pieces')
            .select('*')
            .eq('batch_id', batch.id);

          if (piecesError) {
            console.error('Erro ao buscar peças:', piecesError);
            return { ...batch, pieces: [] };
          }

          // Buscar dados de retrabalho para cada peça
          const piecesWithRework = await Promise.all(
            (pieces || []).map(async (piece) => {
              const { data: reworkData, error: reworkError } = await supabase
                .from('production_records')
                .select('quantity_rework')
                .eq('piece_id', piece.id)
                .not('quantity_rework', 'is', null);

              if (reworkError) {
                console.error('Erro ao buscar dados de retrabalho:', reworkError);
              }

              // Calcular total de retrabalho
              const totalRework = (reworkData || []).reduce((sum, record) =>
                sum + (record.quantity_rework || 0), 0
              );

              return {
                ...piece,
                rework_total: totalRework,
                completed: piece.produced_quantity >= piece.quantity
              };
            })
          );

          return { ...batch, pieces: piecesWithRework };
        })
      );

      setBatches(batchesWithPieces);
    } catch (error: any) {
      console.error('Erro ao buscar lotes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do banco",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePieceSelect = (piece: any, batch: Batch) => {
    // Adiciona a cor do lote à peça selecionada
    setSelectedPiece({
      ...piece,
      batchColor: batch.color
    });
  };

  const handleBarcodeScanned = (code: string) => {
    // Find piece by barcode and its batch
    let foundPiece = null;
    let foundBatch = null;

    for (const batch of batches) {
      const piece = batch.pieces.find(p => p.code === code);
      if (piece) {
        foundPiece = piece;
        foundBatch = batch;
        break;
      }
    }

    if (foundPiece && foundBatch) {
      // Adiciona a cor do lote à peça selecionada
      setSelectedPiece({
        ...foundPiece,
        batchColor: foundBatch.color
      });

      toast({
        title: "Peça encontrada",
        description: `${foundPiece.code} - ${foundPiece.description}`,
      });
    } else {
      toast({
        title: "Código não encontrado",
        description: "Nenhuma peça encontrada com este código",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: { pieceId: string; production: number; rework: number; reason: string; reasonId?: string; observations: string; operatorName: string }) => {
    try {
      // Registrar apontamento de produção
      const recordData: any = {
        piece_id: data.pieceId,
        operator_name: data.operatorName,
        quantity_produced: data.production,
        quantity_rework: data.rework > 0 ? data.rework : null,
        notes: data.reason || null,
      };

      // Adicionar reasonId se fornecido
      if (data.reasonId) {
        recordData.rework_reason_id = data.reasonId;
      }

      // Adicionar observações se fornecidas
      if (data.observations.trim()) {
        recordData.notes = recordData.notes
          ? `${recordData.notes}\n\nObservações: ${data.observations.trim()}`
          : `Observações: ${data.observations.trim()}`;
      }

      const { error: recordError } = await supabase
        .from('production_records')
        .insert(recordData);

      if (recordError) throw recordError;

      // Atualizar quantidade produzida da peça apenas se houver produção
      if (data.production > 0) {
        const currentPiece = batches
          .flatMap(batch => batch.pieces)
          .find(piece => piece.id === data.pieceId);

        if (currentPiece) {
          const newProducedQuantity = currentPiece.produced_quantity + data.production;

          const { error: updateError } = await supabase
            .from('pieces')
            .update({ produced_quantity: newProducedQuantity })
            .eq('id', data.pieceId);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Sucesso",
        description: "Apontamento registrado com sucesso!",
      });

      // Recarregar dados
      fetchBatches();
      setSelectedPiece(null);
    } catch (error: any) {
      console.error('Erro ao salvar apontamento:', error);

      // Se estiver offline, salvar localmente
      if (!isOnline) {
        saveRecord(data);
        toast({
          title: "Salvo offline",
          description: "Apontamento salvo localmente. Será sincronizado quando conectar.",
        });
        setSelectedPiece(null);
      } else {
        toast({
          title: "Erro",
          description: error.message || "Erro ao salvar apontamento",
          variant: "destructive",
        });
      }
    }
  };

  // Function to convert Piece to PieceCardData
  const convertToPieceCardData = (piece: Piece, batch: Batch): PieceCardData => ({
    id: piece.id,
    code: piece.code,
    description: piece.description,
    color: batch.color || piece.color || "Não especificado",
    planned: piece.quantity,
    produced: piece.produced_quantity,
    rework: piece.rework_total || 0,
    completed: piece.completed
  });

  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.pieces.some(piece =>
      piece.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      piece.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SearchHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <main className="container mx-auto px-4 py-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Mostrar loading durante inicialização
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Inicializando...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Se não estiver autenticado, mostrar apenas o formulário de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-6 w-6 text-primary" />
                <span>Sistema de Produção</span>
              </CardTitle>
              <CardDescription>
                Painel do Apontador - Acesso Restrito
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
      <SearchHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <div className="container mx-auto px-4 py-2 flex justify-end">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">{currentUser.name}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {!isOnline && (
        <div className="container mx-auto px-4">
          <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Modo offline - Dados serão sincronizados quando conectar
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Records Indicator */}
      {hasPendingRecords && (
        <div className="container mx-auto px-4 pb-2">
          <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-3">
              <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                <Wifi className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Há registros pendentes para sincronização
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches List */}
      <main className="container mx-auto px-4 pb-6">
        {filteredBatches.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum lote encontrado com este termo de busca."
                    : "Nenhum lote ativo encontrado."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredBatches.map((batch) => (
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
                      {batch.pieces.map((piece) => (
                        <PieceCard
                          key={piece.id}
                          piece={convertToPieceCardData(piece, batch)}
                          onClick={() => handlePieceSelect(piece, batch)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <ProductionForm
        piece={selectedPiece}
        isOpen={!!selectedPiece}
        onClose={() => setSelectedPiece(null)}
        onSubmit={handleSubmit}
        currentUser={currentUser}
      />
    </div>
  );
};

export default Operator;
