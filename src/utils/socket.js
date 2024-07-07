"use client";

import { io } from "socket.io-client";

export const socket = io(
  "https://tennis-websocket-server-797bb90cf421.herokuapp.com",
  {
    transports: ["websocket", "polling"],
  }
);
