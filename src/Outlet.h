#ifndef Outlet_h
#define Outlet_h

#include <EEPROM.h>
#include <ArduinoJson.h>              // v5.13.2 - https://github.com/bblanchon/ArduinoJson
#include <WebSocketsServer.h>         // v2.2.0 - https://github.com/Links2004/arduinoWebSockets
#include <Bounce2.h>                  // v2.53 - https://github.com/thomasfredericks/Bounce2

#include "settings.h"
#include "auth.h"

class Outlet {
  public:
    WebSocketsServer webSocket = WebSocketsServer(81);

    Button powerButton = Button();

    Outlet(void);

    bool on = false;

    void begin();
    void loop ();
    void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length);
    bool validateHttpHeader(String headerName, String headerValue);

    void processIncomingRequest(String payload);
    void setRelay(bool on);
    void broadcastSystemStatus();
};

#endif