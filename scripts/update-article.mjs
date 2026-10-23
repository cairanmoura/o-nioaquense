import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = {};
for (const line of readFileSync('D:/users/caira/Documents/Projetos Claude/O Nioaquense/.env', 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const url = env.SUPABASE_URL;
const anon = env.SUPABASE_ANON_KEY;

const loginRes = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'cairan23@gmail.com', password: 'Nioaque2026!Admin' }),
});
const { access_token } = await loginRes.json();

const supabase = createClient(url, anon, {
  global: { headers: { Authorization: `Bearer ${access_token}` } },
});

const { data, error } = await supabase
  .from('articles')
  .update({
    title: 'Outubro Rosa reforça prevenção e amplia o cuidado com a saúde da mulher em Nioaque',
    subtitle: 'Campanha mobiliza Secretaria de Saúde com programação nas ESFs',
    slug: 'outubro-rosa-reforca-prevencao-amplia-cuidado-saude-mulher-nioaque',
    summary_bullets: [
      'A campanha Outubro Rosa mobiliza a Secretaria Municipal de Saúde desde o início do mês.',
      'Ações são realizadas nas Estratégias de Saúde da Família (ESFs), com exames preventivos.',
      'A iniciativa busca conscientizar sobre a importância do diagnóstico precoce.',
    ],
    content: '<p>A prevenção e o diagnóstico precoce são fundamentais para o cuidado com a saúde da mulher. Em Nioaque, a campanha Outubro Rosa mobiliza, desde o início do mês, a Secretaria Municipal de Saúde em uma programação especial que busca conscientizar a população feminina sobre a importância dos exames preventivos, do acompanhamento profissional e da atenção aos sinais do próprio corpo.</p><p>As ações são realizadas nas Estratégias de Saúde da Família (ESFs), aproximando os serviços de saúde da comunidade e facilitando o acesso a exames e orientações.</p><p>A Secretaria de Saúde, liderada por Cristiane Sousa, reforça que o acompanhamento regular é essencial para a detecção precoce de doenças como o câncer de mama e do colo do útero.</p>',
    cover_image_url: '/covers/cap-01.svg',
    cover_image_caption: 'Campanha Outubro Rosa em Nioaque',
    category_label: 'Saúde',
    is_featured: true,
    views_count: 49,
    published_at: '2026-10-22T11:20:00Z',
  })
  .eq('id', '20000000-0000-4000-8000-000000000001')
  .select('title')
  .single();

if (error) console.error('Error:', error.message);
else console.log('Updated:', data.title);
