const proxy = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/auth',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/companies',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/users',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/tickets',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/contacts',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/whatsapp',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/messages',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/settings',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/queues',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/quickAnswers',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/tags',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/schedules',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/campaigns',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/contactLists',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/announcements',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/helps',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/chats',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/plans',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/invoices',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/subscription',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/dashboard',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/flows',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/api-integrations',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
  
  app.use(
    '/socket.io',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
      ws: true,
    })
  );
  
  app.use(
    '/public',
    proxy({
      target: 'http://localhost:8080',
      changeOrigin: true,
    })
  );
};
