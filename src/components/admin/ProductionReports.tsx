import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, AlertTriangle, Package } from "lucide-react";

export const ProductionReports = () => {
  // Mock data - será substituído por dados do Supabase
  const reports = {
    remaining: [
      { batchId: "L001", batchName: "Lote A - Janeiro 2024", remaining: 40, total: 225 },
      { batchId: "L002", batchName: "Lote B - Janeiro 2024", remaining: 0, total: 200 },
      { batchId: "L003", batchName: "Lote C - Janeiro 2024", remaining: 85, total: 150 }
    ],
    rework: [
      { batchId: "L001", pieceCode: "PC001", description: "Peça Principal", reworkQty: 5, reason: "Defeito na pintura" },
      { batchId: "L001", pieceCode: "PC003", description: "Peça Auxiliar", reworkQty: 2, reason: "Medida incorreta" },
      { batchId: "L002", pieceCode: "PC004", description: "Componente A", reworkQty: 8, reason: "Falha no acabamento" }
    ],
    productivity: [
      { batchId: "L001", batchName: "Lote A - Janeiro 2024", startDate: "2024-01-15", targetDate: "2024-01-30", progress: 82, status: "No Prazo" },
      { batchId: "L002", batchName: "Lote B - Janeiro 2024", startDate: "2024-01-10", targetDate: "2024-01-25", progress: 100, status: "Concluído" },
      { batchId: "L003", batchName: "Lote C - Janeiro 2024", startDate: "2024-01-20", targetDate: "2024-02-05", progress: 43, status: "Atrasado" }
    ]
  };

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
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produzido</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,250</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+8.2%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+2.1%</span> em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrabalho</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">1.2%</span> do total produzido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotes Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              2 concluídos esta semana
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