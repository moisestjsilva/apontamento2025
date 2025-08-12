import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { User, Plus, Edit, Trash2, Search, Shield, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserManagementProps {
  open: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "admin" | "operator";
  active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export const UserManagement = ({ open, onClose }: UserManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as "admin" | "operator",
    active: true
  });

  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = () => {
    setEditingUser(null);
    setUserForm({ name: "", email: "", password: "", role: "operator", active: true });
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      password: "", // Não preenchemos a senha ao editar
      role: user.role,
      active: user.active
    });
    setShowUserForm(true);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        // Atualizar usuário existente
        const updateData = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          active: userForm.active,
          updated_at: new Date().toISOString()
        };
        
        // Adicionar senha apenas se foi fornecida
        if (userForm.password) {
          Object.assign(updateData, { password: userForm.password });
        }
        
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', editingUser.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Usuário atualizado com sucesso",
        });
      } else {
        // Criar novo usuário
        const { error } = await supabase
          .from('users')
          .insert({
            name: userForm.name,
            email: userForm.email,
            password: userForm.password,
            role: userForm.role,
            active: userForm.active
          });

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Novo usuário criado com sucesso",
        });
      }
      
      // Recarregar a lista de usuários
      fetchUsers();
      setShowUserForm(false);
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar usuário",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Usuário excluído com sucesso",
        });
        
        // Atualizar a lista de usuários
        fetchUsers();
      } catch (error: any) {
        console.error('Erro ao excluir usuário:', error);
        toast({
          title: "Erro",
          description: "Falha ao excluir usuário",
          variant: "destructive",
        });
      }
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      // Encontrar o usuário atual
      const user = users.find(u => u.id === userId);
      if (!user) return;
      
      // Atualizar o status no Supabase
      const { error } = await supabase
        .from('users')
        .update({ active: !user.active })
        .eq('id', userId);

      if (error) throw error;
      
      // Atualizar a lista de usuários
      fetchUsers();
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error);
      toast({
        title: "Erro",
        description: "Falha ao alterar status do usuário",
        variant: "destructive",
      });
    }
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? <Shield className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />;
  };

  const getRoleBadge = (role: string) => {
    return role === "admin" ? "destructive" : "secondary";
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Gerenciar Usuários</span>
            </DialogTitle>
            <DialogDescription>
              Gerencie os usuários do sistema e suas permissões de acesso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuários..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleCreateUser} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Ativos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {users.filter(u => u.active).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Admins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">
                    {users.filter(u => u.role === "admin").length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Operadores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {users.filter(u => u.role === "operator").length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Usuários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{user.name}</h4>
                            <Badge variant={getRoleBadge(user.role)}>
                              {getRoleIcon(user.role)}
                              <span className="ml-1">
                                {user.role === "admin" ? "Administrador" : "Operador"}
                              </span>
                            </Badge>
                            {!user.active && (
                              <Badge variant="outline">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            Criado em: {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            {user.last_login && (
                              <span className="ml-4">
                                Último acesso: {new Date(user.last_login).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`active-${user.id}`} className="text-sm">
                            {user.active ? "Ativo" : "Inativo"}
                          </Label>
                          <Switch
                            id={`active-${user.id}`}
                            checked={user.active}
                            onCheckedChange={() => toggleUserStatus(user.id)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Form Dialog */}
      <Dialog open={showUserForm} onOpenChange={setShowUserForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? "Atualize as informações do usuário" : "Crie um novo usuário no sistema"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="Ex: joao.silva@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="password">{editingUser ? "Nova Senha (deixe em branco para manter a atual)" : "Senha *"}</Label>
              <Input
                id="password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                placeholder="Digite a senha"
                required={!editingUser}
              />
            </div>
            <div>
              <Label htmlFor="role">Perfil de Acesso *</Label>
              <Select
                value={userForm.role}
                onValueChange={(value: "admin" | "operator") => setUserForm({ ...userForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={userForm.active}
                onCheckedChange={(checked) => setUserForm({ ...userForm, active: checked })}
              />
              <Label htmlFor="active">Usuário ativo</Label>
            </div>
            <div className="flex space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowUserForm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveUser}
                disabled={!userForm.name || !userForm.email}
                className="flex-1"
              >
                {editingUser ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};