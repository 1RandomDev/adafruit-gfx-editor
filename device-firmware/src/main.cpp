#include <Arduino.h>
#include <EEPROM.h>
#include <ArduinoOTA.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSans12pt7b.h>
#include <Fonts/FreeSans18pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include "bitmaps.h"
#include "config.h"

// GPIO 15 is shorted to ground, do not use!
#define TFT_CS_PIN -1
#define TFT_RST_PIN 2
#define TFT_DC_PIN 0
#define TFT_BACKLIGHT_PIN 5
#define BUTTON_PIN 4

#define TFT_WIDTH  240
#define TFT_HEIGHT 240
#define EEPROM_TFT_BRIGHTNESS 0

struct Bitmap {
    int16_t x;
    int16_t y;
    int16_t width;
    int16_t height;
    uint16_t color;
    bool monochrome;
    int16_t bytesPerRow;
};
struct FontEntry {
    const char* name;
    const GFXfont* font;
};
const FontEntry fontTable[] = {
    { "FreeSans9pt7b",       &FreeSans9pt7b },
    { "FreeSans12pt7b",      &FreeSans12pt7b },
    { "FreeSans18pt7b",      &FreeSans18pt7b },
    { "FreeSansBold9pt7b",   &FreeSansBold9pt7b },
    { "FreeSansBold12pt7b",  &FreeSansBold12pt7b },
    { "FreeSansBold18pt7b",  &FreeSansBold18pt7b }
};

bool wifiConnected = false, mqttConnected = false;
bool usingDefaultFont = false, freezeDisplay = false;
int tftBrightness = 0;
unsigned int prevUpdateProgress = 0;
unsigned long resetTimer = 0;
unsigned long lastMqttConnect = 0;
Bitmap currentBitmap = {-1};

Adafruit_ST7789 tft = Adafruit_ST7789(TFT_CS_PIN, TFT_DC_PIN, TFT_RST_PIN);
WiFiClient espClient;
PubSubClient mqtt(espClient);

void sendState();
void mqttCallback(char* topic, byte* payload, unsigned int length);
void processDrawCommands(JsonArray &commands);
const GFXfont* getFrontByName(const char* name);
void fillCircleHelper(int16_t x0, int16_t y0, int16_t r, uint8_t corners, uint16_t color);
void printCenteredText(const char* text, int16_t x, int16_t y, int16_t wc, int16_t hc);
void printHeading(const char* text);
void screenConnectWiFi();
void otaStartCallback();
void otaProgressCallback(float writtenBytes, float totalBytes);
void otaErrorCallback(ota_error_t error);
int checkBounds(int value, int min, int max);

void setup() {
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    pinMode(TFT_BACKLIGHT_PIN, OUTPUT);
    digitalWrite(TFT_BACKLIGHT_PIN, 255);
    
    EEPROM.begin(16);
    tftBrightness = EEPROM.read(EEPROM_TFT_BRIGHTNESS);

    tft.init(TFT_WIDTH, TFT_HEIGHT, SPI_MODE3);
    tft.fillScreen(ST77XX_BLACK);
    tft.setRotation(2);
    tft.setTextWrap(false);
    screenConnectWiFi();
    analogWrite(TFT_BACKLIGHT_PIN, 255 - tftBrightness);

    WiFi.persistent(true);
    WiFi.mode(WIFI_STA);
    WiFi.hostname(DEV_NAME);
    WiFi.setAutoReconnect(true);
    if(!digitalRead(BUTTON_PIN) || WiFi.SSID().isEmpty()) {
        printHeading("WPS autoconfig");
        tft.setFont(&FreeSans9pt7b);
        printCenteredText("Press the WPS button on", 0, 200, TFT_WIDTH, 0);
        printCenteredText("your router to connect.", 0, 220, TFT_WIDTH, 0);

        bool success = WiFi.beginWPSConfig();
        tft.fillRect(0, 180, TFT_WIDTH, 50, 0x000);
        if(success && WiFi.waitForConnectResult(30000) == WL_CONNECTED) {
            tft.setTextColor(0x2dc0);
            printCenteredText("Setup sucessfull", 0, 200, TFT_WIDTH, 0);
            delay(1000);
        } else {
            tft.setTextColor(0xc000);
            printCenteredText("Setup failed", 0, 200, TFT_WIDTH, 0);
        }
        tft.setTextColor(0xfff);
    } else {
        WiFi.begin();
    }

    ArduinoOTA.setHostname(DEV_NAME);
    ArduinoOTA.setPassword(OTA_PASSWORD);
    ArduinoOTA.onStart(otaStartCallback);
    ArduinoOTA.onProgress(otaProgressCallback);
    ArduinoOTA.onError(otaErrorCallback);
    ArduinoOTA.begin();

    mqtt.setServer(MQTT_BROKER, MQTT_PORT);
    mqtt.setCallback(mqttCallback);
    mqtt.setBufferSize(2048);
}

