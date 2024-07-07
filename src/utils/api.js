const createUrl = (path) => {
  return window.location.origin + path;
};

export const getRankings = async () => {
  try {
    const res = await fetch(createUrl(`/api/rankings`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getRankings:", error);
    throw error;
  }
};

export const getAllMatches = async () => {
  try {
    const res = await fetch(createUrl(`/api/matchDetails`), { method: "GET" });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getAllMatches:", error);
    throw error;
  }
};

export const getPendingMatches = async (userId) => {
  try {
    const res = await fetch(createUrl(`/api/pending/${userId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getPendingMatches:", error);
    throw error;
  }
};

export const getPendingMatchesCount = async (userId) => {
  try {
    const res = await fetch(createUrl(`/api/pending/count/${userId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getPendingMatchesCount:", error);
    throw error;
  }
};

export const getAllUserMatches = async (userId) => {
  try {
    const res = await fetch(createUrl(`/api/matchDetails/${userId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getPendingMatchesCount:", error);
    throw error;
  }
};

export const getH2hMatches = async (user1, user2) => {
  try {
    const res = await fetch(
      createUrl(`/api/matchDetails/h2h?user1=${user1}&user2=${user2}`),
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getH2hMatches:", error);
    throw error;
  }
};

export const getAllThreads = async (userId) => {
  try {
    const res = await fetch(createUrl(`/api/threads/user/${userId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getAllThreads:", error);
    throw error;
  }
};

export const getThreadMessages = async (threadId) => {
  try {
    const res = await fetch(createUrl(`/api/messages/${threadId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getThreadMessages:", error);
    throw error;
  }
};

export const getUnreadMessagesCount = async (userId) => {
  try {
    const res = await fetch(createUrl(`/api/messages/unread/${userId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getThreadMessages:", error);
    throw error;
  }
};

export const getThreadById = async (threadId) => {
  try {
    const res = await fetch(createUrl(`/api/threads/${threadId}`), {
      method: "GET",
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in getThreadById:", error);
    throw error;
  }
};

export const createNewMatch = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/match`), {
      method: "POST",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in createNewMatch:", error);
    throw error;
  }
};

export const createNewMatchDetails = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/matchDetails`), {
      method: "POST",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in createNewMatchDetails:", error);
    throw error;
  }
};

export const createMessageThread = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/threads`), {
      method: "POST",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in createMessageThread:", error);
    throw error;
  }
};

export const createMessage = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/messages`), {
      method: "POST",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in createMessage:", error);
    throw error;
  }
};

export const confirmPendingMatch = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/match/confirm`), {
      method: "PUT",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in confirmPendingMatch:", error);
    throw error;
  }
};

export const viewThread = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/messages/read`), {
      method: "PUT",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in viewThread:", error);
    throw error;
  }
};

export const denyPendingMatch = async (content) => {
  try {
    const res = await fetch(createUrl(`/api/match/deny`), {
      method: "DELETE",
      body: JSON.stringify(content),
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error("Error in denyPendingMatch:", error);
    throw error;
  }
};
