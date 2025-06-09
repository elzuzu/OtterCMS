import React from 'react';

export default function DattaPageTitle({ title, breadcrumb }) {
  return (
    <div className="page-header">
      <div className="page-block">
        <div className="row align-items-center">
          <div className="col-md-12">
            <div className="page-header-title">
              <h5 className="m-b-10">{title}</h5>
            </div>
            {breadcrumb && <ul className="breadcrumb">{breadcrumb}</ul>}
          </div>
        </div>
      </div>
    </div>
  );
}