void loop() {
    if(WiFi.status() == WL_CONNECTED) {
        if(!wifiConnected) {
            wifiConnected = true;
            tft.setFont(&FreeSans9pt7b);
            tft.fillRect(0, 180, TFT_WIDTH, 30, 0x000);
            printCenteredText(WiFi.localIP().toString().c_str(), 0, 200, TFT_WIDTH, 0);
            printHeading("Connecting MQTT");
        }
        ArduinoOTA.handle();
        if(!mqtt.connected()) {
            if(millis() - lastMqttConnect >= 10000) {
                lastMqttConnect = millis();
                if(mqtt.connect(DEV_NAME, MQTT_USER, MQTT_PASSWORD, MQTT_TOPIC "/available", 0, true, "offline")) {
                    mqtt.subscribe(MQTT_TOPIC "/control");
                    mqtt.subscribe(MQTT_TOPIC "/draw");
                    mqtt.subscribe(MQTT_TOPIC "/upload");
                    mqtt.publish(MQTT_TOPIC "/available", "online", true);
                    if(!mqttConnected) {
                        mqttConnected = true;
                        printHeading("Waiting for Data");
                    }
                }
            }
        }
        mqtt.loop();
    }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    if(length == 0) return;
    if(strcmp(topic, MQTT_TOPIC "/upload") == 0) {
        if(currentBitmap.x == -1) return;
        int16_t chunkHeight = length / currentBitmap.bytesPerRow;
        if(chunkHeight == 0) return;

        tft.startWrite();
        if(currentBitmap.monochrome) {
            int16_t byteWidth = (currentBitmap.width + 7) / 8;
            uint8_t b = 0;
            for(int16_t j = 0; j < chunkHeight; j++, currentBitmap.y++) {
                int16_t byteOffset = j*byteWidth;
                for(int16_t i = 0; i < currentBitmap.width; i++) {
                    if(i & 7)
                        b <<= 1;
                    else
                        b = payload[byteOffset + i/8];
                    if(b & 0x80)
                        tft.writePixel(currentBitmap.x+i, currentBitmap.y, currentBitmap.color);
                }
            }
        } else {
            for(int16_t j = 0; j < chunkHeight; j++, currentBitmap.y++) {
                int16_t byteOffset = j*currentBitmap.width;
                for(int16_t i = 0; i < currentBitmap.width; i++) {
                    int16_t currentByte = (byteOffset+i) * 2;
                    uint16_t color = (payload[currentByte] << 8) | payload[currentByte+1];
                    tft.writePixel(currentBitmap.x+i, currentBitmap.y, color);
                }
            }
        }
        tft.endWrite();
    } else if(strcmp(topic, MQTT_TOPIC "/draw") == 0) {
        JsonDocument request;
        deserializeJson(request, payload, length);
        JsonArray commands = request.as<JsonArray>();
        processDrawCommands(commands);
    } else if(strcmp(topic, MQTT_TOPIC "/control") == 0) {
        JsonDocument request;
        deserializeJson(request, payload, length);

        if(request["brightness"].is<int>()) {
            tftBrightness = checkBounds(request["brightness"], 1, 255);
            analogWrite(TFT_BACKLIGHT_PIN, 255 - tftBrightness);
            EEPROM.write(EEPROM_TFT_BRIGHTNESS, tftBrightness);
            EEPROM.commit();
            sendState();
        }

        if(request["restart"].is<JsonVariant>()) {
            ESP.restart();
        }
    }
}

