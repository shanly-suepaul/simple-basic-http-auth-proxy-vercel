import axios from 'axios'
const http = require('http')
const httpProxy = require('http-proxy')

let cookie;

// Create a proxy server with custom application logic
const proxy = httpProxy.createProxyServer({changeOrigin: true, autoRewrite: true, hostRewrite: true, followRedirects: true})

// TODO handle invalid cookie
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

  // obtain cookie via Vercel auth flow
  // TODO handle cookie expiration
  if (!cookie) {
    axios.post(origin, `_vercel_password=${password}`)
        .then(response => {
          console.log(response.data)
          console.log(response.headers)
          cookie = response.headers['Set-Cookie'].match(/_vercel_jwt=[a-zA-Z0-9-_.]+;/)[0]

          proxy.web(req, res, { target: `${origin}` })
        })
        .catch(error => {
          // TODO handle invalid password
          console.log(error)
          console.log(error.toJSON())

          res.statusCode = 500
        res.statusMessage = 'Could not authenticate with Vercel';
        res.end()
        })
  } else {
    proxy.web(req, res, { target: `${origin}` })
  }
})

console.log(process.env.AWS_LAMBDA_RUNTIME_API)

const port = process.env.AWS_LAMBDA_RUNTIME_API.split(':')[1]
console.log(`simple-auth-proxy for Vercel started on port ${port}`)
server.listen(port)
