import React, { createContext, useContext, useState } from 'react';

const WorkflowContext = createContext(null);

export function WorkflowProvider({ children }) {
  const [currentAssignment, setCurrentAssignment] = useState(null);
  const [currentRubric, setCurrentRubric] = useState(null);
  const [currentGrading, setCurrentGrading] = useState(null);

  const value = {
    currentAssignment, setCurrentAssignment,
    currentRubric, setCurrentRubric,
    currentGrading, setCurrentGrading,
  };
  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflow must be inside WorkflowProvider');
  return ctx;
}
