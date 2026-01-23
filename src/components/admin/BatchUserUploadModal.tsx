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
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<{ total: number; success: number; skipped: number; errors: string[] } | null>(null);
  
  const [currentRole, setCurrentRole] = useState<'student' | 'manager' | 'superintendent' | 'coordinator'>('superintendent');

  const [counts, setCounts] = useState({
    superintendents: 0,
    managers: 0
  });

  useEffect(() => {
    if (open) {
      fetchCounts();
      setFile(null);
      setReport(null);
      setProgress(0);
      setCurrentRole('superintendent');
    }
  }, [open]);

  const fetchCounts = async () => {
    const { count: superCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'superintendent');
    const { count: managerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'manager');
    setCounts({ superintendents: superCount || 0, managers: managerCount || 0 });
  };

  // ==================================================================================
  // NOVA LÓGICA DE DOWNLOAD INTELIGENTE
  // ==================================================================================
  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const headers = ['Nome,Email,Time (Nome do Gestor),LISTA_DE_OPCOES_VALIDAS (Copie daqui)'];
      let csvRows = [];
      let parentOptions: { name: string, team?: string }[] = [];

      // 1. Busca as opções válidas no banco para ajudar o usuário
      if (currentRole === 'student') {
        // Alunos precisam de Gerentes
        const { data } = await supabase.from('profiles').select('name, team').eq('role', 'manager');
        parentOptions = data || [];
      } else if (currentRole === 'manager') {
        // Gerentes precisam de Superintendentes
        const { data } = await supabase.from('profiles').select('name, team').eq('role', 'superintendent');
        parentOptions = data || [];
      }
      
      // 2. Monta as linhas do CSV
      // Se tivermos opções (pais), vamos listar elas na 4ª coluna para referência
      const maxRows = Math.max(1, parentOptions.length); // Garante pelo menos 1 linha de exemplo

      for (let i = 0; i < maxRows; i++) {
        let col1 = '', col2 = '', col3 = '', col4 = '';

        // Preenche a primeira linha com um exemplo válido
        if (i === 0) {
          col1 = `Exemplo ${getRoleLabel(currentRole)}`;
          col2 = `usuario${Math.floor(Math.random()*100)}@empresa.com`;
          
          if (currentRole === 'superintendent') {
            col3 = 'Diretoria Comercial';
          } else if (parentOptions.length > 0) {
            col3 = parentOptions[0].name; // Já preenche o exemplo com o primeiro chefe da lista
          } else {
            col3 = 'Nome do Gestor Aqui';
          }
        }

        // Preenche a 4ª coluna com a lista de chefes disponíveis
        if (i < parentOptions.length) {
          col4 = parentOptions[i].name; 
          // Opcional: Adicionar o time do chefe entre parênteses se quiser: 
          // col4 = `${parentOptions[i].name} (${parentOptions[i].team || 'Sem Área'})`;
        } else if (i === 0 && parentOptions.length === 0 && currentRole !== 'superintendent') {
          col4 = '(Nenhum gestor encontrado no sistema)';
        }

        csvRows.push(`${col1},${col2},${col3},${col4}`);
      }

      // Se for Superintendente, não tem lista de opções, mas adicionamos instrução
      if (currentRole === 'superintendent') {
        csvRows = [`Exemplo Super,super@conx.com,Diretoria de Vendas, (Coluna apenas informativa)`];
      }
      // Se for Admin/Coord
      if (currentRole === 'coordinator') {
        csvRows = [`Exemplo Coord,coord@conx.com,, (Sem vínculo necessário)`];
      }

      const csvContent = "\uFEFF" + [headers, ...csvRows].join("\n"); // \uFEFF adiciona BOM para o Excel abrir acentos corretamente
      
      const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `modelo_importacao_${currentRole}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível gerar o modelo.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  // ==================================================================================
  // PARSER ROBUSTO (Ignora linhas vazias ou de referência)
  // ==================================================================================
  const handleUpload = async () => {
    if (!file) return;
    setIsLoading(true);
    setProgress(10);
    setReport(null);

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) { setIsLoading(false); return; }

      const lines = text.split('\n');
      const usersToProcess = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const separator = line.includes(';') ? ';' : ',';
          const cols = line.split(separator);
          
          if (cols.length >= 2) {
            const name = cols[0]?.trim();
            const email = cols[1]?.trim();
            
            // IMPORTANTE: Ignora linhas que não têm nome OU não têm email
            // Isso permite que o CSV tenha uma lista de referência na direita sem quebrar a importação
            if (!name || !email) continue; 

            usersToProcess.push({
              name: name,
              email: email.toLowerCase(),
              role: currentRole,
              team: cols[2]?.trim() || null // Pega o time da 3ª coluna
            });
          }
        }
      }

      setProgress(30);

      if (usersToProcess.length === 0) {
        toast({ title: "Arquivo vazio ou sem dados válidos", description: "Verifique se preencheu as colunas Nome e Email.", variant: "destructive" });
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
            fetchCounts(); 
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

  const isManagerLocked = counts.superintendents === 0;
  const isStudentLocked = counts.managers === 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if(!isOpen) reset(); onClose(); }}>
      <DialogContent className="sm:max-w-[700px] bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Cadastro em Massa Inteligente
          </DialogTitle>
          <DialogDescription>
            Baixe o modelo. Ele já virá com a lista de gestores existentes para você copiar e colar.
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
                      {currentRole === 'student' ? 'O CSV trará a lista de Gerentes existentes para facilitar.' : ''}
                      {currentRole === 'manager' ? 'O CSV trará a lista de Superintendentes existentes.' : ''}
                      {currentRole === 'superintendent' && 'Defina os nomes das Diretorias/Áreas na coluna Time.'}
                    </p>
                  </div>
                </div>

                {/* Botão de Download Inteligente */}
                <div className="bg-muted/30 p-4 rounded-lg border border-border flex items-center justify-between mb-4">
                  <div className="flex gap-3 items-center">
                    <div className="bg-background p-2 rounded-full border">
                      <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Passo 1: Baixe o Modelo Inteligente</p>
                      <p className="text-xs text-muted-foreground">Inclui lista de gestores para referência.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadTemplate} disabled={isDownloading}>
                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Download className="w-4 h-4 mr-2" />}
                    {isDownloading ? 'Gerando...' : 'Baixar Modelo'}
                  </Button>
                </div>

                {/* Upload */}
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
                                O sistema ignorará automaticamente as colunas de referência do modelo.
                            </p>
                        </>
                    )}
                </div>

                {isLoading && (
                  <div className="mt-6 space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground font-medium">
                          <span>Processando...</span>
                          <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </Tabs>
            
            {/* Alertas de Bloqueio */}
            {isManagerLocked && currentRole === 'manager' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 items-center text-yellow-700 dark:text-yellow-400">
                <Lock className="w-5 h-5" />
                <p className="text-sm">Cadastre pelo menos um <strong>Superintendente</strong> antes de importar Gerentes.</p>
              </div>
            )}
             {isStudentLocked && currentRole === 'student' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 items-center text-yellow-700 dark:text-yellow-400">
                <Lock className="w-5 h-5" />
                <p className="text-sm">Cadastre pelo menos um <strong>Gerente</strong> antes de importar Alunos.</p>
              </div>
            )}
          </div>
        ) : (
          // Relatório Final (igual ao anterior)
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