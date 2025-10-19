// Arquivo: /api/orcamentos.js (Versão 1.3.10 - Correção Salvar)

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

function handleError(res, error, context) {
  console.error(`Erro em ${context}:`, error.message, error.stack);
  res.status(500).json({ error: 'Internal Server Error', details: error.message });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const { method } = req;

  switch (method) {
    case 'GET':
      try {
        const { cliente_id, orcamento_id, painel_producao } = req.query;
        if (painel_producao === 'true') { /* ... (código GET Kanban sem alterações) ... */ }
        else if (orcamento_id) { /* ... (código GET Detalhes sem alterações) ... */ }
        else if (cliente_id) { /* ... (código GET Histórico sem alterações) ... */ }
        else { return res.status(400).json({ error: 'Parâmetros insuficientes para a busca.' }); }
      } catch (error) {
        return handleError(res, error, 'GET /api/orcamentos');
      }

    case 'POST':
      const clientPost = await dbPool.connect();
      try {
        await clientPost.query('BEGIN');
        const { cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;
        if (!cliente_id || !itens || itens.length === 0) { return res.status(400).json({ error: 'Dados insuficientes.' }); }
        const orcamentoResult = await clientPost.query(`INSERT INTO orcamentos (cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [cliente_id, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes]);
        const orcamentoId = orcamentoResult.rows[0].id;
        const codigoOrcamento = `ORC-${String(orcamentoId).padStart(4, '0')}`;
        await clientPost.query('UPDATE orcamentos SET codigo_orcamento = $1 WHERE id = $2', [codigoOrcamento, orcamentoId]);
        
        for (const item of itens) {
          // --- CORREÇÃO AQUI ---
          // Usar item.valor_unitario (com underscore) para corresponder ao que o frontend envia
          await clientPost.query(`INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, 
            [orcamentoId, item.descricao, item.quantidade, item.valor_unitario]); 
        }

        await clientPost.query('COMMIT');
        return res.status(201).json({ message: 'Orçamento salvo com sucesso!', codigoOrcamento: codigoOrcamento });
      } catch (error) {
        await clientPost.query('ROLLBACK');
        return handleError(res, error, 'POST /api/orcamentos');
      } finally {
        clientPost.release();
      }

    case 'PUT':
      const clientPut = await dbPool.connect();
      try {
        await clientPut.query('BEGIN');
        const { orcamento_id } = req.query;
        const { status, numero_oc, subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, itens } = req.body;
        if (!orcamento_id) { return res.status(400).json({ error: 'ID do orçamento é obrigatório.' }); }
        
        if (status && numero_oc) { /* ... (código Iniciar Produção sem alterações) ... */ } 
        else if (status) { /* ... (código Mudar Status sem alterações) ... */ } 
        else if (itens) { // Caso: Edição completa do orçamento
          await clientPut.query(`UPDATE orcamentos SET subtotal=$1, desconto_valor=$2, desconto_tipo=$3, valor_total=$4, observacoes=$5 WHERE id=$6`, [subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, orcamento_id]);
          await clientPut.query('DELETE FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
          for (const item of itens) {
            // --- CORREÇÃO AQUI ---
            // Usar item.valor_unitario (com underscore) para corresponder ao que o frontend envia
            await clientPut.query(
              `INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, 
              [orcamento_id, item.descricao, item.quantidade, item.valor_unitario]); 
          }
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
