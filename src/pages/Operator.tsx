
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wifi, WifiOff, LogOut } from "lucide-react";
import { SearchHeader } from "@/components/operator/SearchHeader";
import { PieceCard } from "@/components/operator/PieceCard";
import { ProductionForm } from "@/components/operator/ProductionForm";
import { LoginForm } from "@/components/operator/LoginForm";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Batch {
  id: string;
  code: string;
  name: string;
  status: string;
  pieces: Piece[];
}

interface Piece {
  id: string;
  code: string;
  description: string;
  color?: string;
  quantity: number;
  produced_quantity: number;
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
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
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
          fetchBatches();
        } else {
          setShowLoginForm(true);
        }
      } catch (e) {
        setShowLoginForm(true);
      }
    } else {
      setShowLoginForm(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLoginForm(false);
    const storedUser = localStorage.getItem('operatorUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
    fetchBatches();
  };
  
  const handleLogout = () => {
    localStorage.removeItem('operatorUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setShowLoginForm(true);
    setBatches([]);
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

          const piecesWithStatus = (pieces || []).map(piece => ({
            ...piece,
            completed: piece.produced_quantity >= piece.quantity
          }));

          return { ...batch, pieces: piecesWithStatus };
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

  const handleSubmit = async (data: { pieceId: string; production: number; rework: number; reason: string; operatorName: string }) => {
    try {
      // Registrar apontamento de produção
      const { error: recordError } = await supabase
        .from('production_records')
        .insert({
          piece_id: data.pieceId,
          operator_name: data.operatorName,
          quantity_produced: data.production,
          quantity_rework: data.rework > 0 ? data.rework : null,
          notes: data.reason || null,
        });

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
    rework: 0, // We don't have rework data in the current schema
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
              <LoginForm 
                open={showLoginForm} 
                onClose={() => {}} 
                onSuccess={handleLoginSuccess} 
              />
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
      />
    </div>
  );
};

export default Operator;
