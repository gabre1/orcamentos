// Arquivo: /api/orcamentos.js

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

function handleError(res, error, context) {
  console.error(`Erro em ${context}:`, error);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
}

export default async function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { cliente_id, orcamento_id, painel_producao } = req.query;

        if (painel_producao === 'true') {
          const { rows } = await dbPool.query(`
            SELECT 
              o.id, o.codigo_orcamento, o.status, o.valor_total, o.numero_oc, c.nome as cliente_nome,
              COALESCE((SELECT SUM(valor_pago) FROM pagamentos WHERE orcamento_id = o.id), 0) as total_pago
            FROM orcamentos o
            JOIN clientes c ON o.cliente_id = c.id
            WHERE o.status IN ('Aprovado', 'Em Produção', 'Concluído')
            ORDER BY o.data_criacao DESC
          `);
          return res.status(200).json(rows);
        }
        
        if (orcamento_id) { /* ... (código existente sem alterações para buscar detalhes) ... */ }
        if (cliente_id) { /* ... (código existente sem alterações para buscar histórico) ... */ }

        return res.status(400).json({ error: 'Parâmetros insuficientes.' });
      } catch (error) {
        return handleError(res, error, 'GET /api/orcamentos');
      }

    case 'POST':
      // ... (código existente para criar orçamentos - sem alterações) ...
      
    case 'PUT':
      const clientPut = await dbPool.connect();
      try {
        await clientPut.query('BEGIN');
        const { orcamento_id } = req.query;
        // Agora aceitamos status, numero_oc, e outros campos para edição
        const { status, numero_oc, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;

        if (!orcamento_id) { return res.status(400).json({ error: 'ID do orçamento é obrigatório.' }); }

        if (status) { // Atualização simples de status
          await clientPut.query('UPDATE orcamentos SET status = $1 WHERE id = $2', [status, orcamento_id]);
        }
        
        if (numero_oc) { // Vinculando OC e iniciando produção
          await clientPut.query('UPDATE orcamentos SET status = $1, numero_oc = $2, data_inicio_producao = CURRENT_DATE WHERE id = $3', ['Em Produção', numero_oc, orcamento_id]);
        }
        
        if (itens) { // Edição completa do orçamento
          await clientPut.query(`UPDATE orcamentos SET subtotal=$1, desconto_valor=$2, desconto_tipo=$3, valor_total=$4, observacoes=$5 WHERE id=$6`, [subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, orcamento_id]);
          await clientPut.query('DELETE FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
          for (const item of itens) { await clientPut.query(`INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, [orcamento_id, item.descricao, item.quantidade, item.valorUnitario]); }
        }

        await clientPut.query('COMMIT');
        return res.status(200).json({ message: 'Orçamento atualizado com sucesso!' });
      } catch (error) {
        await clientPut.query('ROLLBACK');
        return handleError(res, error, 'PUT /api/orcamentos');
      } finally {
        clientPut.release();
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
