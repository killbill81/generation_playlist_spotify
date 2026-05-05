import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, LogOut, Loader2, Music } from 'lucide-react';
import { 
  loginToSpotify, 
  getToken, 
  getAccessToken, 
  logout,
  getUserProfile,
  getSavedAlbums,
  getTracksFromAlbums,
  createOrUpdatePlaylist
} from './spotifyApi';

function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tracks, setTracks] = useState([]);
  const [playlistId, setPlaylistId] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      let code = urlParams.get('code');
      let storedToken = getAccessToken();

      if (code && !storedToken) {
        setIsLoading(true);
        setStatus('Authentification en cours...');
        const newToken = await getToken(code);
        if (newToken) {
          setToken(newToken);
          window.history.replaceState({}, document.title, "/");
        }
        setIsLoading(false);
      } else if (storedToken) {
        setToken(storedToken);
      }
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const profile = await getUserProfile();
      setUser(profile);
    } catch (err) {
      console.error(err);
      if (err.message.includes('401')) {
        logout();
        setToken(null);
      }
    }
  };

  const generatePlaylist = async () => {
    setIsLoading(true);
    setTracks([]);
    try {
      setStatus('Récupération de vos albums sauvegardés...');
      const albums = await getSavedAlbums();
      
      if (albums.length === 0) {
        setStatus('Aucun album sauvegardé trouvé dans votre bibliothèque.');
        setIsLoading(false);
        return;
      }

      setStatus('Extraction des titres depuis les albums...');
      const allTracks = await getTracksFromAlbums(albums);
      
      if (allTracks.length === 0) {
        setStatus('Aucun titre trouvé dans vos albums.');
        setIsLoading(false);
        return;
      }

      setStatus('Sélection aléatoire de 30 titres...');
      // Filtrer les pistes locales ou invalides qui causent une erreur 403
      const validTracks = allTracks.filter(t => t && t.uri && t.uri.startsWith('spotify:track:') && !t.is_local);
      
      if (validTracks.length === 0) {
        setStatus('Aucun titre valide trouvé dans vos albums.');
        setIsLoading(false);
        return;
      }

      // Shuffle array
      const shuffled = [...validTracks].sort(() => 0.5 - Math.random());
      const selectedTracks = shuffled.slice(0, 30);
      
      setTracks(selectedTracks);
      
      setStatus('Mise à jour de la playlist sur Spotify...');
      const trackUris = selectedTracks.map(t => t.uri);
      const newPlaylistId = await createOrUpdatePlaylist(user.id, trackUris);
      setPlaylistId(newPlaylistId);
      
      setStatus('Génération terminée avec succès !');
    } catch (error) {
      console.error(error);
      setStatus('Une erreur est survenue lors de la génération : ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setToken(null);
    setUser(null);
    setTracks([]);
  };

  if (!token) {
    return (
      <div className="app-container">
        <div className="login-container">
          <Music size={80} color="var(--spotify-green)" style={{ marginBottom: '2rem' }} />
          <h1>Générateur de Playlist</h1>
          <p>Créez une playlist aléatoire de 30 titres à partir de vos albums sauvegardés.</p>
          <button className="btn" onClick={loginToSpotify}>
            <Play fill="currentColor" size={20} />
            Se connecter avec Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="header">
        <h1>TITRES DE MES ALBUMS</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {user && <span style={{ color: 'var(--spotify-grey)' }}>Connecté : {user.display_name}</span>}
          <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '8px 16px' }}>
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard">
        {tracks.length === 0 && !isLoading && (
          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <button className="btn" onClick={generatePlaylist} style={{ fontSize: '1.2rem', padding: '16px 40px' }}>
              <RefreshCw size={24} />
              Générer la Playlist
            </button>
            {status && <p style={{ marginTop: '2rem', color: 'var(--spotify-grey)' }}>{status}</p>}
          </div>
        )}

        {isLoading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p className="status-text">{status}</p>
          </div>
        )}

        {tracks.length > 0 && !isLoading && (
          <>
            <div className="controls">
              <button className="btn" onClick={generatePlaylist}>
                <RefreshCw size={20} />
                Regénérer avec de nouveaux titres
              </button>
            </div>
            
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ color: 'var(--spotify-green)', fontWeight: 'bold' }}>{status}</p>
              {playlistId && (
                <a 
                  href={`https://open.spotify.com/playlist/${playlistId}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--spotify-white)', textDecoration: 'underline' }}
                >
                  Ouvrir dans Spotify
                </a>
              )}
            </div>

            <div className="track-grid">
              {tracks.map((track, index) => (
                <div key={index} className="track-card">
                  <img 
                    src={track.album.images?.[0]?.url || 'https://via.placeholder.com/300?text=No+Cover'} 
                    alt={track.album.name} 
                    className="track-image"
                  />
                  <div className="track-info">
                    <span className="track-name" title={track.name}>{track.name}</span>
                    <span className="track-artist" title={track.artists.map(a => a.name).join(', ')}>
                      {track.artists.map(a => a.name).join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
