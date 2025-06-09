import React from 'react';
import DattaAlert from './DattaAlert';

export default function DattaSecurityAlert({ message }) {
  return (
    <DattaAlert type="danger">
      <i className="feather icon-shield me-2"></i>
      {message}
    </DattaAlert>
  );
}
