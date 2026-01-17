"use client";
import React, { createContext, useState } from "react";

const PendingMatchContext = createContext();

const PendingMatchProvider = ({ children }) => {
  const [pendingMatchChanged, setPendingMatchChanged] = useState(false);

  return (
    <PendingMatchContext.Provider
      value={{
        pendingMatchChanged,
        setPendingMatchChanged,
      }}
    >
      {children}
    </PendingMatchContext.Provider>
  );
};

export { PendingMatchContext, PendingMatchProvider };
