import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Minus } from "lucide-react";

interface ReworkReason {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

interface Piece {
  id: string;
  code: string;
  description: string;
  color: string;
  batchColor?: string;
  planned: number;
  produced: number;
  rework: number;
  completed: boolean;
}

interface ProductionFormProps {
  piece: Piece | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { pieceId: string; production: number; rework: number; reason: string; reasonId?: string; observations: string; operatorName: string }) => void;
  currentUser: { id: string; name: string; email: string; role: string } | null;
}

export const ProductionForm = ({ piece, isOpen, onClose, onSubmit, currentUser }: ProductionFormProps) => {
  const [productionQty, setProductionQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [reworkReason, setReworkReason] = useState("");
  const [selectedReasonId, setSelectedReasonId] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [reworkReasons, setReworkReasons] = useState<ReworkReason[]>([]);
  const { toast } = useToast();

  // Buscar motivos de retrabalho quando o componente for montado
  useEffect(() => {
    if (isOpen) {
      fetchReworkReasons();
    }
  }, [isOpen]);

  const fetchReworkReasons = async () => {
    try {
      const { data, error } = await supabase
        .from('rework_reasons')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setReworkReasons(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar motivos:', error);
    }
  };

  const handleReasonSelect = (reason: ReworkReason) => {
    setSelectedReasonId(reason.id);
    setReworkReason(reason.name);
  };

  const handleSubmit = () => {
    // Verificar se pelo menos um dos campos (produção ou retrabalho) tem valor maior que zero
    if (productionQty <= 0 && reworkQty <= 0) {
      toast({
        title: "Erro",
        description: "Informe a quantidade produzida ou a quantidade para retrabalho",
        variant: "destructive",
      });
      return;
    }

    if (reworkQty > 0 && !reworkReason.trim()) {
      toast({
        title: "Erro",
        description: "Selecione ou descreva o motivo do retrabalho",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentUser?.name) {
      toast({
        title: "Erro",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    // Vibrate on successful submission
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    onSubmit({
      pieceId: piece!.id,
      production: productionQty,
      rework: reworkQty,
      reason: reworkReason,
      reasonId: selectedReasonId || undefined,
      observations: observations,
      operatorName: currentUser.name
    });

    // Reset form
    setProductionQty(0);
    setReworkQty(0);
    setReworkReason("");
    setSelectedReasonId("");
    setObservations("");
    
    toast({
      title: "Sucesso",
      description: "Apontamento registrado com sucesso!",
      duration: 2000, // 2 seconds instead of default 5
    });
  };

  const adjustQuantity = (value: number, setter: (val: number) => void, current: number) => {
    const newValue = Math.max(0, current + value);
    setter(newValue);
  };

  const quickSetQuantity = (value: number) => {
    setProductionQty(value);
  };

  if (!piece) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Apontar Produção</span>
          </DialogTitle>
          <DialogDescription>
            Registre a produção para: <strong>{piece.description}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Piece Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Código:</span>
                <Badge variant="outline" className="ml-2">{piece.code}</Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Cor:</span>
                <div className="inline-flex items-center ml-2">
                  <div 
                    className="w-6 h-6 rounded-full border border-gray-300" 
                    style={{ backgroundColor: piece.batchColor || (piece.color?.startsWith('#') ? piece.color : undefined) }}
                  />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Planejado:</span>
                <span className="ml-2 font-bold text-primary">{piece.planned}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Produzido:</span>
                <span className="ml-2 font-bold">{piece.produced}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Production Quantity */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Quantidade Produzida</label>
            
            {/* Quick buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[5, 10, 20, 50].map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => quickSetQuantity(value)}
                  className="h-12 text-base"
                >
                  {value}
                </Button>
              ))}
            </div>

            {/* Quantity controls */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => adjustQuantity(-1, setProductionQty, productionQty)}
              >
                <Minus className="h-6 w-6" />
              </Button>
              
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={productionQty || ""}
                onChange={(e) => setProductionQty(Number(e.target.value) || 0)}
                className="text-center text-2xl font-bold h-12"
              />
              
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => adjustQuantity(1, setProductionQty, productionQty)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Rework Quantity */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Quantidade para Retrabalho</label>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => adjustQuantity(-1, setReworkQty, reworkQty)}
              >
                <Minus className="h-6 w-6" />
              </Button>
              
              <Input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="0"
                value={reworkQty || ""}
                onChange={(e) => setReworkQty(Number(e.target.value) || 0)}
                className="text-center text-xl font-semibold h-12"
              />
              
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => adjustQuantity(1, setReworkQty, reworkQty)}
              >
                <Plus className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Rework Reason */}
          {reworkQty > 0 && (
            <div className="space-y-3">
              <label className="text-base font-semibold">Motivo do Retrabalho *</label>
              
              {/* Botões de motivos padrão */}
              {reworkReasons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Motivos padrão:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {reworkReasons.map((reason) => (
                      <Button
                        key={reason.id}
                        variant={selectedReasonId === reason.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleReasonSelect(reason)}
                        className="justify-start text-left h-auto py-2 px-3"
                      >
                        <div>
                          <div className="font-medium">{reason.name}</div>
                          {reason.description && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {reason.description}
                            </div>
                          )}
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Textarea
                placeholder="Descreva o motivo do retrabalho ou adicione observações..."
                value={reworkReason}
                onChange={(e) => {
                  setReworkReason(e.target.value);
                  setSelectedReasonId(""); // Limpar seleção se o usuário digitar
                }}
                rows={3}
                className="text-base"
              />
            </div>
          )}

          {/* Campo de Observações */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Observações</label>
            <Textarea
              placeholder="Observações adicionais (opcional)..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              className="text-base"
            />
          </div>
          

        </div>

        {/* Action buttons */}
        <div className="flex space-x-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1 h-12 text-base"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="flex-1 h-12 text-base font-semibold"
            disabled={productionQty <= 0 && reworkQty <= 0}
          >
            Registrar Produção
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};