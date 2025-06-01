import React from 'react';

export function Tab({ label, value }) {
  return <>{label}</>; // used only for props
}

export default function DattaTabs({ value, onChange, children }) {
  const tabs = React.Children.map(children, child => {
    if (!child) return null;
    const isActive = child.props.value === value;
    return (
      <li className="nav-item">
        <a
          href="#"
          className={`nav-link ${isActive ? 'active' : ''}`}
          onClick={e => {
            e.preventDefault();
            onChange && onChange(e, child.props.value);
          }}
        >
          {child.props.label}
        </a>
      </li>
    );
  });

  return <ul className="nav nav-tabs mb-3">{tabs}</ul>;
}
