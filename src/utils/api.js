const createUrl = (path) => {
  return window.location.origin + path;
};

export const getRankings = async () => {
  const res = await fetch(createUrl(`/api/users/rankings`), {
    method: "GET",
  });
  if (res.ok) {
    const data = await res.json();
    return data.data;
  }
};

export const createNewMatch = async (content) => {
  const res = await fetch(
    new Request(createUrl(`/api/match`), {
      method: "POST",
      body: JSON.stringify(content),
    })
  );
  if (res.ok) {
    const data = await res.json();
    return data.data;
  }
};

export const createNewMatchDetails = async (content) => {
  const res = await fetch(
    new Request(createUrl(`/api/matchDetails`), {
      method: "POST",
      body: JSON.stringify(content),
    })
  );
  if (res.ok) {
    const data = await res.json();
    return data.data;
  }
};

export const getAllMatches = async () => {
  const res = await fetch(
    new Request(createUrl(`/api/matchDetails`), {
      method: "GET",
    })
  );

  if (res.ok) {
    const data = await res.json();
    return data.data;
  }
};

export const getH2hMatches = async (user1, user2) => {
  const res = await fetch(
    new Request(
      createUrl(`/api/matchDetails/h2h?user1=${user1}&user2=${user2}`),
      {
        method: "GET",
      }
    )
  );

  if (res.ok) {
    const data = await res.json();
    return data.data;
  }
};
