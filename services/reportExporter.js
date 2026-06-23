import ExcelJS from 'exceljs';

/**
 * Generates an Excel workbook and streams it directly to the client response.
 * @param {object} res - Express response object 
 * @param {string} filename - Downloadable filename (without extension)
 * @param {string} sheetName - Excel tab name
 * @param {Array} columns - Array of column objects: { header: 'Name', key: 'name', width: 20 }
 * @param {Array} data - Array of JSON objects matching the column keys
 */
export const exportToExcel = async (res, filename, sheetName, columns, data) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'UC COOP Loan Monitoring System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    // Set columns
    worksheet.columns = columns;

    // Apply corporate branding styling to Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1A365D' } // Navy blue
      };
      cell.font = {
        name: 'Arial',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' } // White text
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });

    // Populate data rows
    worksheet.addRows(data);

    // Apply alignments & grid borders to data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10 };
          
          // Border around cells
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Formatting for financial figures (if cell has numbers)
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0.00';
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
          } else {
            cell.alignment = { vertical: 'middle' };
          }
        });
      }
    });

    // Adjust column widths automatically based on value length
    worksheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.length : 12;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const valLen = cell.value.toString().length;
          if (valLen > maxLen) maxLen = valLen;
        }
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 40); // bounds between 12 and 40
    });

    // Write file headers to response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    // Write workbook stream directly to HTTP response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel Export Error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate Excel report export.' }
    });
  }
};
