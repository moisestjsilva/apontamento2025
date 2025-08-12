
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BatchFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  batchToEdit?: any;
}

interface Piece {
  id: string;
  code: string;
  description: string;
  color: string;
  quantity: number;
}

const primaryColors = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Amarelo", value: "#f59e0b" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Laranja", value: "#f97316" },
  { name: "Ciano", value: "#06b6d4" },
];

const statusOptions = [
  { label: "Em andamento", value: "Em andamento" },
  { label: "Concluído", value: "Concluído" },
  { label: "Pausado", value: "Pausado" },
];

export const BatchForm = ({ onClose, onSuccess, batchToEdit }: BatchFormProps) => {
  const [batchData, setBatchData] = useState({
    code: "",
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    color: "#3b82f6",
    status: "Em andamento"
  });
  
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentPiece, setCurrentPiece] = useState({
    code: "",
    description: "",
    color: "",
    quantity: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (batchToEdit) {
      setBatchData({
        code: batchToEdit.code || "",
        name: batchToEdit.name || "",
        description: batchToEdit.description || "",
        startDate: batchToEdit.start_date || "",
        endDate: batchToEdit.end_date || "",
        color: batchToEdit.color || "#3b82f6",
        status: batchToEdit.status || "Em andamento"
      });

      // Carregar peças existentes
      if (batchToEdit.pieces) {
        setPieces(batchToEdit.pieces.map((piece: any) => ({
          id: piece.id,
          code: piece.code,
          description: piece.description,
          color: piece.color || "",
          quantity: piece.quantity
        })));
      }
    }
  }, [batchToEdit]);

  const handleAddPiece = () => {
    if (currentPiece.code && currentPiece.description && currentPiece.quantity) {
      const newPiece: Piece = {
        id: Date.now().toString(),
        code: currentPiece.code,
        description: currentPiece.description,
        color: currentPiece.color,
        quantity: parseInt(currentPiece.quantity)
      };
      
      setPieces([...pieces, newPiece]);
      setCurrentPiece({ code: "", description: "", color: "", quantity: "" });
    }
  };

  const handleRemovePiece = (id: string) => {
    setPieces(pieces.filter(piece => piece.id !== id));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (batchToEdit) {
        // Atualizar lote existente
        const { error: batchError } = await supabase
          .from('batches')
          .update({
            code: batchData.code,
            name: batchData.name,
            description: batchData.description,
            start_date: batchData.startDate,
            end_date: batchData.endDate,
            color: batchData.color,
            status: batchData.status,
          })
          .eq('id', batchToEdit.id);

        if (batchError) throw batchError;

        // Remover peças existentes que não estão na lista atual
        const existingPieceIds = batchToEdit.pieces?.map((p: any) => p.id) || [];
        const currentPieceIds = pieces.filter(p => existingPieceIds.includes(p.id)).map(p => p.id);
        const piecesToDelete = existingPieceIds.filter((id: string) => !currentPieceIds.includes(id));

        if (piecesToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('pieces')
            .delete()
            .in('id', piecesToDelete);

          if (deleteError) throw deleteError;
        }

        // Inserir/atualizar peças
        const newPieces = pieces.filter(piece => !existingPieceIds.includes(piece.id));
        const existingPiecesToUpdate = pieces.filter(piece => existingPieceIds.includes(piece.id));

        if (newPieces.length > 0) {
          const piecesToInsert = newPieces.map(piece => ({
            batch_id: batchToEdit.id,
            code: piece.code,
            description: piece.description,
            color: piece.color,
            quantity: piece.quantity,
          }));

          const { error: insertError } = await supabase
            .from('pieces')
            .insert(piecesToInsert);

          if (insertError) throw insertError;
        }

        for (const piece of existingPiecesToUpdate) {
          const { error: updateError } = await supabase
            .from('pieces')
            .update({
              code: piece.code,
              description: piece.description,
              color: piece.color,
              quantity: piece.quantity,
            })
            .eq('id', piece.id);

          if (updateError) throw updateError;
        }

        toast({
          title: "Sucesso",
          description: "Lote atualizado com sucesso!",
        });
      } else {
        // Criar novo lote
        const { data: batch, error: batchError } = await supabase
          .from('batches')
          .insert({
            code: batchData.code,
            name: batchData.name,
            description: batchData.description,
            start_date: batchData.startDate,
            end_date: batchData.endDate,
            color: batchData.color,
          })
          .select()
          .single();

        if (batchError) throw batchError;

        // Inserir as peças se houver
        if (pieces.length > 0) {
          const piecesToInsert = pieces.map(piece => ({
            batch_id: batch.id,
            code: piece.code,
            description: piece.description,
            color: piece.color,
            quantity: piece.quantity,
          }));

          const { error: piecesError } = await supabase
            .from('pieces')
            .insert(piecesToInsert);

          if (piecesError) throw piecesError;
        }

        toast({
          title: "Sucesso",
          description: "Lote criado com sucesso!",
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar lote:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar lote",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = batchData.code && batchData.name && batchData.startDate && batchData.endDate;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batchToEdit ? "Editar Lote" : "Criar Novo Lote"}</DialogTitle>
          <DialogDescription>
            {batchToEdit ? "Modifique as informações do lote e suas peças" : "Cadastre um novo lote de produção e suas peças"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Batch Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Lote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batchCode">Código do Lote *</Label>
                <Input
                  id="batchCode"
                  placeholder="Ex: L001"
                  value={batchData.code}
                  onChange={(e) => setBatchData({ ...batchData, code: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="batchName">Nome do Lote *</Label>
                <Input
                  id="batchName"
                  placeholder="Ex: Lote Janeiro 2024"
                  value={batchData.name}
                  onChange={(e) => setBatchData({ ...batchData, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="batchDescription">Descrição</Label>
                <Textarea
                  id="batchDescription"
                  placeholder="Descrição do lote..."
                  value={batchData.description}
                  onChange={(e) => setBatchData({ ...batchData, description: e.target.value })}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={batchData.startDate}
                    onChange={(e) => setBatchData({ ...batchData, startDate: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Data de Fim *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={batchData.endDate}
                    onChange={(e) => setBatchData({ ...batchData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {batchToEdit && (
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={batchData.status} onValueChange={(value) => setBatchData({ ...batchData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="batchColor">Cor do Lote</Label>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {primaryColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setBatchData({ ...batchData, color: color.value })}
                      className={`h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                        batchData.color === color.value 
                          ? 'border-primary ring-2 ring-primary/50' 
                          : 'border-muted hover:border-primary/50'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Esta cor será aplicada nos cards do lote
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Piece Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Adicionar Peças (Opcional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pieceCode">Código da Peça</Label>
                  <Input
                    id="pieceCode"
                    placeholder="Ex: PC001"
                    value={currentPiece.code}
                    onChange={(e) => setCurrentPiece({ ...currentPiece, code: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="pieceQuantity">Quantidade</Label>
                  <Input
                    id="pieceQuantity"
                    type="number"
                    placeholder="Ex: 100"
                    value={currentPiece.quantity}
                    onChange={(e) => setCurrentPiece({ ...currentPiece, quantity: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="pieceDescription">Descrição da Peça</Label>
                <Input
                  id="pieceDescription"
                  placeholder="Ex: Peça Principal"
                  value={currentPiece.description}
                  onChange={(e) => setCurrentPiece({ ...currentPiece, description: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="pieceColor">Cor</Label>
                <Input
                  id="pieceColor"
                  placeholder="Ex: Azul"
                  value={currentPiece.color}
                  onChange={(e) => setCurrentPiece({ ...currentPiece, color: e.target.value })}
                />
              </div>
              
              <Button 
                onClick={handleAddPiece}
                className="w-full"
                disabled={!currentPiece.code || !currentPiece.description || !currentPiece.quantity}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Peça
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pieces List */}
        {pieces.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Peças do Lote ({pieces.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pieces.map((piece) => (
                  <div key={piece.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{piece.code}</Badge>
                      <div>
                        <p className="font-medium">{piece.description}</p>
                        <p className="text-sm text-muted-foreground">
                          Cor: {piece.color || "Não especificado"} • Qtd: {piece.quantity}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRemovePiece(piece.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Salvando..." : (batchToEdit ? "Salvar Alterações" : "Criar Lote")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
