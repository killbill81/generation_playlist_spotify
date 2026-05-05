// Spotify PKCE Auth & API interactions

const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
const scope = 'user-library-read playlist-modify-public playlist-modify-private playlist-read-private user-read-private user-read-email';

const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  return window.crypto.subtle.digest('SHA-256', data)
};

const base64encode = (input) => {
  return btoa(String.fromCharCode(...new Uint8Array(input)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

export const loginToSpotify = async () => {
  const codeVerifier = generateRandomString(64);
  window.localStorage.setItem('code_verifier', codeVerifier);

  const hashed = await sha256(codeVerifier);
  const codeChallenge = base64encode(hashed);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  const params = {
    response_type: 'code',
    client_id: clientId,
    scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    redirect_uri: redirectUri,
  };

  authUrl.search = new URLSearchParams(params).toString();
  window.location.href = authUrl.toString();
};

export const getToken = async (code) => {
  let codeVerifier = localStorage.getItem('code_verifier');

  const payload = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  };

  const body = await fetch("https://accounts.spotify.com/api/token", payload);
  const response = await body.json();

  if (response.access_token) {
    localStorage.setItem('access_token', response.access_token);
    return response.access_token;
  }
  return null;
};

export const getAccessToken = () => {
  return localStorage.getItem('access_token');
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('code_verifier');
  window.location.search = "";
};

// API Calls
async function fetchWebApi(endpoint, method = 'GET', body = null) {
  const token = getAccessToken();
  const res = await fetch(`https://api.spotify.com/${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    let errorMsg = res.statusText;
    try {
      const errorBody = await res.json();
      errorMsg += ` - ${JSON.stringify(errorBody)}`;
    } catch (e) {
      const text = await res.text();
      errorMsg += ` - ${text}`;
    }
    throw new Error(`Erreur API: ${errorMsg}`);
  }
  return await res.json();
}

export const getUserProfile = async () => {
  return await fetchWebApi('v1/me');
};

export const getSavedAlbums = async () => {
  let albums = [];
  let nextUrl = 'v1/me/albums?limit=50';
  
  while (nextUrl) {
    const response = await fetchWebApi(nextUrl.replace('https://api.spotify.com/', ''));
    albums = [...albums, ...response.items];
    nextUrl = response.next;
  }
  return albums;
};

export const getTracksFromAlbums = async (albums) => {
  let tracks = [];
  // Albums API gives tracks but they might be paginated. 
  // We'll extract tracks directly from the saved albums objects to save API calls
  for (const item of albums) {
    const album = item.album;
    if (album.tracks && album.tracks.items) {
      // Les tracks dans album.tracks n'ont pas la pochette d'album, on ajoute l'album reference
      const albumTracks = album.tracks.items.map(track => ({
        ...track,
        album: { id: album.id, name: album.name, images: album.images }
      }));
      tracks = [...tracks, ...albumTracks];
    }
  }
  return tracks;
};

export const createOrUpdatePlaylist = async (userId, tracksUris) => {
  // Check if playlist "TITRES DE MES ALBUMS" already exists
  let playlists = [];
  let nextUrl = 'v1/me/playlists?limit=50';
  let targetPlaylist = null;

  while (nextUrl && !targetPlaylist) {
    const response = await fetchWebApi(nextUrl.replace('https://api.spotify.com/', ''));
    playlists = [...playlists, ...response.items];
    targetPlaylist = playlists.find(p => p.name === "TITRES DE MES ALBUMS" && p.owner.id === userId);
    nextUrl = response.next;
  }

  let playlistId;
  if (targetPlaylist) {
    playlistId = targetPlaylist.id;
  } else {
    // Create new playlist
    const newPlaylist = await fetchWebApi(`v1/users/${userId}/playlists`, 'POST', {
      name: "TITRES DE MES ALBUMS",
      description: `Playlist générée le ${new Date().toLocaleString()}`,
      public: false
    });
    playlistId = newPlaylist.id;
  }

  // Use PUT on the new 2026 /items endpoint to REPLACE content
  await fetchWebApi(`v1/playlists/${playlistId}/items`, 'PUT', {
    uris: tracksUris
  });

  return playlistId;
};
