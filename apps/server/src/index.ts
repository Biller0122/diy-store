import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

bootstrap(config)
  .then(() => {
    console.log('✅ Vendure server started');
    console.log(`   Shop API:  http://localhost:${process.env.PORT || 3001}/shop-api`);
    console.log(`   Admin API: http://localhost:${process.env.PORT || 3001}/admin-api`);
    console.log(`   Admin UI:  http://localhost:3002/admin`);
  })
  .catch((err) => {
    console.error('❌ Failed to start Vendure server', err);
    process.exit(1);
  });
