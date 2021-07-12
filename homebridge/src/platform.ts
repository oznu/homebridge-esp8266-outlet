import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import Bonjour from 'bonjour';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HomebridgeEsp8266OutletAccessory } from './platformAccessory';

interface HomebridgeEsp8266OutletConfig extends PlatformConfig {
  username?: string;
  password?: string;
  contactTime?: number;
}

export class HomebridgeEsp8266OutletPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: HomebridgeEsp8266OutletConfig,
    public readonly api: API,
  ) {
    if (!config.username || !config.password) {
      this.log.error('Username and password must be defined.');
      return;
    }

    this.api.on('didFinishLaunching', () => {
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const bonjour = Bonjour();
    const browser = bonjour.find({ type: 'oznu-platform' });

    browser.on('up', this.foundAccessory.bind(this));

    // Check bonjour again 5 seconds after launch
    setTimeout(() => {
      browser.update();
    }, 5000);

    // Check bonjour every 60 seconds
    setInterval(() => {
      browser.update();
    }, 60000);
  }

  foundAccessory(service) {
    if (service.txt.type && service.txt.type === 'outlet') {
      const UUID = this.api.hap.uuid.generate(service.txt.mac);
      const host = service.host;
      const accessoryConfig = { host, port: service.port, name: service.name, serial: service.txt.mac };

      // check if it already exists
      const existingAccessory = this.accessories.find(x => x.UUID === UUID);

      if (existingAccessory) {
        // Existing Accessory
        this.log.info(`Found existing outlet at ${service.host}:${service.port} [${service.txt.mac}]`);
        new HomebridgeEsp8266OutletAccessory(this, existingAccessory, accessoryConfig);
      } else {
        // New Accessory
        this.log.info(`Found new outlet door at ${service.host}:${service.port} [${service.txt.mac}]`);
        const accessory = new this.api.platformAccessory(accessoryConfig.name, UUID);
        new HomebridgeEsp8266OutletAccessory(this, accessory, accessoryConfig);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
