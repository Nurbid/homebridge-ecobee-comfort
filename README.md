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

Ecobee's developer portal currently reports that it is not accepting new developer registrations. The existing residential API authorization flow may therefore be unavailable to new users. This is a release blocker until new-installation authorization is validated. Never assume a refresh token can be obtained by every user.

## Planned configuration

```json
{
  "platforms": [{
    "platform": "EcobeeComfort",
    "name": "Ecobee Comfort Control",
    "refreshToken": "YOUR_ECOBEE_REFRESH_TOKEN",
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
