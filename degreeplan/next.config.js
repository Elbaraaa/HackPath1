/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  serverExternalPackages: ['sql.js', 'pdf-parse'],
};
module.exports = nextConfig;
