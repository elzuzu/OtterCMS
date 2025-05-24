import React from 'react';

export default function DataTable({
  columns = [],
  data = [],
  getRowKey,
  tableClassName = 'data-table',
  containerClassName = 'table-responsive'
}) {
  const keyGetter = getRowKey || ((row, idx) => row.id || idx);
  return (
    <div className={containerClassName}>
      <table className={tableClassName}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key || col.header} style={col.thStyle}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={keyGetter(row, idx)}>
              {columns.map(col => (
                <td key={col.key || col.header} style={col.tdStyle}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
