/* ========== SERVICE WORKER - GESTION CACHE OFFLINE ET PWA ==========
   📌 RÔLE: Permettre l'app de fonctionner HORS LIGNE + Installation PWA
   💡 UTILITÉ: 
      - Cache les fichiers au 1er chargement
      - Synchronisation offline-first
      - Gestion des mises à jour
      - Support installation desktop + mobile
   ✅ VERSION: V27 - Compatible téléphone + ordinateur
   📱 APPLICATION: quiz-audio-premier (صوت الحق1)
========== */

/**
 * 📌 NOM DU CACHE - CACHE NAME
 * 💡 À MODIFIER: Augmentez le numéro (v1→v2, etc) pour forcer mise à jour
 * ⚠️ IMPORTANT: Tous les anciens caches seront supprimés automatiquement
 */
const CACHE_NAME = 'quiz-coran-v27';

/**
 * 📌 LISTE DES FICHIERS À METTRE EN CACHE - FILES TO CACHE
 * 💡 NOTE: Les icônes et screenshots sont inclus pour installation desktop
 *          Les librairies externes (CDN) sont en network-first
 */
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    './sw.js',
    './images/icon-192.png',
    './images/icon-512.png',
    './images/screenshot-1.png',
    './images/screenshot-2.png'
];

/* ========== ÉVÉNEMENT INSTALL - INSTALLATION EVENT ==========
   Déclenché lors de l'installation du Service Worker
   - Crée le cache
   - Pré-cache les fichiers essentiels
   - Active immédiatement le Worker
========== */
self.addEventListener('install', event => {
    console.log('✅ Service Worker en cours d\'installation (V27)');
    console.log('📦 Version du cache:', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('📦 Cache créé avec succès:', CACHE_NAME);
            
            /* 🎯 Cache les fichiers essentiels + icônes (desktop) */
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('⚠️ Certains fichiers non trouvés lors du cache initial');
                console.warn('   Raison:', err.message);
                console.log('✅ Continuant quand même - mode dégradé autorisé');
                return Promise.resolve();
            });
        })
    );
    
    /* Activation immédiate du Service Worker */
    self.skipWaiting();
});

/* ========== ÉVÉNEMENT FETCH - REQUEST INTERCEPTION ==========
   Intercepte toutes les requêtes réseau
   - Network-first: pour les requêtes dynamiques (API, CDN)
   - Cache-first: pour les fichiers statiques locaux
   - Offline-fallback: répond même hors ligne
========== */
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    /* 🎯 Ignorer les protocoles non-HTTP (ex: chrome-extension://) */
    if (!url.protocol.startsWith('http')) return;

    /* 📌 STRATÉGIE: Cache-First (Static) + Network-First (Dynamic) + Offline Fallback */
    event.respondWith(
        /* Essayer le cache d'abord (pour performances) */
        caches.match(request)
            .then(response => {
                if (response) {
                    console.log('✅ Réponse trouvée en cache:', url.pathname);
                    return response;
                }
                
                /* Cache miss - essayer le réseau */
                return fetch(request)
                    .then(response => {
                        /* ✅ Si réponse réussie: sauvegarder en cache */
                        if (response && response.status === 200 && request.method === 'GET') {
                            const responseToCache = response.clone();
                            
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, responseToCache);
                                console.log('💾 Mis en cache:', url.pathname);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        /* ❌ Réseau échoué ET pas en cache */
                        console.error('❌ Non en cache et réseau indisponible:', url.pathname);
                        
                        /* Retourner une page de secours ou erreur */
                        return caches.match('./index.html').then(response => {
                            return response || new Response(
                                'Désolé - Fichier non disponible hors ligne',
                                {
                                    status: 503,
                                    statusText: 'Service Unavailable',
                                    headers: { 'Content-Type': 'text/plain' }
                                }
                            );
                        });
                    });
            })
    );
});

/* ========== ÉVÉNEMENT ACTIVATE - CLEANUP AND CLAIMS ==========
   Déclenché lors de l'activation du Service Worker
   - Supprime les anciens caches (pour mise à jour propre)
   - Prend contrôle des clients existants
   - Ferme ancienne version
========== */
self.addEventListener('activate', event => {
    console.log('🔄 Service Worker en cours d\'activation (V27)');
    console.log('🧹 Nettoyage des anciens caches...');
    
    event.waitUntil(
        /* 📌 Récupérer tous les noms de cache existants */
        caches.keys().then(cacheNames => {
            console.log('📋 Caches existants:', cacheNames);
            
            return Promise.all(
                cacheNames.map(cacheName => {
                    /* ❌ Supprimer les anciens caches (pas V27) */
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️  Suppression ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    
                    /* ✅ Garder le cache V27 actuel */
                    console.log('✅ Cache actuel conservé:', cacheName);
                })
            );
        })
    );
    
    /* 📌 Prendre contrôle de tous les clients (pages ouvertes) */
    self.clients.claim().then(() => {
        console.log('🎯 Service Worker prend contrôle des clients');
    });
});

/* ========== ÉVÉNEMENT MESSAGE - COMMUNICATION CLIENT-WORKER ==========
   Permet au JavaScript de communiquer avec le Service Worker
   (Optionnel: pour des mises à jour manuelles)
========== */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('📢 Message reçu du client: SKIP_WAITING');
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_INFO') {
        console.log('📊 Info cache demandée par le client');
        event.ports[0].postMessage({
            cacheName: CACHE_NAME,
            version: 'V27',
            app: 'quiz-audio-premier'
        });
    }
});