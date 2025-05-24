
import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

const pwaConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: isDev, // Disable PWA in development for easier debugging, enable for prod
  // dynamicStartUrl: false, // default is true
};

const withPWA = withPWAInit(pwaConfig);

const nextConfig: NextConfig = {
  i18n: null, // Explicitly set i18n to null
  /* config options here */
  typescript: {
    // ignoreBuildErrors: true, // Removed
  },
  eslint: {
    // ignoreDuringBuilds: true, // Removed
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
      // { // Removed as Firebase Storage is not used for profile pictures with Base64 approach
      //   protocol: 'https',
      //   hostname: 'firebasestorage.googleapis.com',
      //   port: '',
      //   pathname: '/**',
      // }
    ],
  },
};

// @ts-expect-error TODO: Investigate type incompatibility between next-pwa (v5.6.0) and Next.js 15 for i18n config.
// The error relates to a mismatch in the 'domains' property within the i18n config type:
// "The type 'I18NDomains' is 'readonly' and cannot be assigned to the mutable type 'DomainLocale[]'."
export default withPWA(nextConfig);
