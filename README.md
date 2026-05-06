<img alt="logo" src="branding/delayswitch_homebridge.png" width="500px">

# Homebridge-Delay-Switch

[![Downloads](https://img.shields.io/npm/dt/homebridge-delay-switch.svg?color=critical)](https://www.npmjs.com/package/homebridge-delay-switch)
[![Version](https://img.shields.io/npm/v/homebridge-delay-switch)](https://www.npmjs.com/package/homebridge-delay-switch)

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) [![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/HWUKH9C)  
[![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org?ref=10876) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org?ref=10876)

With this plugin, you can create any number of fake switches that will start a timer when turned ON, when the delay time is reached the switch will automatically turn OFF and trigger a dedicated sensor (motion/contact/occupancy) for 3 seconds. This can be very useful for advanced automation with HomeKit scenes - when delayed actions are required.

## Compatibility

* Homebridge v1.8+ and v2.0+
* Node.js v22 or v24 (required by Homebridge v2)

## Installations

This plugin is Homebridge verified and HOOBS certified and can be easily installed and configured through their UI.

If you don't use Homebridge UI or HOOBS, keep reading:

* ```sudo npm install -g homebridge-delay-switch```
* Create an accessory in your config.json file
* Restart homebridge

## Example config.json

 ```
    "accessories": [
        {
          "accessory": "DelaySwitch",
          "name": "DelaySwitch",
          "startOnReboot": false,
          "delay": 5,
          "delayUnit": "ms",
          "sensorType": "motion",
          "flipSensorState": false
        }   
    ]

```

|             Parameter            |         Description         | Required |  Default |   type   |
| -------------------------------- | --------------------------- |:--------:|:--------:|:--------:|
| `accessory`             | always `"DelaySwitch"`               |     ✓    |     -    |  String  |
| `name`                  | Name for your accessory              |     ✓    |     -    |  String  |
| `startOnReboot`         |  When set to `true`, the switch will be turned ON and start the timer when Homebridge restarts        |       |  `false` |  Boolean  |
| `delay`                 |  Delay/Timer time. 0 - timer disabled |     ✓    |     0    |  Integer |
| `delayUnit`             |  Delay Time Unit: ms / s / m / h / d |     ✓    |     "ms"    |  String |
| `sensorType`            |  The sensor type that will trigger when the time has ended (`null` for no sensor)         |         | `motion` |  String |
| `flipSensorState`       | Flips the trigger sensor state (close/open, detected/not detected)   |          |   `false`  |  Boolean |

## Why do we need this Plugin?

The most common use of this plugin is to turn ON/OFF lights based on a motion/door sensor. This can be achieved by setting an automation to turn ON a light and the delay switch when motion is detected and turn OFF the light when the dedicated delay sensor is triggered (or delay switch is turned OFF).

Another great example, when using a smart wall switch (to turn ON) and RGB light bulb (to switch color) together on the same scene can cause no action on the bulb since the bulb might not even be ON when the command is sent from Homebridge.
To fix this, we can set an automation to change the bulb color a few seconds after the wall switch ON command.

Also it can be use with any device that requires a certain delay time after other devices (TV + RPi-Kodi  /  PC + SSH / etc...)

## How it Works

Basically, all you need to do is:

1. Set the desired `delay` time in the config file. 0 - timer disabled.
2. The plugin will create one switch and optional sensor (motion/contact/occupancy/leak).
3. Use this switch in any scene or automation.
4. Set an automation to trigger when this switch is turned OFF or the sensor is triggered, using the Home app or another app such as the Eve app.

## Why Add a Trigger Sensor?

A sensor (motion/contact/occupancy/leak) is created for each accessory in order to be able to cancel the timer and the attached automations.
How does it works? You can set the automation to be triggered from the attached "trigger" sensor instead of the switch OFF command and therefore you can turn OFF the switch and prevent the sensor from triggering or any attached automations from executing.
If you have no use of the sensor you can remove it by setting `"sensorType": null` to your config.

## Good to Know

* **When manually turning OFF the switch, the timer will stop and the sensor will NOT be triggered.**

* **When the delay switch receives ON command while it's already ON, the timer will restart and the sensor trigger will be delayed.**

_________________________________________

## Support homebridge-delay-switch

**homebridge-delay-switch** is a free plugin under the MIT license. it was developed as a contribution to the homebridge/hoobs community with lots of love and thoughts.
Creating and maintaining Homebridge plugins consume a lot of time and effort and if you would like to share your appreciation, feel free to "Star" or donate.

[![PayPal](https://img.shields.io/badge/PayPal-Donate-blue.svg?logo=paypal)](https://www.paypal.me/nitaybz)  
[![Patreon](https://img.shields.io/badge/PATREON-Become%20a%20Patreon-red.svg?logo=patreon)](https://www.patreon.com/nitaybz)  
[![Ko-Fi](https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi)](https://ko-fi.com/nitaybz)