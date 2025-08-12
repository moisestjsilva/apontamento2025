import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Minus } from "lucide-react";

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
  onSubmit: (data: { pieceId: string; production: number; rework: number; reason: string; operatorName: string }) => void;
}

export const ProductionForm = ({ piece, isOpen, onClose, onSubmit }: ProductionFormProps) => {
  const [productionQty, setProductionQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [reworkReason, setReworkReason] = useState("");
  const [operatorName, setOperatorName] = useState("");
  const { toast } = useToast();

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
        description: "Informe o motivo do retrabalho",
        variant: "destructive",
      });
      return;
    }
    
    if (!operatorName.trim()) {
      toast({
        title: "Erro",
        description: "Informe o nome do operador",
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
      operatorName: operatorName
    });

    // Reset form
    setProductionQty(0);
    setReworkQty(0);
    setReworkReason("");
    setOperatorName("");
    
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
              <Textarea
                placeholder="Descreva o motivo do retrabalho..."
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                rows={3}
                className="text-base"
              />
            </div>
          )}
          
          {/* Operator Name */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Nome do Operador *</label>
            <Input
              placeholder="Digite seu nome..."
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
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