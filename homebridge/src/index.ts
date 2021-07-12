import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { HomebridgeEsp8266OutletPlatform } from './platform'; 

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HomebridgeEsp8266OutletPlatform);
};