void processDrawCommands(JsonArray &commands) {
    for(JsonVariant cmd : commands) {
        if(!cmd["t"].is<const char*>()) continue;
        const char* type = cmd["t"];

        // fill
        if(strcmp(type, "fill") == 0) {
            tft.fillScreen(cmd["c"]);
        } else

        // rect
        if(strcmp(type, "rect") == 0) {
            int16_t x = cmd["x"], y = cmd["y"], w = cmd["w"], h = cmd["h"], r = cmd["r"];
            uint16_t c = cmd["c"];
            if(cmd["f"].as<bool>()) {
                if(r > 0) {
                    tft.fillRoundRect(x, y, w, h, r, c);
                } else {
                    tft.fillRect(x, y, w, h, c);
                }
            } else {
                if(r > 0) {
                    tft.drawRoundRect(x, y, w, h, r, c);
                } else {
                    tft.drawRect(x, y, w, h, c);
                }
            }
        }  else

        // circle
        if(strcmp(type, "circle") == 0) {
            int16_t x = cmd["x"], y = cmd["y"], r = cmd["r"];
            uint16_t c = cmd["c"];
            uint8_t co = cmd["co"];
            if(cmd["f"].as<bool>()) {
                if(co > 0 && co < 0b1111) {
                    fillCircleHelper(x, y, r, co, c);
                } else {
                    tft.fillCircle(x, y, r, c);
                }
            } else {
                if(co > 0 && co < 0b1111) {
                    tft.drawCircleHelper(x, y, r, co, c);
                } else {
                    tft.drawCircle(x, y, r, c);
                }
            }
        } else

        // triangle
        if(strcmp(type, "triangle") == 0) {
            int16_t x0 = cmd["x0"], y0 = cmd["y0"], x1 = cmd["x1"], y1 = cmd["y1"], x2 = cmd["x2"], y2 = cmd["y2"];
            uint16_t c = cmd["c"];
            if(cmd["f"].as<bool>()) {
                tft.fillTriangle(x0, y0, x1, y1, x2, y2, c);
            } else {
                tft.drawTriangle(x0, y0, x1, y1, x2, y2, c);
            }
        } else

        // line
        if(strcmp(type, "line") == 0) {
            tft.drawLine(cmd["x0"], cmd["y0"], cmd["x1"], cmd["y1"], cmd["c"]);
        } else

        //text
        if(strcmp(type, "text") == 0) {
            const char *content = cmd["co"].as<const char*>();
            if(cmd["f"].is<const char*>()) tft.setFont(getFrontByName(cmd["f"]));
            if(cmd["c"].is<uint16_t>()) tft.setTextColor(cmd["c"]);
            if(cmd["s"].is<uint8_t>()) tft.setTextSize(cmd["s"]);
            if(cmd["x"].is<int16_t>() && cmd["y"].is<int16_t>()) {
                int16_t x = cmd["x"], y = cmd["y"];
                bool centerX = cmd["wc"].is<int16_t>(), centerY = cmd["hc"].is<int16_t>();
                if(centerX || centerY) {
                    // Auto center in container (x, y)
                    int16_t  x1, y1;
                    uint16_t w, h;
                    tft.getTextBounds(content, x, y, &x1, &y1, &w, &h);
                    if(centerX) x += (cmd["wc"].as<int16_t>() - w)/2;
                    if(centerY) {
                        if(usingDefaultFont) {
                            y += (cmd["hc"].as<int16_t>() - h)/2;
                        } else {
                            y -= (cmd["hc"].as<int16_t>() - h)/2;
                        }
                    }
                }
                tft.setCursor(x, y);
            }
            tft.print(content);
        } else

        // bitmap
        if(strcmp(type, "bitmap") == 0) {
            int16_t x = cmd["x"], y = cmd["y"], w = cmd["w"], h = cmd["h"];
            bool monochrome = cmd["c"].is<uint16_t>();
            int16_t bytesPerRow = monochrome ? ceil((double)w / 8) : w*2;
            if(bytesPerRow == 0) return;
            currentBitmap = {x, y, w, h, cmd["c"], monochrome, bytesPerRow};
        }
    }
}

const GFXfont* getFrontByName(const char* name) {
    for(size_t i=0; i < sizeof(fontTable)/sizeof(fontTable[0]); ++i) {
        if(strcmp(name, fontTable[i].name) == 0) {
            usingDefaultFont = false;
            return fontTable[i].font;
        }
    }
    usingDefaultFont = true;
    return NULL;
}

