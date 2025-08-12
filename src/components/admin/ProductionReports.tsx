import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ProductionReports = () => {
  const [reports, setReports] = useState({
    remaining: [],
    rework: [],
    productivity: [],
    summary: {
      totalProduced: 0,
      efficiency: 0,
      totalRework: 0,
      activeBatches: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);

      // Buscar todos os lotes com suas peças
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select(`
          *,
          pieces (
            id,
            code,
            description,
            quantity,
            produced_quantity
          )
        `)
        .order('created_at', { ascending: false });

      if (batchesError) throw batchesError;

      // Buscar dados de retrabalho agregados por peça
      const { data: reworkData, error: reworkError } = await supabase
        .from('production_records')
        .select(`
          quantity_rework,
          notes,
          piece_id,
          pieces (
            id,
            code,
            description,
            batch_id,
            batches (
              code,
              name
            )
          )
        `)
        .not('quantity_rework', 'is', null)
        .gt('quantity_rework', 0);

      if (reworkError) throw reworkError;

      // Processar dados
      const processedData = {
        remaining: [],
        rework: [],
        productivity: [],
        summary: {
          totalProduced: 0,
          efficiency: 0,
          totalRework: 0,
          activeBatches: 0
        }
      };

      // Calcular métricas por lote
      (batchesData || []).forEach(batch => {
        const totalPlanned = batch.pieces?.reduce((sum, piece) => sum + piece.quantity, 0) || 0;
        const totalProduced = batch.pieces?.reduce((sum, piece) => sum + piece.produced_quantity, 0) || 0;
        const remaining = totalPlanned - totalProduced;
        const progress = totalPlanned > 0 ? Math.min((totalProduced / totalPlanned) * 100, 100) : 0;

        // Dados de peças restantes
        if (remaining > 0) {
          processedData.remaining.push({
            batchId: batch.code,
            batchName: batch.name,
            remaining: remaining,
            total: totalPlanned
          });
        }

        // Dados de produtividade
        const today = new Date();
        const endDate = new Date(batch.end_date);
        const isOverdue = endDate < today && batch.status !== 'Concluído';
        
        let status = batch.status;
        if (batch.status === 'Concluído') {
          status = 'Concluído';
        } else if (isOverdue) {
          status = 'Atrasado';
        } else {
          status = 'No Prazo';
        }

        processedData.productivity.push({
          batchId: batch.code,
          batchName: batch.name,
          startDate: batch.start_date,
          targetDate: batch.end_date,
          progress: Math.round(progress),
          status: status
        });

        // Somar para métricas gerais
        processedData.summary.totalProduced += totalProduced;
        if (batch.status === 'Em andamento') {
          processedData.summary.activeBatches++;
        }
      });

      // Processar dados de retrabalho
      const reworkByPiece = {};
      let totalReworkQty = 0;

      (reworkData || []).forEach(record => {
        const pieceId = record.piece_id;
        const piece = record.pieces;
        
        if (pieceId && piece) {
          if (!reworkByPiece[pieceId]) {
            reworkByPiece[pieceId] = {
              batchId: piece.batches?.code || 'N/A',
              pieceCode: piece.code,
              description: piece.description,
              reworkQty: 0,
              reasons: []
            };
          }
          reworkByPiece[pieceId].reworkQty += record.quantity_rework || 0;
          if (record.notes && !reworkByPiece[pieceId].reasons.includes(record.notes)) {
            reworkByPiece[pieceId].reasons.push(record.notes);
          }
          totalReworkQty += record.quantity_rework || 0;
        }
      });

      // Converter reasons array para string
      processedData.rework = Object.values(reworkByPiece).map(item => ({
        ...item,
        reason: item.reasons.join('; ') || 'Não especificado'
      })).slice(0, 10); // Limitar a 10 itens
      processedData.summary.totalRework = totalReworkQty;

      // Calcular eficiência
      const totalPlannedAll = (batchesData || []).reduce((sum, batch) => 
        sum + (batch.pieces?.reduce((pieceSum, piece) => pieceSum + piece.quantity, 0) || 0), 0
      );
      
      processedData.summary.efficiency = totalPlannedAll > 0 
        ? Math.round(((processedData.summary.totalProduced / totalPlannedAll) * 100) * 10) / 10
        : 0;

      console.log('Dados processados:', processedData);
      setReports(processedData);

    } catch (error) {
      console.error('Erro ao buscar dados dos relatórios:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados dos relatórios",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);



  const getStatusVariant = (status) => {
    switch (status) {
      case "Concluído":
        return "success";
      case "No Prazo":
        return "secondary";
      case "Atrasado":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 100) return "bg-success";
    if (progress >= 75) return "bg-primary";
    if (progress >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Produção</h2>
          <p className="text-muted-foreground">Métricas e indicadores em tempo real</p>
        </div>
        <button
          onClick={fetchReportsData}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? "Carregando..." : "Atualizar Dados"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produzido</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : reports.summary.totalProduced.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.totalProduced > 0 ? (
                <span className="text-success">Dados atualizados</span>
              ) : (
                <span className="text-muted-foreground">Nenhuma produção registrada</span>
              )}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${reports.summary.efficiency}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.efficiency >= 90 ? (
                <span className="text-success">Excelente performance</span>
              ) : reports.summary.efficiency >= 70 ? (
                <span className="text-warning">Boa performance</span>
              ) : (
                <span className="text-destructive">Precisa melhorar</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrabalho</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : reports.summary.totalRework}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.totalProduced > 0 ? (
                <span className={reports.summary.totalRework > 0 ? "text-destructive" : "text-success"}>
                  {((reports.summary.totalRework / reports.summary.totalProduced) * 100).toFixed(1)}% do total produzido
                </span>
              ) : (
                <span className="text-muted-foreground">Sem dados</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotes Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : reports.summary.activeBatches}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.activeBatches > 0 ? (
                <span className="text-primary">Em produção</span>
              ) : (
                <span className="text-muted-foreground">Nenhum lote ativo</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Remaining Pieces */}
        <Card>
          <CardHeader>
            <CardTitle>Peças Restantes por Lote</CardTitle>
            <CardDescription>
              Quantidade de peças ainda não produzidas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.remaining.map((item) => (
              <div key={item.batchId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge variant="outline">{item.batchId}</Badge>
                    <span className="font-medium text-sm">{item.batchName}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-2">
                    <div 
                      className="h-2 bg-primary rounded-full"
                      style={{ width: `${((item.total - item.remaining) / item.total) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="font-bold text-lg">{item.remaining}</div>
                  <div className="text-xs text-muted-foreground">de {item.total}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rework Items */}
        <Card>
          <CardHeader>
            <CardTitle>Peças em Retrabalho</CardTitle>
            <CardDescription>
              Itens que precisam ser reprocessados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.rework.map((item, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{item.batchId}</Badge>
                    <Badge variant="outline">{item.pieceCode}</Badge>
                  </div>
                  <Badge variant="warning">{item.reworkQty} un.</Badge>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-muted-foreground mt-1">{item.reason}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Productivity Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Indicadores de Produtividade</CardTitle>
          <CardDescription>
            Progresso dos lotes baseado na data de embalagem
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.productivity.map((item) => (
              <div key={item.batchId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{item.batchId}</Badge>
                    <span className="font-medium">{item.batchName}</span>
                  </div>
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-muted-foreground">Início:</span>
                    <p className="font-medium">{new Date(item.startDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previsão:</span>
                    <p className="font-medium">{new Date(item.targetDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Progresso:</span>
                    <p className="font-medium">{item.progress}%</p>
                  </div>
                </div>

                <Progress value={item.progress} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};