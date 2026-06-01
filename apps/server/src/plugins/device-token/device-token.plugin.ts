import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { DeviceToken } from './device-token.entity';

@VendurePlugin({
  imports: [PluginCommonModule],
  entities: [DeviceToken],
})
export class DeviceTokenPlugin {}
