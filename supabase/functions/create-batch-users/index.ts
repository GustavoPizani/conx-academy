// supabase/functions/create-batch-users/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Cria o cliente Supabase com a chave de ADMIN (Service Role)
    // Essa chave nunca deve ir para o Front-end, só vive aqui no servidor.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Recebe a lista de usuários do Front-end
    const { users } = await req.json()

    if (!users || !Array.isArray(users)) {
      throw new Error('Formato inválido. Esperado array de usuários.')
    }

    const results = {
      success: 0,
      errors: [] as string[]
    }

    // 3. Loop de Criação
    for (const user of users) {
      // TENTA CRIAR SEM ENVIAR E-MAIL (Auto Confirmado)
      // Isso burla o limite de emails/h do Supabase
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        email_confirm: true, // Já cria confirmado!
        user_metadata: {
          name: user.name,
          role: user.role,
          team: user.team
        }
      })

      if (error) {
        console.error(`Erro ao criar ${user.email}:`, error)
        if (error.message.includes('already registered') || error.status === 422) {
           results.errors.push(`${user.email}: Já cadastrado.`)
        } else {
           results.errors.push(`${user.email}: ${error.message}`)
        }
      } else {
        results.success++
      }
    }

    // 4. Retorna o relatório
    return new Response(
      JSON.stringify(results),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})