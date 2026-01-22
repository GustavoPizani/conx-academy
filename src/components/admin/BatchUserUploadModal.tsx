import React, { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, X, Loader2, Lock, Users, Shield, ShieldCheck, GraduationCap, Briefcase } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BatchUserUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const BatchUserUploadModal: React.FC<BatchUserUploadModalProps> = ({ open, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<{ total: number; success: number; skipped: number; errors: string[] } | null>(null);
  
  // Estado para controlar qual cargo estamos subindo
  const [currentRole, setCurrentRole] = useState<'student' | 'manager' | 'superintendent' | 'coordinator'>('superintendent');

  // Estado para as contagens (para bloquear/desbloquear botões)
  const [counts, setCounts] = useState({
    superintendents: 0,
    managers: 0
  });

  // Busca contagens ao abrir o modal
  useEffect(() => {
    if (open) {
      fetchCounts();
      setFile(null);
      setReport(null);
      setProgress(0);
      setCurrentRole('superintendent'); // Sempre começa pelo topo da hierarquia
    }
  }, [open]);

  const fetchCounts = async () => {
    // Conta Superintendentes
    const { count: superCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'superintendent');

    // Conta Gerentes
    const { count: managerCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'manager');

    setCounts({
      superintendents: superCount || 0,
      managers: managerCount || 0
    });
  };

  const handleDownloadTemplate = () => {
    // CSV Simplificado: Cargo é definido pela aba
    const headers = ['Nome,Email,Time'];
    
    // Exemplo muda conforme o cargo para contextualizar
    let example = ['João Silva,joao@empresa.com,Time A'];
    if (currentRole === 'superintendent') example = ['Roberto Super,roberto@conx.com,Diretoria'];
    if (currentRole === 'manager') example = ['Ana Gerente,ana@conx.com,Vendas'];
    if (currentRole === 'student') example = ['Carlos Aluno,carlos@conx.com,Time Alpha'];

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...example].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `modelo_importacao_${currentRole}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setProgress(10);
    setReport(null);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setIsLoading(false);
        return;
      }

      const lines = text.split('\n');
      const usersToProcess = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator);
          
          if (cols.length >= 2) {
            usersToProcess.push({
              name: cols[0].trim(),
              email: cols[1].trim().toLowerCase(),
              // AQUI ESTÁ O SEGREDO: O cargo é forçado pela aba atual
              role: currentRole,
              team: cols[2]?.trim() || null
            });
          }
        }
      }

      setProgress(30);

      if (usersToProcess.length === 0) {
        toast({ title: "Arquivo vazio ou inválido", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('create-batch-users', {
          body: { users: usersToProcess }
        });

        if (error) throw error;

        const successCount = data.success || 0;
        const errorList = data.errors || [];
        
        const skippedCount = errorList.filter((err: string) => err.includes('Já cadastrado') || err.includes('already registered')).length;
        const realErrors = errorList.filter((err: string) => !err.includes('Já cadastrado') && !err.includes('already registered'));

        setProgress(100);
        
        setReport({
          total: usersToProcess.length,
          success: successCount,
          skipped: skippedCount,
          errors: realErrors
        });

        if (successCount > 0) {
            toast({ 
                title: "Importação Concluída", 
                description: `${successCount} usuários cadastrados como ${getRoleLabel(currentRole)}.`,
                className: "bg-green-600 text-white border-none"
            });
            onSuccess();
            fetchCounts(); // Atualiza contagens para desbloquear próximas fases
        }

      } catch (err: any) {
        console.error('Erro na Edge Function:', err);
        toast({ title: "Erro no Servidor", description: "Falha ao processar lista.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'superintendent': return 'Superintendentes';
      case 'manager': return 'Gerentes';
      case 'coordinator': return 'Coordenadores';
      case 'student': return 'Alunos';
      default: return role;
    }
  };

  const reset = () => {
    setFile(null);
    setReport(null);
    setProgress(0);
  };

  // Verificações de Bloqueio
  const isManagerLocked = counts.superintendents === 0;
  const isStudentLocked = counts.managers === 0;
  // Coordenador geralmente está no nível de gerência ou abaixo, vamos deixar livre ou atrelado ao Super, 
  // mas como você não especificou trava para Coord, deixarei livre (apenas Aluno e Gerente tinham travas explícitas no pedido).

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if(!isOpen) reset(); onClose(); }}>
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Cadastro em Massa Hierárquico
          </DialogTitle>
          <DialogDescription>
            Siga a ordem hierárquica para liberar os cadastros. O sistema identifica automaticamente quem já existe.
          </DialogDescription>
        </DialogHeader>

        {!report ? (
          <div className="py-2">
            <Tabs value={currentRole} onValueChange={(val: any) => { setCurrentRole(val); setFile(null); }} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50">
                <TabsTrigger value="superintendent" className="text-xs sm:text-sm">Superintendentes</TabsTrigger>
                
                <TabsTrigger value="manager" disabled={isManagerLocked} className="text-xs sm:text-sm relative">
                  Gerentes
                  {isManagerLocked && <Lock className="w-3 h-3 ml-1 text-muted-foreground" />}
                </TabsTrigger>
                
                <TabsTrigger value="coordinator" className="text-xs sm:text-sm">Coordenadores</TabsTrigger>
                
                <TabsTrigger value="student" disabled={isStudentLocked} className="text-xs sm:text-sm relative">
                  Alunos
                  {isStudentLocked && <Lock className="w-3 h-3 ml-1 text-muted-foreground" />}
                </TabsTrigger>
              </TabsList>

              {/* CONTEÚDO DAS ABAS */}
              <div className="mt-6 border rounded-xl p-6 bg-card">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-full ${
                    currentRole === 'superintendent' ? 'bg-purple-100 text-purple-600' :
                    currentRole === 'manager' ? 'bg-blue-100 text-blue-600' :
                    currentRole === 'coordinator' ? 'bg-orange-100 text-orange-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {currentRole === 'superintendent' && <ShieldCheck className="w-8 h-8" />}
                    {currentRole === 'manager' && <Briefcase className="w-8 h-8" />}
                    {currentRole === 'coordinator' && <Shield className="w-8 h-8" />}
                    {currentRole === 'student' && <GraduationCap className="w-8 h-8" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Importar {getRoleLabel(currentRole)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {currentRole === 'superintendent' && "Nível estratégico. Acesso total."}
                      {currentRole === 'manager' && "Responsáveis por times. Requer Superintendentes cadastrados."}
                      {currentRole === 'coordinator' && "Apoio à gestão."}
                      {currentRole === 'student' && "Usuários finais. Requer Gerentes cadastrados."}
                    </p>
                  </div>
                </div>

                {/* Passo 1: Download */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border flex items-center justify-between mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="bg-background p-2 rounded-full border">
                      <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Passo 1: Modelo CSV ({getRoleLabel(currentRole)})</p>
                      <p className="text-xs text-muted-foreground">Colunas: Nome, Email, Time</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                    <Download className="w-4 h-4 mr-2" /> Baixar Modelo
                  </Button>
                </div>

                {/* Passo 2: Upload */}
                <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/20 transition-colors bg-muted/5">
                    {file ? (
                        <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                            <FileSpreadsheet className="w-12 h-12 text-primary" />
                            <p className="font-medium text-lg">{file.name}</p>
                            <Badge variant="secondary">{(file.size / 1024).toFixed(2)} KB</Badge>
                            <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-4 text-red-500 hover:text-red-600 hover:bg-red-50">
                                <X className="w-4 h-4 mr-2" /> Escolher outro arquivo
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Upload className="w-12 h-12 text-muted-foreground/50 mb-4" />
                            <label htmlFor="csv-upload" className="cursor-pointer">
                                <span className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md hover:bg-primary/90 transition-all shadow-md font-medium">
                                    Selecionar CSV de {getRoleLabel(currentRole)}
                                </span>
                                <input 
                                    id="csv-upload" 
                                    type="file" 
                                    accept=".csv" 
                                    className="hidden" 
                                    onChange={(e) => setFile(e.target.files?.[0] || null)} 
                                />
                            </label>
                            <p className="text-xs text-muted-foreground mt-4 max-w-xs">
                                O sistema identificará automaticamente que estes usuários são <strong>{getRoleLabel(currentRole)}</strong>.
                            </p>
                        </>
                    )}
                </div>

                {isLoading && (
                  <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Processando {getRoleLabel(currentRole)}...</span>
                          <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </Tabs>
            
            {/* Avisos de Bloqueio (Feedback Visual) */}
            {isManagerLocked && currentRole === 'manager' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 items-center text-yellow-700 dark:text-yellow-400">
                <Lock className="w-5 h-5" />
                <p className="text-sm">Cadastre pelo menos um <strong>Superintendente</strong> para desbloquear o envio de Gerentes.</p>
              </div>
            )}
             {isStudentLocked && currentRole === 'student' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 items-center text-yellow-700 dark:text-yellow-400">
                <Lock className="w-5 h-5" />
                <p className="text-sm">Cadastre pelo menos um <strong>Gerente</strong> para desbloquear o envio de Alunos.</p>
              </div>
            )}
          </div>
        ) : (
          // Relatório Final
          <div className="py-6 space-y-6 animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-center mb-4">
               <div className="bg-green-100 p-4 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
               </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold">Processamento Finalizado</h3>
              <p className="text-muted-foreground">Resumo da importação de {getRoleLabel(currentRole)}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total</p>
                    <p className="text-3xl font-bold">{report.total}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardContent className="pt-6">
                    <p className="text-xs text-green-600 uppercase font-bold">Sucesso</p>
                    <p className="text-3xl font-bold text-green-600">{report.success}</p>
                  </CardContent>
                </Card>
                <Card className="border-yellow-500/20 bg-yellow-500/5">
                  <CardContent className="pt-6">
                    <p className="text-xs text-yellow-600 uppercase font-bold">Já Existiam</p>
                    <p className="text-3xl font-bold text-yellow-600">{report.skipped}</p>
                  </CardContent>
                </Card>
            </div>

            {report.errors.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-400 font-medium text-sm">
                        <AlertTriangle className="w-4 h-4" /> Erros Encontrados ({report.errors.length})
                    </div>
                    <div className="bg-red-950/10 border border-red-900/20 rounded-lg p-3 max-h-32 overflow-y-auto text-xs font-mono text-red-500">
                        {report.errors.map((err, i) => (
                            <div key={i} className="mb-1 border-b border-red-900/10 pb-1 last:border-0">{err}</div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        )}

        <DialogFooter>
            {!report ? (
                <Button 
                  onClick={handleUpload} 
                  disabled={!file || isLoading || (currentRole === 'manager' && isManagerLocked) || (currentRole === 'student' && isStudentLocked)} 
                  variant="netflix" 
                  className="w-full sm:w-auto"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isLoading ? 'Iniciar Importação' : `Importar ${getRoleLabel(currentRole)}`}
                </Button>
            ) : (
                <div className="flex gap-2 w-full">
                  <Button onClick={reset} variant="outline" className="flex-1">
                    Importar Mais
                  </Button>
                  <Button onClick={() => { reset(); onClose(); }} variant="default" className="flex-1">
                    Concluir
                  </Button>
                </div>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BatchUserUploadModal;