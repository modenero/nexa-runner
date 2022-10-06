const withMarkdoc = require('@markdoc/next.js')

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    pageExtensions: ['js', 'jsx', 'md'],
    experimental: {
        newNextLinkBehavior: true,
        scrollRestoration: true,
        images: {
            allowFutureImage: true,
            unoptimized: true,
        },
    },
    output: 'standalone',
}

module.exports = withMarkdoc()(nextConfig)
