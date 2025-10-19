// Arquivo: /api/orcamentos.js (Versão 1.3.12)

import { createPool } from '@vercel/postgres';

const dbPool = createPool({
  connectionString: process.env.CLIENTES_POSTGRES_URL,
});

function handleError(res, error, context) {
  console.error(`!!! ERRO DETALHADO em ${context}:`, error.message, error.stack);
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
        if (painel_producao === 'true') {
          const { rows } = await dbPool.query(` SELECT o.id, o.codigo_orcamento, o.status, o.valor_total, o.numero_oc, c.nome as cliente_nome, COALESCE((SELECT SUM(valor_pago) FROM pagamentos WHERE orcamento_id = o.id), 0) as total_pago FROM orcamentos o JOIN clientes c ON o.cliente_id = c.id WHERE o.status IN ('Aprovado', 'Em Produção', 'Concluído') ORDER BY o.data_criacao DESC `);
          return res.status(200).json(rows);
        } else if (orcamento_id) {
          const { rows: orcamentoRows } = await dbPool.query( `SELECT o.*, c.nome as cliente_nome, c.cnpj_cpf as cliente_cnpj_cpf, c.email as cliente_email, c.telefone as cliente_telefone FROM orcamentos o JOIN clientes c ON o.cliente_id = c.id WHERE o.id = $1`, [orcamento_id] );
          if (orcamentoRows.length === 0) return res.status(404).json({ error: 'Orçamento não encontrado.' });
          const { rows: itensRows } = await dbPool.query('SELECT * FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
          const orcamentoCompleto = { ...orcamentoRows[0], itens: itensRows };
          return res.status(200).json(orcamentoCompleto);
        } else if (cliente_id) {
          const { rows } = await dbPool.query( `SELECT o.id, o.codigo_orcamento, o.data_criacao, o.valor_total, o.status, COALESCE((SELECT SUM(valor_pago) FROM pagamentos WHERE orcamento_id = o.id), 0) as total_pago FROM orcamentos o WHERE o.cliente_id = $1 ORDER BY o.data_criacao DESC`, [cliente_id] );
          return res.status(200).json(rows);
        } else {
          return res.status(400).json({ error: 'Parâmetros insuficientes para a busca.' });
        }
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
        for (const item of itens) { await clientPost.query(`INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, [orcamentoId, item.descricao, item.quantidade, item.valor_unitario]); }
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
        
        // Busca o status atual antes de tentar editar
        const { rows: statusAtualRows } = await clientPut.query('SELECT status FROM orcamentos WHERE id = $1', [orcamento_id]);
        if (statusAtualRows.length === 0) {
          await clientPut.query('ROLLBACK');
          return res.status(404).json({ error: 'Orçamento não encontrado para atualização.'});
        }
        const statusAtual = statusAtualRows[0].status;

        if (status && numero_oc) { // Caso: Iniciar Produção
          if (statusAtual !== 'Aprovado') { 
            await clientPut.query('ROLLBACK');
            return res.status(400).json({ error: 'Só é possível iniciar a produção de orçamentos aprovados.' });
          }
          await clientPut.query('UPDATE orcamentos SET status = $1, numero_oc = $2, data_inicio_producao = CURRENT_DATE WHERE id = $3', [status, numero_oc, orcamento_id]);
        
        } else if (status) { // Caso: Apenas mudar o status (Aprovar, Concluir, etc.)
          // Adicionar validações de fluxo se necessário (ex: não pode voltar status)
          await clientPut.query('UPDATE orcamentos SET status = $1 WHERE id = $2', [status, orcamento_id]);
        
        } else if (itens) { // Caso: Edição completa do orçamento
          // VERIFICAÇÃO DE SEGURANÇA NO BACKEND
          if (statusAtual === 'Em Produção' || statusAtual === 'Concluído') {
            await clientPut.query('ROLLBACK');
            return res.status(400).json({ error: 'Não é possível editar orçamentos em produção ou concluídos.' });
          }
          await clientPut.query(`UPDATE orcamentos SET subtotal=$1, desconto_valor=$2, desconto_tipo=$3, valor_total=$4, observacoes=$5 WHERE id=$6`, [subtotal, desconto_valor, desconto_tipo, valor_total, observacoes, orcamento_id]);
          await clientPut.query('DELETE FROM orcamento_itens WHERE orcamento_id = $1', [orcamento_id]);
          for (const item of itens) {
            await clientPut.query( `INSERT INTO orcamento_itens (orcamento_id, descricao, quantidade, valor_unitario) VALUES ($1, $2, $3, $4)`, [orcamento_id, item.descricao, item.quantidade, item.valor_unitario]); 
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

    // NOVA ROTA: Excluir um orçamento
    case 'DELETE':
      const clientDelete = await dbPool.connect();
       try {
        const { orcamento_id } = req.query;
        if (!orcamento_id) {
          return res.status(400).json({ error: 'ID do orçamento é obrigatório para exclusão.' });
        }
        
        // O ON DELETE CASCADE na tabela orcamento_itens cuidará de apagar os itens
        // O ON DELETE CASCADE na tabela pagamentos cuidará de apagar os pagamentos
        await clientDelete.query('DELETE FROM orcamentos WHERE id = $1', [orcamento_id]);
        
        return res.status(200).json({ message: 'Orçamento excluído com sucesso!' });
      } catch (error) {
        return handleError(res, error, 'DELETE /api/orcamentos');
      } finally {
        clientDelete.release();
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']); // Adiciona DELETE aos métodos permitidos
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
