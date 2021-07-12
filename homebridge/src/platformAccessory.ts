import { Service, PlatformAccessory, CharacteristicValue, CharacteristicSetCallback } from 'homebridge';
import { WebSocket } from '@oznu/ws-connect';
import { resolve4 } from 'mdns-resolver';

import { HomebridgeEsp8266OutletPlatform } from './platform';

interface StatusPayload {
  On: boolean;
}

export class HomebridgeEsp8266OutletAccessory {
  private service: Service;
  private socket: WebSocket;

  constructor(
    private readonly platform: HomebridgeEsp8266OutletPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly config: { host: string; port: number; name: string; serial: string },
  ) {

    this.socket = new WebSocket('', {
      options: {
        handshakeTimeout: 10000,
      },
      beforeConnect: async () => {
        try {
          const hostIp = await resolve4(this.config.host);
          const socketAddress = `ws://${this.platform.config.username}:${this.platform.config.password}@${hostIp}:${this.config.port}`;
          this.socket.setAddresss(socketAddress);
        } catch (e) {
          this.platform.log.warn(e.message);
        }
      },
    });

    this.socket.on('websocket-status', (msg) => {
      this.platform.log.info(msg);
    });

    this.socket.on('json', this.parseStatus.bind(this));

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Name, 'Outlet')
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'oznu-platform')
      .setCharacteristic(this.platform.Characteristic.Model, 'outlet')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config.serial);

    // create service
    this.service = this.accessory.getService(this.platform.Service.Outlet) || this.accessory.addService(this.platform.Service.Outlet);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOnState.bind(this));
  }

  // parse events from the outlet controller
  parseStatus(payload: StatusPayload) {
    this.platform.log.debug(JSON.stringify(payload));

    // update the current state
    if (payload.On !== undefined) {
      this.service.updateCharacteristic(this.platform.Characteristic.On, payload.On);
    }
  }

  setOnState(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    if (!this.socket.isConnected()) {
      this.platform.log.error(`Outlet Not Connected - ${this.config.host}`);
      return callback(new Error('Outlet Not Connected'));
    }

    callback();

    this.platform.log.info(`Sending "${value}" to Outlet.`);

    this.socket.sendJson({
      On: value,
    });
  }

}
