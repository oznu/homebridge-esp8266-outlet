#include <ArduinoJson.h>              // v5.13.2 - https://github.com/bblanchon/ArduinoJson
#include <WebSocketsServer.h>         // v2.2.0 - https://github.com/Links2004/arduinoWebSockets
#include <Bounce2.h>                  // v2.53 - https://github.com/thomasfredericks/Bounce2

#include "Outlet.h"

Outlet::Outlet() {

}

void Outlet::begin() {
  // set the contact relay to output
  pinMode(CONTACT_RELAY, OUTPUT);
  digitalWrite(CONTACT_RELAY, OFF_STATE);

  // attach the power button
  powerButton.attach(POWER_BUTTON, INPUT);
  powerButton.interval(10);

  webSocket.setAuthorization(AUTH_USERNAME, AUTH_PASSWORD);
  webSocket.onEvent(std::bind(&Outlet::webSocketEvent, this, std::placeholders::_1, std::placeholders::_2, std::placeholders::_3, std::placeholders::_4));
  webSocket.begin();
}

void Outlet::loop () {
  webSocket.loop();

  powerButton.update();

  if ( powerButton.pressed() ) {
    this->on = !this->on;
    this->setRelay(this->on);
    this->broadcastSystemStatus();
  }
}

void Outlet::webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\r\n", num);
      break;
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
      // broadcast current settings
      this->broadcastSystemStatus();
      break;
    }
    case WStype_TEXT: {
      // send the payload to the ac handler
      this->processIncomingRequest((char *)&payload[0]);
      break;
    }
    case WStype_PING:
      // Serial.printf("[%u] Got Ping!\r\n", num);
      break;
    case WStype_PONG:
      // Serial.printf("[%u] Got Pong!\r\n", num);
      break;
    default:
      Serial.printf("Invalid WStype [%d]\r\n", type);
      break;
  }
}

void Outlet::processIncomingRequest(String payload) {
  DynamicJsonDocument doc(512);
  deserializeJson(doc, payload);
  JsonObject req = doc.as<JsonObject>();

  if ( req.containsKey("On") ) {
    this->on = req["On"];
    this->broadcastSystemStatus();
    this->setRelay(this->on);
  }
}

void Outlet::setRelay(bool on) {
  Serial.print("Triggering Contact Relay - ");
  Serial.println(on);

  if (on) {
    digitalWrite(CONTACT_RELAY, ON_STATE);
  } else {
    digitalWrite(CONTACT_RELAY, OFF_STATE);
  }
}

// broadcasts the status for everything
void Outlet::broadcastSystemStatus() {
  DynamicJsonDocument doc(512);
  JsonObject res = doc.to<JsonObject>();

  res["On"] = this->on;

  String payload;
  serializeJson(doc, payload);
  webSocket.broadcastTXT(payload);
}