void fillCircleHelper(int16_t x0, int16_t y0, int16_t r, uint8_t corners, uint16_t color) {
    int16_t f = 1 - r;
    int16_t ddF_x = 1;
    int16_t ddF_y = -2 * r;
    int16_t x = 0;
    int16_t y = r;

    while(x <= y) {
        if(corners & 0b0001) { // top-left
            tft.drawFastHLine(x0 - y, y0 - x, y + 1, color);
            tft.drawFastHLine(x0 - x, y0 - y, x + 1, color);
        }
        if(corners & 0b0010) { // top-right
            tft.drawFastHLine(x0, y0 - x, y + 1, color);
            tft.drawFastHLine(x0, y0 - y, x + 1, color);
        }
        if(corners & 0b0100) { // bottom-right
            tft.drawFastHLine(x0, y0 + x, y + 1, color);
            tft.drawFastHLine(x0, y0 + y, x + 1, color);
        }
        if(corners & 0b1000) { // bottom-left
            tft.drawFastHLine(x0 - y, y0 + x, y + 1, color);
            tft.drawFastHLine(x0 - x, y0 + y, x + 1, color);
        }

        if(f >= 0) {
            y--;
            ddF_y += 2;
            f += ddF_y;
        }

        x++;
        ddF_x += 2;
        f += ddF_x;
    }
}

void sendState() {
    JsonDocument data;
    data["brightness"] = tftBrightness;
    byte buffer[128];
    size_t length = serializeJson(data, buffer);
    mqtt.publish(MQTT_TOPIC "/state", buffer, length, true);
}

void printCenteredText(const char* text, int16_t x, int16_t y, int16_t wc, int16_t hc) {
    int16_t  x1, y1;
    uint16_t w, h;
    tft.getTextBounds(text, x, y, &x1, &y1, &w, &h);
    if(wc) x += wc/2.0 - w/2.0 - 2.0;
    if(hc) y -= hc/2.0 - h/2.0 + 2.0;
    tft.setCursor(x, y);
    tft.print(text);
}

void printHeading(const char* text) {
    // Print text centered in box at the top of the screen
    tft.setTextColor(0xffff);
    tft.fillRect(0, 0, TFT_WIDTH, 50, 0xfca0);
    tft.setFont(&FreeSansBold12pt7b);
    printCenteredText(text, 0, 49, TFT_WIDTH, 50);
}

void screenConnectWiFi() {
    tft.setTextColor(0xffff);
    tft.setTextSize(1);
    tft.setFont(&FreeSansBold12pt7b);
    tft.fillRect(0, 0, TFT_WIDTH, 50, 0xfca0);
    printCenteredText("Connecting WiFi", 0, 49, TFT_WIDTH, 50);
    tft.fillRect(0, 50, TFT_WIDTH, TFT_HEIGHT-50, 0x0000);
    tft.drawBitmap(70, 80, tft_bitmap_wifi, 98, 80, 0xffff);
}

void otaStartCallback() {
    tft.setTextColor(0xffff);
    tft.setTextSize(1);
    tft.setFont(&FreeSansBold12pt7b);
    tft.fillRect(0, 0, TFT_WIDTH, 50, 0xfca0);
    printCenteredText("OTA Update", 0, 49, TFT_WIDTH, 50);
    tft.fillRect(0, 50, TFT_WIDTH, TFT_HEIGHT-50, 0x0000);
    tft.drawRoundRect(45, 120, 150, 20, 10, 0xffff);
    tft.setFont(&FreeSans12pt7b);
}
void otaProgressCallback(float writtenBytes, float totalBytes) {
    unsigned int progress = (writtenBytes / totalBytes) * 100;
    if(progress != prevUpdateProgress) {
        prevUpdateProgress = progress;
        tft.fillRect(92, 154, 58, 17, 0x0000);
        if(progress < 100) {
            char progressMsg[4];
            sprintf(progressMsg, "%d%%", progress);
            printCenteredText(progressMsg, 0, 170, 240, 0);
        } else {
            printCenteredText("Restarting...", 0, 170, 240, 0);
        }
        progress = map(progress, 0, 100, 14, 144);
        tft.fillRoundRect(48, 123, progress, 14, 10, 0x2dc0);
    }
}
void otaErrorCallback(ota_error_t error) {
    tft.fillRoundRect(48, 123, 144, 14, 10, 0xc000);
    tft.fillRect(92, 154, 58, 17, 0x0000);
    char errorMsg[8] = "Error  ";
    errorMsg[6] = '0'+error;
    printCenteredText(errorMsg, 0, 170, 240, 0);
    delay(4000);
    ESP.restart();
}

int checkBounds(int value, int min, int max) {
    if(value < min) value = min;
    if(value > max) value = max;
    return value;
}
