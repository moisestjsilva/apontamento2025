
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Edit, Trash2, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BatchForm } from "./BatchForm";

interface Batch {
  id: string;
  code: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: string;
  color: string;
  created_at: string;
  pieces?: Piece[];
}

interface Piece {
  id: string;
  code: string;
  description: string;
  color?: string;
  quantity: number;
  produced_quantity: number;
  rework_total?: number;
}

interface BatchListProps {
  onRefresh?: () => void;
}

export const BatchList = ({ onRefresh }: BatchListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const { toast } = useToast();

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*')
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

          // Buscar dados de retrabalho para cada peça do lote
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
                rework_total: totalRework
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
        description: "Erro ao carregar lotes do banco de dados",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [onRefresh]);

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Tem certeza que deseja excluir este lote? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('batches')
        .delete()
        .eq('id', batchId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lote excluído com sucesso!",
      });

      fetchBatches();
    } catch (error: any) {
      console.error('Erro ao excluir lote:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir lote",
        variant: "destructive",
      });
    }
  };

  const filteredBatches = batches.filter(batch =>
    batch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Concluído":
        return "default";
      case "Em andamento":
        return "secondary";
      default:
        return "outline";
    }
  };

  const isOverdue = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    return end < today;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando lotes...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Gestão de Lotes</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os lotes de produção ({batches.length} lotes)
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchBatches}
            disabled={isLoading}
          >
            {isLoading ? "Carregando..." : "Atualizar"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lotes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Batches Grid */}
        {filteredBatches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum lote encontrado com este termo de busca." : "Nenhum lote cadastrado ainda."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBatches.map((batch) => {
              // Calcular totais do lote
              const totalPlanned = batch.pieces?.reduce((sum, piece) => sum + piece.quantity, 0) || 0;
              const totalProduced = batch.pieces?.reduce((sum, piece) => sum + piece.produced_quantity, 0) || 0;
              const totalRework = batch.pieces?.reduce((sum, piece) => sum + (piece.rework_total || 0), 0) || 0;
              const progressPercentage = totalPlanned > 0 ? Math.min((totalProduced / totalPlanned) * 100, 100) : 0;

              return (
                <Card 
                  key={batch.id} 
                  className="border hover:bg-muted/50 transition-colors"
                  style={{
                    borderColor: batch.color,
                    backgroundColor: `${batch.color}15`,
                    borderWidth: '2px'
                  }}
                >
                  <CardContent className="p-4">
                    {/* Header com nome, código e status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{batch.name}</h3>
                        <Badge variant="outline" className="font-mono">{batch.code}</Badge>
                        <Badge variant={getStatusVariant(batch.status)}>
                          {batch.status}
                        </Badge>
                        {isOverdue(batch.end_date) && batch.status !== "Concluído" && (
                          <Badge variant="destructive">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBatch(batch)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setEditingBatch(batch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteBatch(batch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Informações do lote */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Criado em:</span>
                        <p className="font-medium">{new Date(batch.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Início:</span>
                        <p className="font-medium">{new Date(batch.start_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Fim:</span>
                        <p className="font-medium">{new Date(batch.end_date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total de Peças:</span>
                        <p className="font-medium">{batch.pieces?.length || 0}</p>
                      </div>
                    </div>

                    {/* Números de produção */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{totalProduced}</div>
                        <div className="text-sm text-muted-foreground">Produzido</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-muted-foreground">{totalPlanned}</div>
                        <div className="text-sm text-muted-foreground">Planejado</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xl font-bold ${totalRework > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {totalRework}
                        </div>
                        <div className="text-sm text-muted-foreground">Retrabalho</div>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className="h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${progressPercentage}%`,
                            backgroundColor: progressPercentage >= 100 
                              ? '#10b981' // verde para lotes completos
                              : totalRework > 0 
                                ? '#f97316' // laranja para lotes com retrabalho
                                : batch.color // cor do lote
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Batch Details Dialog */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedBatch?.name}</DialogTitle>
            <DialogDescription>
              Detalhes das peças do lote {selectedBatch?.code}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={getStatusVariant(selectedBatch.status)} className="ml-2">
                    {selectedBatch.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Criado em:</span>
                  <p className="font-medium">{new Date(selectedBatch.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="font-medium">{selectedBatch.description || "Sem descrição"}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Peças do Lote ({selectedBatch.pieces?.length || 0})</h4>
                {selectedBatch.pieces && selectedBatch.pieces.length > 0 ? (
                  <div className="space-y-2">
                    {selectedBatch.pieces.map((piece) => (
                      <Card key={piece.id} className="border">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge variant="outline">{piece.code}</Badge>
                                <span className="font-medium">{piece.description}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Cor: {piece.color || "Não especificado"}</p>
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-medium">
                                {piece.produced_quantity}/{piece.quantity}
                              </div>
                              <div className="text-muted-foreground">
                                {Math.round((piece.produced_quantity / piece.quantity) * 100)}% concluído
                              </div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  piece.produced_quantity >= piece.quantity ? 'bg-green-500' : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min((piece.produced_quantity / piece.quantity) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhuma peça cadastrada neste lote.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Batch Dialog */}
      {editingBatch && (
        <BatchForm 
          onClose={() => setEditingBatch(null)} 
          onSuccess={() => {
            setEditingBatch(null);
            fetchBatches();
          }}
          batchToEdit={editingBatch}
        />
      )}
    </Card>
  );
};
