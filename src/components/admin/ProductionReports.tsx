import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, AlertTriangle, Package, Calendar, TrendingDown, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const ProductionReports = () => {
  const [reports, setReports] = useState({
    remaining: [],
    rework: [],
    productivity: [],
    reworkEvolution: [],
    reworkByReason: [],
    summary: {
      totalProduced: 0,
      efficiency: 0,
      totalRework: 0,
      activeBatches: 0,
      reworkRate: 0,
      reworkTrend: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState("7d");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filtros avançados
  const [filters, setFilters] = useState({
    year: "all",
    month: "all",
    batchCode: "all",
    pieceCode: "all",
    color: "all",
    startDate: "",
    endDate: "",
    reason: "all"
  });

  // Dados para os dropdowns
  const [filterOptions, setFilterOptions] = useState({
    years: [],
    months: [],
    batches: [],
    pieces: [],
    colors: [],
    reasons: []
  });

  const { toast } = useToast();

  // Função para buscar opções de filtros
  const fetchFilterOptions = async () => {
    try {
      // Buscar anos únicos dos registros
      const { data: yearsData } = await supabase
        .from('production_records')
        .select('created_at')
        .order('created_at', { ascending: false });

      const years = [...new Set(yearsData?.map(record =>
        new Date(record.created_at).getFullYear()
      ) || [])].sort((a, b) => b - a);

      // Buscar lotes únicos
      const { data: batchesData } = await supabase
        .from('batches')
        .select('code, name')
        .order('code');

      // Buscar peças únicas
      const { data: piecesData } = await supabase
        .from('pieces')
        .select('code, description, color')
        .order('code');

      // Buscar motivos únicos de retrabalho
      const { data: reasonsData } = await supabase
        .from('production_records')
        .select('notes')
        .not('notes', 'is', null)
        .not('notes', 'eq', '');

      const reasons = [...new Set(reasonsData?.map(record => record.notes) || [])];
      const colors = [...new Set(piecesData?.map(piece => piece.color).filter(Boolean) || [])];

      setFilterOptions({
        years,
        months: [
          { value: '01', label: 'Janeiro' },
          { value: '02', label: 'Fevereiro' },
          { value: '03', label: 'Março' },
          { value: '04', label: 'Abril' },
          { value: '05', label: 'Maio' },
          { value: '06', label: 'Junho' },
          { value: '07', label: 'Julho' },
          { value: '08', label: 'Agosto' },
          { value: '09', label: 'Setembro' },
          { value: '10', label: 'Outubro' },
          { value: '11', label: 'Novembro' },
          { value: '12', label: 'Dezembro' }
        ],
        batches: batchesData || [],
        pieces: piecesData || [],
        colors,
        reasons
      });
    } catch (error) {
      console.error('Erro ao buscar opções de filtros:', error);
    }
  };

  // Função para aplicar filtros avançados
  const applyAdvancedFilters = (data: any[], type: 'rework' | 'production') => {
    return data.filter(item => {
      // Filtro por ano
      if (filters.year) {
        const itemYear = new Date(item.created_at || item.date).getFullYear();
        if (itemYear.toString() !== filters.year) return false;
      }

      // Filtro por mês
      if (filters.month) {
        const itemMonth = String(new Date(item.created_at || item.date).getMonth() + 1).padStart(2, '0');
        if (itemMonth !== filters.month) return false;
      }

      // Filtro por lote
      if (filters.batchCode && type === 'rework') {
        if (!item.pieces?.batches?.code?.includes(filters.batchCode)) return false;
      }

      // Filtro por peça
      if (filters.pieceCode && type === 'rework') {
        if (!item.pieces?.code?.includes(filters.pieceCode)) return false;
      }

      // Filtro por cor
      if (filters.color && type === 'rework') {
        if (item.pieces?.color !== filters.color) return false;
      }

      // Filtro por motivo
      if (filters.reason && type === 'rework') {
        if (!item.notes?.includes(filters.reason)) return false;
      }

      // Filtro por data personalizada
      if (filters.startDate) {
        const itemDate = new Date(item.created_at || item.date);
        const startDate = new Date(filters.startDate);
        if (itemDate < startDate) return false;
      }

      if (filters.endDate) {
        const itemDate = new Date(item.created_at || item.date);
        const endDate = new Date(filters.endDate);
        if (itemDate > endDate) return false;
      }

      return true;
    });
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setFilters({
      year: "all",
      month: "all",
      batchCode: "all",
      pieceCode: "all",
      color: "all",
      startDate: "",
      endDate: "",
      reason: "all"
    });
  };

  const fetchReportsData = async () => {
    try {
      setIsLoading(true);

      // Calcular data de início baseada no filtro
      const now = new Date();
      const daysBack = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : 90;
      const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

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

      // Construir query de retrabalho com filtros avançados
      let reworkQuery = supabase
        .from('production_records')
        .select(`
          quantity_rework,
          notes,
          piece_id,
          created_at,
          pieces (
            id,
            code,
            description,
            color,
            batch_id,
            batches (
              code,
              name
            )
          )
        `)
        .not('quantity_rework', 'is', null)
        .gt('quantity_rework', 0);

      // Aplicar filtros de data
      if (filters.startDate || filters.endDate || !showAdvancedFilters) {
        const queryStartDate = filters.startDate ? new Date(filters.startDate) : startDate;
        const queryEndDate = filters.endDate ? new Date(filters.endDate) : new Date();

        reworkQuery = reworkQuery
          .gte('created_at', queryStartDate.toISOString())
          .lte('created_at', queryEndDate.toISOString());
      } else if (!showAdvancedFilters) {
        reworkQuery = reworkQuery.gte('created_at', startDate.toISOString());
      }

      const { data: reworkData, error: reworkError } = await reworkQuery;

      if (reworkError) throw reworkError;

      // Processar dados
      const processedData = {
        remaining: [],
        rework: [],
        productivity: [],
        reworkEvolution: [],
        reworkByReason: [],
        summary: {
          totalProduced: 0,
          efficiency: 0,
          totalRework: 0,
          activeBatches: 0,
          reworkRate: 0,
          reworkTrend: 0
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

      // Aplicar filtros avançados nos dados de retrabalho
      let filteredReworkData = reworkData || [];

      if (showAdvancedFilters) {
        filteredReworkData = filteredReworkData.filter(record => {
          // Filtro por lote
          if (filters.batchCode !== "all" && !record.pieces?.batches?.code?.includes(filters.batchCode)) {
            return false;
          }

          // Filtro por peça
          if (filters.pieceCode !== "all" && !record.pieces?.code?.includes(filters.pieceCode)) {
            return false;
          }

          // Filtro por cor
          if (filters.color !== "all" && record.pieces?.color !== filters.color) {
            return false;
          }

          // Filtro por motivo
          if (filters.reason !== "all" && !record.notes?.includes(filters.reason)) {
            return false;
          }

          return true;
        });
      }

      // Processar dados de retrabalho
      const reworkByPiece: Record<string, any> = {};
      const reworkByDate: Record<string, number> = {};
      const reworkByReason: Record<string, number> = {};
      let totalReworkQty = 0;

      filteredReworkData.forEach(record => {
        const pieceId = record.piece_id;
        const piece = record.pieces;
        const reworkQty = record.quantity_rework || 0;
        const recordDate = new Date(record.created_at).toISOString().split('T')[0];
        const reason = record.notes || 'Não especificado';

        if (pieceId && piece) {
          // Agrupar por peça
          if (!reworkByPiece[pieceId]) {
            reworkByPiece[pieceId] = {
              batchId: piece.batches?.code || 'N/A',
              pieceCode: piece.code,
              description: piece.description,
              reworkQty: 0,
              reasons: []
            };
          }
          reworkByPiece[pieceId].reworkQty += reworkQty;
          if (reason && !reworkByPiece[pieceId].reasons.includes(reason)) {
            reworkByPiece[pieceId].reasons.push(reason);
          }

          // Agrupar por data para evolução
          reworkByDate[recordDate] = (reworkByDate[recordDate] || 0) + reworkQty;

          // Agrupar por motivo
          reworkByReason[reason] = (reworkByReason[reason] || 0) + reworkQty;

          totalReworkQty += reworkQty;
        }
      });

      // Converter dados de retrabalho por peça
      processedData.rework = Object.values(reworkByPiece).map((item: any) => ({
        ...item,
        reason: item.reasons.join('; ') || 'Não especificado'
      })).slice(0, 10);

      // Criar evolução temporal do retrabalho
      const sortedDates = Object.keys(reworkByDate).sort();
      processedData.reworkEvolution = sortedDates.map(date => ({
        date,
        quantity: reworkByDate[date],
        formattedDate: new Date(date).toLocaleDateString('pt-BR')
      }));

      // Criar dados de retrabalho por motivo
      processedData.reworkByReason = Object.entries(reworkByReason)
        .map(([reason, quantity]) => ({ reason, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      processedData.summary.totalRework = totalReworkQty;

      // Calcular taxa de retrabalho
      processedData.summary.reworkRate = processedData.summary.totalProduced > 0
        ? Math.round((totalReworkQty / processedData.summary.totalProduced) * 100 * 10) / 10
        : 0;

      // Calcular tendência de retrabalho (comparar primeira e segunda metade do período)
      if (processedData.reworkEvolution.length > 1) {
        const midPoint = Math.floor(processedData.reworkEvolution.length / 2);
        const firstHalf = processedData.reworkEvolution.slice(0, midPoint);
        const secondHalf = processedData.reworkEvolution.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.quantity, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.quantity, 0) / secondHalf.length;

        processedData.summary.reworkTrend = firstHalfAvg > 0
          ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
          : 0;
      }

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
    fetchFilterOptions();
  }, [timeFilter]);

  useEffect(() => {
    // Recarregar dados quando filtros avançados mudarem
    if (showAdvancedFilters) {
      fetchReportsData();
    }
  }, [filters]);



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

      {/* Time Filter */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium">Período de análise:</label>
        <Select value={timeFilter} onValueChange={(value) => setTimeFilter(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="ml-4"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filtros Avançados
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Filtros Avançados</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            </CardTitle>
            <CardDescription>
              Filtre os dados para uma análise mais específica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Filtro por Ano */}
              <div className="space-y-2">
                <Label htmlFor="year-filter">Ano</Label>
                <Select
                  value={filters.year}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, year: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os anos</SelectItem>
                    {filterOptions.years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Mês */}
              <div className="space-y-2">
                <Label htmlFor="month-filter">Mês</Label>
                <Select
                  value={filters.month}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, month: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {filterOptions.months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Lote */}
              <div className="space-y-2">
                <Label htmlFor="batch-filter">Lote</Label>
                <Select
                  value={filters.batchCode}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, batchCode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o lote" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os lotes</SelectItem>
                    {filterOptions.batches.map((batch) => (
                      <SelectItem key={batch.code} value={batch.code}>
                        {batch.code} - {batch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Peça */}
              <div className="space-y-2">
                <Label htmlFor="piece-filter">Peça</Label>
                <Select
                  value={filters.pieceCode}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, pieceCode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a peça" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as peças</SelectItem>
                    {filterOptions.pieces.map((piece) => (
                      <SelectItem key={piece.code} value={piece.code}>
                        {piece.code} - {piece.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Cor */}
              <div className="space-y-2">
                <Label htmlFor="color-filter">Cor</Label>
                <Select
                  value={filters.color}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a cor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as cores</SelectItem>
                    {filterOptions.colors.map((color) => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          {color}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Motivo */}
              <div className="space-y-2">
                <Label htmlFor="reason-filter">Motivo de Retrabalho</Label>
                <Select
                  value={filters.reason}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motivos</SelectItem>
                    {filterOptions.reasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Inicial */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              {/* Data Final */}
              <div className="space-y-2">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Filtros Ativos */}
            {(Object.entries(filters).some(([key, value]) =>
              key === 'startDate' || key === 'endDate' ? value !== "" : value !== "all"
            )) && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">Filtros ativos:</span>
                    {filters.year !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Ano: {filters.year}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, year: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.month !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Mês: {filterOptions.months.find(m => m.value === filters.month)?.label}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, month: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.batchCode !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Lote: {filters.batchCode}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, batchCode: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.pieceCode !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Peça: {filters.pieceCode}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, pieceCode: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.color !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Cor: {filters.color}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, color: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.reason !== "all" && (
                      <Badge variant="secondary" className="gap-1">
                        Motivo: {filters.reason.length > 20 ? filters.reason.substring(0, 20) + "..." : filters.reason}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, reason: "all" }))}
                        />
                      </Badge>
                    )}
                    {filters.startDate && (
                      <Badge variant="secondary" className="gap-1">
                        De: {new Date(filters.startDate).toLocaleDateString('pt-BR')}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, startDate: "" }))}
                        />
                      </Badge>
                    )}
                    {filters.endDate && (
                      <Badge variant="secondary" className="gap-1">
                        Até: {new Date(filters.endDate).toLocaleDateString('pt-BR')}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => setFilters(prev => ({ ...prev, endDate: "" }))}
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-sm font-medium">Taxa de Retrabalho</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${reports.summary.reworkRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.reworkRate <= 2 ? (
                <span className="text-success">Dentro do aceitável</span>
              ) : reports.summary.reworkRate <= 5 ? (
                <span className="text-warning">Atenção necessária</span>
              ) : (
                <span className="text-destructive">Crítico</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendência</CardTitle>
            {reports.summary.reworkTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-destructive" />
            ) : (
              <TrendingDown className="h-4 w-4 text-success" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : `${reports.summary.reworkTrend > 0 ? '+' : ''}${reports.summary.reworkTrend}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {reports.summary.reworkTrend > 10 ? (
                <span className="text-destructive">Aumentando rapidamente</span>
              ) : reports.summary.reworkTrend > 0 ? (
                <span className="text-warning">Em alta</span>
              ) : reports.summary.reworkTrend < -10 ? (
                <span className="text-success">Melhorando rapidamente</span>
              ) : (
                <span className="text-success">Em baixa</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rework Analysis Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Rework Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Evolução do Retrabalho
            </CardTitle>
            <CardDescription>
              Quantidade de retrabalho ao longo do tempo ({timeFilter === "7d" ? "7 dias" : timeFilter === "30d" ? "30 dias" : "90 dias"})
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.reworkEvolution.length > 0 ? (
              <div className="space-y-4">
                <div className="h-64 flex items-end justify-between gap-1">
                  {reports.reworkEvolution.map((item, index) => {
                    const maxValue = Math.max(...reports.reworkEvolution.map(d => d.quantity));
                    const height = maxValue > 0 ? (item.quantity / maxValue) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-destructive rounded-t min-h-[4px] transition-all hover:bg-destructive/80"
                          style={{ height: `${height}%` }}
                          title={`${item.formattedDate}: ${item.quantity} peças`}
                        />
                        <span className="text-xs text-muted-foreground mt-1 rotate-45 origin-left">
                          {item.formattedDate.split('/').slice(0, 2).join('/')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Total no período: {reports.reworkEvolution.reduce((sum, item) => sum + item.quantity, 0)} peças
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Nenhum retrabalho registrado no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rework by Reason */}
        <Card>
          <CardHeader>
            <CardTitle>Principais Motivos de Retrabalho</CardTitle>
            <CardDescription>
              Top 5 causas de retrabalho no período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reports.reworkByReason.length > 0 ? (
              reports.reworkByReason.map((item, index) => {
                const maxValue = Math.max(...reports.reworkByReason.map(d => d.quantity));
                const percentage = maxValue > 0 ? (item.quantity / maxValue) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1 mr-2">
                        {item.reason}
                      </span>
                      <Badge variant="destructive">{item.quantity}</Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 bg-destructive rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Nenhum motivo de retrabalho registrado
              </div>
            )}
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