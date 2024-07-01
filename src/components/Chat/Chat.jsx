"use client";

import * as Ably from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";
import ChatBox from "../ChatBox/ChatBox";

export default function Chat({ currentUser, currentThread }) {
  const client = new Ably.Realtime({
    authUrl: `/api/ably/${currentUser?.userId}`,
  });

  const channel = `${currentThread?.user1?.userId}_${currentThread?.user2?.userId}`;

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channel}>
        <ChatBox
          channelName={channel}
          currentThread={currentThread}
          currentUser={currentUser}
        />
      </ChannelProvider>
    </AblyProvider>
  );
}
