import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { addDays, subDays, isSameDay, format, parseISO } from 'https://esm.sh/date-fns@4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  try {
    const today = new Date();
    const todayISO = today.toISOString();
    
    console.log(`Starting daily notification process: ${todayISO}`);

    // --- HELPER: Send Notification via local function ---
    const triggerPush = async (userId: string, type: string, referenceId: string, title: string, message: string, monthYear?: string) => {
      // Prevent duplicates
      const { data: exists } = await supabase
        .from('notifications_log')
        .select('id')
        .eq('user_id', userId)
        .eq('type', type)
        .eq('reference_id', referenceId)
        .maybeSingle();

      if (exists) return;

      console.log(`Sending alert ${type} to user ${userId}`);

      // Call the send-notification function
      await supabase.functions.invoke('send-notification', {
        body: { userId, type, title, message }
      });

      // Log it
      await supabase.from('notifications_log').insert({
        user_id: userId,
        type,
        reference_id: referenceId,
        month_year: monthYear || format(today, 'yyyy-MM')
      });
    };

    // --- 1. Módulo: Cartões de Crédito ---
    // Fetch faturas that are open or closed (not paid)
    const { data: faturas } = await supabase
        .from('faturas')
        .select('*, cards(name)')
        .neq('status', 'paga');

    if (faturas) {
      for (const f of faturas) {
        const closingDate = parseISO(f.dataFechamento);
        const dueDate = parseISO(f.dataVencimento);
        const cardName = f.cards?.name || 'seu cartão';
        const valor = f.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Trigger 1: Fechamento (D-0)
        if (isSameDay(today, closingDate)) {
          await triggerPush(f.userId, 'fatura_fechada', f.id, "Fatura Fechada!", `A fatura do seu cartão ${cardName} fechou em ${valor}. O que comprar agora só entra no mês que vem!`);
        }
        // Trigger 2: 5 dias antes do Vencimento
        if (isSameDay(today, subDays(dueDate, 5))) {
          await triggerPush(f.userId, 'fatura_vencimento_5d', f.id, "⚠️ Fatura próxima do vencimento", `Faltam 5 dias para o vencimento da sua fatura do ${cardName} no valor de ${valor}.`);
        }
        // Trigger 3: Dia do Vencimento
        if (isSameDay(today, dueDate)) {
          await triggerPush(f.userId, 'fatura_vencimento_hoje', f.id, "🚨 Vence HOJE!", `Não esqueça de pagar a fatura do ${cardName} hoje para evitar juros.`);
        }
        // Trigger 4: Atrasada (V+3)
        if (isSameDay(today, addDays(dueDate, 3))) {
          await triggerPush(f.userId, 'fatura_atrasada', f.id, "❌ Fatura em Atraso", `A fatura do ${cardName} venceu há 3 dias. Registre o pagamento ou regularize para evitar juros altos.`);
        }
      }
    }

    // --- 2. Módulo: Despesas Manuais ---
    // Fetch pending manual expenses (account conta_unica)
    const { data: expenses } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'pending')
        .eq('accountId', 'conta_unica');

    if (expenses) {
      for (const e of expenses) {
        const dueDate = parseISO(e.date);
        const desc = e.description;
        const valor = e.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Trigger 1: 5 dias antes
        if (isSameDay(today, subDays(dueDate, 5))) {
          await triggerPush(e.userId, 'despesa_vencimento_5d', e.id, "🗓️ Despesa se aproximando", `O pagamento de "${desc}" (${valor}) vence em 5 dias.`);
        }
        // Trigger 2: 1 dia antes
        if (isSameDay(today, subDays(dueDate, 1))) {
          await triggerPush(e.userId, 'despesa_vencimento_1d', e.id, "⏰ Vence amanhã!", `Fique de olho: "${desc}" vence amanhã.`);
        }
        // Trigger 3: Dia do Vencimento
        if (isSameDay(today, dueDate)) {
          await triggerPush(e.userId, 'despesa_vencimento_hoje', e.id, "🚨 Pague hoje!", `O lançamento "${desc}" (${valor}) precisa ser pago hoje.`);
        }
        // Trigger 4: Atrasada (V+3)
        if (isSameDay(today, addDays(dueDate, 3))) {
          await triggerPush(e.userId, 'despesa_atrasada', e.id, "❌ Pagamento Atrasado", `O lançamento "${desc}" está atrasado há 3 dias. Já efetuou o pagamento?`);
        }
      }
    }

    // --- 3. Módulo: Objetivos ---
    // Rule: Dia 25, check progress
    if (today.getDate() === 25) {
      const { data: goals } = await supabase.from('goals').select('*');
      if (goals) {
        const currentMonth = format(today, 'yyyy-MM');
        for (const g of goals) {
          const progress = g.progress || [];
          const currentMonthProgress = progress.find((p: any) => p.month === currentMonth);
          if (!currentMonthProgress || currentMonthProgress.status === 'pending') {
            await triggerPush(g.userId, 'meta_objetivo', g.id, "🎯 Foco no objetivo!", `O mês está acabando! Você ainda não guardou o valor deste mês para o objetivo "${g.name}".`, currentMonth);
          }
        }
      }
    }

    // --- 4. Módulo: Relatórios Mensais ---
    // Rule: Dia 01, 09h00 (The job runs once a day, so we just check if it's the 1st)
    if (today.getDate() === 1) {
      const { data: users } = await supabase.from('auth.users').select('id');
      // For each user profile... or just handle it if they have notifications enabled
      // Note: We need a way to list users. Usually we query from a profiles table.
      const { data: profiles } = await supabase.from('profiles').select('id');
      if (profiles) {
        const lastMonthName = format(subDays(today, 1), 'MMMM', { locale: (await import('https://esm.sh/date-fns/locale/pt-BR')).default });
        for (const p of profiles) {
          await triggerPush(p.id, 'relatorio_mensal', 'mensal', "📊 Relatório Fechado!", `O seu relatório financeiro de ${lastMonthName} está pronto. Toque aqui para ver como foi o seu desempenho!`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error('Error in processing notifications:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
})
