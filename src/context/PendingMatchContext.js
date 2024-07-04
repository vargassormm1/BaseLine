"use client";
import React, { createContext, useState } from "react";

const PendingMatchContext = createContext();

const PendingMatchProvider = ({ children }) => {
  const [pendingMatchChanged, setPendingMatchChanged] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  return (
    <PendingMatchContext.Provider
      value={{
        pendingMatchChanged,
        setPendingMatchChanged,
        unreadMessageCount,
        setUnreadMessageCount,
      }}
    >
      {children}
    </PendingMatchContext.Provider>
  );
};

export { PendingMatchContext, PendingMatchProvider };
