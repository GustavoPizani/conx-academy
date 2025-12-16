import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Usar useAuth em vez de useUserRole para estabilidade

interface RankingConfigData {
  id: string;
  course_completion_points: number;
  rewatch_course_points: number;
  podcast_access_points: number;
  book_access_points: number;
}

const RankingConfig: React.FC = () => {
  const { user } = useAuth(); // Dependência estável
  const navigate = useNavigate();
  const { toast } = useToast();
  const [config, setConfig] = useState<Partial<RankingConfigData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // 1. Verificação de Segurança Estável
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }

    const fetchConfig = async () => {
      setIsLoading(true);
      
      // Tentar buscar configuração existente
      const { data, error } = await supabase
        .from('ranking_config')
        .select('*')
        .limit(1)
        .maybeSingle(); // maybeSingle não dá erro se vier vazio

      if (error) {
        toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
      } else if (data) {
        setConfig(data);
      } else {
        // Se não existir, criar padrão
        const defaultConfig = {
            course_completion_points: 100,
            rewatch_course_points: 10,
            podcast_access_points: 5,
            book_access_points: 5
        };
        const { data: newData, error: createError } = await supabase
            .from('ranking_config')
            .insert(defaultConfig)
            .select()
            .single();
            
        if (newData) setConfig(newData);
      }
      setIsLoading(false);
    };

    fetchConfig();
  }, [user, navigate, toast]); // Dependências corrigidas

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: Number(value) || 0 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.id) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('ranking_config')
      .update({
        course_completion_points: config.course_completion_points,
        rewatch_course_points: config.rewatch_course_points,
        podcast_access_points: config.podcast_access_points,
        book_access_points: config.book_access_points,
      })
      .eq('id', config.id);

    setIsSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: 'Configurações de ranking salvas.' });
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Configurações de Ranking</h1>
          <p className="text-muted-foreground">Defina a pontuação para as atividades dos usuários.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-primary" />Pontuação</CardTitle>
            <CardDescription>Ajuste os pontos que os usuários ganham ao completar ações na plataforma.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="course_completion_points">Pontos por Curso Concluído</Label><Input id="course_completion_points" name="course_completion_points" type="number" value={config.course_completion_points || ''} onChange={handleInputChange} className="bg-surface" /><p className="text-xs text-muted-foreground">Pontos base que serão divididos pelo número de aulas do curso.</p></div>
              <div className="space-y-2"><Label htmlFor="rewatch_course_points">Pontos por Reassistir Curso</Label><Input id="rewatch_course_points" name="rewatch_course_points" type="number" value={config.rewatch_course_points || ''} onChange={handleInputChange} className="bg-surface" /></div>
              <div className="space-y-2"><Label htmlFor="podcast_access_points">Pontos por Acessar Podcast</Label><Input id="podcast_access_points" name="podcast_access_points" type="number" value={config.podcast_access_points || ''} onChange={handleInputChange} className="bg-surface" /></div>
              <div className="space-y-2"><Label htmlFor="book_access_points">Pontos por Acessar Livro</Label><Input id="book_access_points" name="book_access_points" type="number" value={config.book_access_points || ''} onChange={handleInputChange} className="bg-surface" /></div>
              <div className="flex justify-end"><Button type="submit" variant="netflix" disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Alterações'}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RankingConfig;