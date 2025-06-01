import React from 'react';

export const StepLabel = ({ children }) => <span>{children}</span>;

export const Step = ({ children }) => <>{children}</>;

export default function DattaStepper({ activeStep = 0, children }) {
  const steps = React.Children.map(children, (child, idx) => {
    if (!child) return null;
    const labelEl = React.Children.toArray(child.props.children).find(
      ch => ch?.type === StepLabel
    );
    const label = labelEl ? labelEl.props.children : '';
    const status = idx < activeStep ? 'completed' : idx === activeStep ? 'active' : '';
    const disabled = child.props.disabled;
    return (
      <li className={`step ${status} ${disabled ? 'disabled' : ''}`}>{label}</li>
    );
  });
  return <ul className="stepper mb-3">{steps}</ul>;
}
