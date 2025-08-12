import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Edit, Trash2, AlertTriangle } from "lucide-react";

interface ReworkReason {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const ReworkReasonsManagement = () => {
  const [reasons, setReasons] = useState<ReworkReason[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReason, setEditingReason] = useState<ReworkReason | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReasons();
  }, []);

  const fetchReasons = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('rework_reasons')
        .select('*')
        .order('name');

      if (error) throw error;
      setReasons(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar motivos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar motivos de retrabalho",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      if (editingReason) {
        // Atualizar motivo existente
        const { error } = await supabase
          .from('rework_reasons')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active
          })
          .eq('id', editingReason.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Motivo atualizado com sucesso!",
        });
      } else {
        // Criar novo motivo
        const { error } = await supabase
          .from('rework_reasons')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            active: formData.active
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Motivo criado com sucesso!",
        });
      }

      // Reset form and close dialog
      setFormData({ name: "", description: "", active: true });
      setEditingReason(null);
      setShowForm(false);
      fetchReasons();
    } catch (error: any) {
      console.error('Erro ao salvar motivo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar motivo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (reason: ReworkReason) => {
    setEditingReason(reason);
    setFormData({
      name: reason.name,
      description: reason.description || "",
      active: reason.active
    });
    setShowForm(true);
  };

  const handleDelete = async (reason: ReworkReason) => {
    if (!confirm(`Tem certeza que deseja excluir o motivo "${reason.name}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('rework_reasons')
        .delete()
        .eq('id', reason.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Motivo excluído com sucesso!",
      });

      fetchReasons();
    } catch (error: any) {
      console.error('Erro ao excluir motivo:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir motivo",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (reason: ReworkReason) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('rework_reasons')
        .update({ active: !reason.active })
        .eq('id', reason.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Motivo ${!reason.active ? 'ativado' : 'desativado'} com sucesso!`,
      });

      fetchReasons();
    } catch (error: any) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingReason(null);
    setFormData({ name: "", description: "", active: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Motivos de Retrabalho</h2>
          <p className="text-muted-foreground">Gerencie os motivos padrão para retrabalho</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Motivo
        </Button>
      </div>

      {isLoading && reasons.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando motivos...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reasons.map((reason) => (
            <Card key={reason.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CardTitle className="text-lg">{reason.name}</CardTitle>
                    <Badge variant={reason.active ? "default" : "secondary"}>
                      {reason.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(reason)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(reason)}
                    >
                      {reason.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(reason)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {reason.description && (
                  <CardDescription>{reason.description}</CardDescription>
                )}
              </CardHeader>
            </Card>
          ))}

          {reasons.length === 0 && !isLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhum motivo cadastrado</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingReason ? "Editar Motivo" : "Novo Motivo"}
            </DialogTitle>
            <DialogDescription>
              {editingReason 
                ? "Edite as informações do motivo de retrabalho"
                : "Adicione um novo motivo de retrabalho"
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome *
              </label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Defeito de Material"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Descrição
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição detalhada do motivo..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="active" className="text-sm font-medium">
                Ativo
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={closeForm} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Salvando..." : editingReason ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};