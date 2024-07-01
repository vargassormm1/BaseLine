"use client";
import * as Ably from "ably";
import { AblyProvider, ChannelProvider } from "ably/react";
import MessageHistory from "../MessageHistory/MessageHistory";

export default function History({
  currentUser,
  currentThread,
  setCurrentThread,
  threads,
  setThreads,
}) {
  const client = new Ably.Realtime({ authUrl: "/api" });

  const channel = `messages_${currentUser?.userId}`;

  return (
    <AblyProvider client={client}>
      <ChannelProvider channelName={channel}>
        <MessageHistory
          currentUser={currentUser}
          currentThread={currentThread}
          setCurrentThread={setCurrentThread}
          threads={threads}
          setThreads={setThreads}
        />
      </ChannelProvider>
    </AblyProvider>
  );
}
