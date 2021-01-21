import fetch from 'node-fetch'
const http = require('http')
const httpProxy = require('http-proxy')

let cookie;

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true})

proxy.on('proxyReq', function(proxyReq, req, res, options) {
  proxyReq.setHeader('Cookie', cookie);
});
proxy.on('proxyRes', function(proxyRes, req, res) {
  proxyRes.headers['x-proxy'] = 'simple-auth-proxy-vercel'
})


const server = http.createServer(function(req, res) {

  // load from ENVs
  const origin = process.env.ORIGIN
  const password = process.env.PASSWORD

  const target = origin + req.url.split('/api/proxy')[1]

  // obtain cookie via Vercel auth flow
  // we don't handle cookie expiration because this runs as a lambda
  if (!cookie) {
    fetch(origin, {
      'headers': {
          'accept': '*/*',
          'content-type': 'application/x-www-form-urlencoded'
      },
      'body': `_vercel_password=${password}`,
      'method': 'POST',
      'mode': 'cors',
      'redirect': 'manual',
    }).then(vercelResponse => {
      cookie = vercelResponse.status === 303
        ? vercelResponse.headers.get('set-cookie').match(/_vercel_jwt=[a-zA-Z0-9-_.]+;/)[0]
        : null

      proxy.web(req, res, { ignorePath: true, target })
    })
  } else {
    proxy.web(req, res, { ignorePath: true, target })
  }
})

console.log(process.env.AWS_LAMBDA_RUNTIME_API)

const port = process.env.AWS_LAMBDA_RUNTIME_API.split(':')[1]
console.log(`simple-auth-proxy for Vercel started on port ${port}`)
server.listen(port)
