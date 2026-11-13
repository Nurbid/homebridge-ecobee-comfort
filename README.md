# Homebridge Ecobee Comfort Control

A Homebridge plugin for controlling Ecobee thermostat Comfort Settings through individual HomeKit switches, including custom comfort profiles.

> **Development status:** Early prerelease. HomeKit accessory integration and real-device acceptance testing are not complete.

## Planned capabilities

- Discover authorized Ecobee thermostats and built-in and custom Comfort Settings.
- Expose one HomeKit switch for each Comfort Setting on each thermostat.
- Apply a profile using its Ecobee climate reference (climateRef).
- Synchronize state with changes made in the Ecobee app or thermostat.
- Support multiple thermostats and configurable hold behavior.
- Resume the Ecobee schedule from the active profile switch or a dedicated switch.

The plugin will not create or edit Ecobee Comfort Settings, schedules, or temperature setpoints.

## Ecobee authorization limitation

 The plugin uses Ecobee's documented Residential API PIN Authorization flow with the smartWrite scope. During onboarding, the plugin requests a PIN, the user approves the application in the Ecobee web portal, and the plugin exchanges the authorization code for access and refresh tokens. Tokens are intended to be stored in Homebridge's local storage, not in the main configuration file.

Ecobee currently reports that it is not accepting new developer registrations. This does not mean existing application keys cannot authorize additional users, but it does mean obtaining a new application key may be restricted. The plugin therefore accepts an application key as configuration rather than embedding a shared key in source code. A valid Ecobee application key is required; new-user PIN authorization must be validated before release.

## Planned configuration

```json
{
  "platforms": [{
    "platform": "EcobeeComfort",
    "name": "Ecobee Comfort Control",
    "applicationKey": "YOUR_ECOBEE_APPLICATION_KEY",
    "thermostatSerialNumbers": "",
    "holdPolicy": "thermostat",
    "pollingIntervalSeconds": 60,
    "enableResumeScheduleSwitch": true,
    "discoverCustomComfortSettings": true
  }]
}
```

The 60-second polling default is provisional pending API-limit validation.

## Compatibility target

- Node.js 26
- Homebridge 2.x

## License and attribution

Based on the Apache-2.0-licensed sbs44/homebridge-ecobee-status project. Original history and license are retained. This is a distinct product with a different HomeKit accessory model.
