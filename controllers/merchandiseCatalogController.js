import pool from '../config/db.js';

/**
 * @desc Get all merchandise items from catalog
 * @route GET /api/collections/catalog
 * @access Private (Admin, Staff)
 */
export async function getMerchandiseCatalog(req, res) {
  try {
    const { category, search } = req.query;
    let query = `SELECT * FROM merchandise_catalog WHERE 1=1`;
    const params = [];

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (item_name ILIKE $${params.length} OR description ILIKE $${params.length} OR size ILIKE $${params.length})`;
    }

    query += ` ORDER BY item_name ASC, description ASC, size ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (error) {
    console.error('Error fetching merchandise catalog:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch merchandise catalog' }
    });
  }
}

/**
 * @desc Create single merchandise catalog item
 * @route POST /api/collections/catalog
 * @access Private (Admin)
 */
export async function createMerchandiseCatalogItem(req, res) {
  try {
    const {
      item_name,
      description,
      size,
      cost_price,
      selling_price,
      cost_price_2025,
      selling_price_2025,
      category,
      effective_date
    } = req.body;

    if (!item_name || !item_name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Item name is required' }
      });
    }

    const result = await pool.query(
      `INSERT INTO merchandise_catalog (
        item_name, description, size, cost_price, selling_price,
        cost_price_2025, selling_price_2025, category, effective_date, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        item_name.trim(),
        description ? description.trim() : null,
        size ? size.trim() : null,
        parseFloat(cost_price) || 0,
        parseFloat(selling_price) || 0,
        parseFloat(cost_price_2025) || 0,
        parseFloat(selling_price_2025) || 0,
        category || 'Merchandise',
        effective_date || 'As of October 15, 2026'
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Item added to catalog'
    });
  } catch (error) {
    console.error('Error creating catalog item:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to create catalog item' }
    });
  }
}

/**
 * @desc Update merchandise catalog item
 * @route PUT /api/collections/catalog/:id
 * @access Private (Admin)
 */
export async function updateMerchandiseCatalogItem(req, res) {
  try {
    const { id } = req.params;
    const {
      item_name,
      description,
      size,
      cost_price,
      selling_price,
      cost_price_2025,
      selling_price_2025,
      category,
      effective_date
    } = req.body;

    const result = await pool.query(
      `UPDATE merchandise_catalog SET
        item_name = COALESCE($1, item_name),
        description = COALESCE($2, description),
        size = COALESCE($3, size),
        cost_price = COALESCE($4, cost_price),
        selling_price = COALESCE($5, selling_price),
        cost_price_2025 = COALESCE($6, cost_price_2025),
        selling_price_2025 = COALESCE($7, selling_price_2025),
        category = COALESCE($8, category),
        effective_date = COALESCE($9, effective_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        item_name ? item_name.trim() : null,
        description !== undefined ? (description ? description.trim() : null) : null,
        size !== undefined ? (size ? size.trim() : null) : null,
        cost_price !== undefined ? parseFloat(cost_price) || 0 : null,
        selling_price !== undefined ? parseFloat(selling_price) || 0 : null,
        cost_price_2025 !== undefined ? parseFloat(cost_price_2025) || 0 : null,
        selling_price_2025 !== undefined ? parseFloat(selling_price_2025) || 0 : null,
        category || null,
        effective_date || null,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Catalog item not found' }
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Catalog item updated'
    });
  } catch (error) {
    console.error('Error updating catalog item:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to update catalog item' }
    });
  }
}

/**
 * @desc Delete merchandise catalog item
 * @route DELETE /api/collections/catalog/:id
 * @access Private (Admin)
 */
export async function deleteMerchandiseCatalogItem(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM merchandise_catalog WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Catalog item not found' }
      });
    }
    return res.status(200).json({
      success: true,
      message: 'Catalog item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting catalog item:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete catalog item' }
    });
  }
}

/**
 * @desc Bulk import or replace merchandise catalog items from Excel
 * @route POST /api/collections/catalog/bulk-import
 * @access Private (Admin)
 */
export async function bulkImportMerchandiseCatalog(req, res) {
  const client = await pool.connect();
  try {
    const { items, mode, effective_date } = req.body; // mode: 'append' | 'replace'
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No items provided for import' }
      });
    }

    await client.query('BEGIN');

    if (mode === 'replace') {
      await client.query('TRUNCATE TABLE merchandise_catalog');
    }

    let inserted = 0;
    for (const it of items) {
      const name = String(it.item_name || it.item || '').trim();
      if (!name) continue;

      const desc = it.description !== undefined ? String(it.description || '').trim() : null;
      const size = it.size !== undefined ? String(it.size || '').trim() : null;
      const cp = parseFloat(it.cost_price || it.cost || 0) || 0;
      const sp = parseFloat(it.selling_price || it.price || 0) || 0;
      const cp2025 = parseFloat(it.cost_price_2025 || 0) || 0;
      const sp2025 = parseFloat(it.selling_price_2025 || 0) || 0;
      const category = it.category || 'Merchandise';
      const effDate = it.effective_date || effective_date || 'As of October 15, 2026';

      await client.query(
        `INSERT INTO merchandise_catalog (
          item_name, description, size, cost_price, selling_price,
          cost_price_2025, selling_price_2025, category, effective_date, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [name, desc, size, cp, sp, cp2025, sp2025, category, effDate]
      );
      inserted++;
    }

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message: `Successfully imported ${inserted} merchandise items into catalog`,
      count: inserted
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk importing merchandise catalog:', error);
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to bulk import merchandise catalog' }
    });
  } finally {
    client.release();
  }
}

