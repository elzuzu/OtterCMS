import React from 'react';

export default function DattaPageTitle({ title, breadcrumb }) {
  return (
    <div className="page-header">
      <h2 className="page-title">{title}</h2>
      {breadcrumb && <div className="breadcrumb">{breadcrumb}</div>}
    </div>
  );
}
