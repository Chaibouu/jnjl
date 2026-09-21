/** @type {import('next').NextConfig} */
const nextConfig = {
    // Optimisations pour Next.js 15
    experimental: {
        // Envois de fichiers via les actions serveur (documents, images de l'éditeur) :
        // 4 Mo maximum, la limite des fonctions Vercel étant de 4,5 Mo.
        serverActions: {
            bodySizeLimit: '4mb',
        },
        // Amélioration des performances
        optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
        // Amélioration du bundling
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },

    // Configuration des images
    images: {
        remotePatterns: [

            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
                pathname: "**"
            },
        ],
        // Amélioration des performances d'image
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // Amélioration de la compression
    compress: true,

    // Configuration des en-têtes de sécurité
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    // Empêche le clickjacking
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    // Empêche le MIME sniffing
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    // Contrôle les infos transmises dans le Referer
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    // Force HTTPS pour 2 ans, incluant sous-domaines (activer en production)
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    // Protection XSS legacy (IE/Edge anciens)
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    // Restreint l'accès aux APIs sensibles du navigateur
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
                    },
                    // Content-Security-Policy définie dynamiquement dans middleware.ts
                    // (avec nonce par requête pour supprimer unsafe-inline des scripts)
                ],
            },
            {
                // Les fichiers générés (engagement, attestations…) peuvent être affichés en aperçu
                // dans une page de ce même site — mais jamais dans un site tiers.
                source: '/uploads/:path*',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                ],
            },
            {
                // Zones privées : jamais indexées, même si un lien externe y pointe
                // (complète robots.txt, qui n'empêche que l'exploration).
                source: '/:zone(admin|ambassadeur|dashboard|profile|auth|unauthorized|blogs|test|api)/:path*',
                headers: [
                    {
                        key: 'X-Robots-Tag',
                        value: 'noindex, nofollow, noarchive',
                    },
                ],
            },
        ];
    },

    // Amélioration du tree-shaking
    webpack: (config, { dev, isServer }) => {
        // Optimisations pour la production
        if (!dev && !isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        chunks: 'all',
                    },
                },
            };
        }

        return config;
    },
};

export default nextConfig;
