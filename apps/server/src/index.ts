import 'dotenv/config';
import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';
import { startRealtimeServer } from './plugins/realtime.plugin';

bootstrap(config)
  .then(() => {
    startRealtimeServer();
    console.log('✅ Vendure server started');
    console.log(`   Shop API:  http://localhost:${process.env.PORT || 3001}/shop-api`);
    console.log(`   Admin API: http://localhost:${process.env.PORT || 3001}/admin-api`);
    console.log(`   Socket:    http://localhost:${process.env.SOCKET_PORT || 3002}`);
  })
  .catch((err) => {
    console.error('❌ Failed to start Vendure server', err);
    process.exit(1);
  });
