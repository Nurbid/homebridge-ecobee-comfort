export interface ComfortSetting {
  climateRef: string;
  name: string;
}
export interface ThermostatSummary {
  identifier: string;
  name: string;
  modelNumber?: string;
}
export interface ThermostatSnapshot extends ThermostatSummary {
  connected: boolean;
  comfortSettings: ComfortSetting[];
  currentClimateRef?: string;
  activeHoldClimateRef?: string;
  activeEventType?: string;
  holdAction?: string;
}
export type HoldPolicy = 'thermostat' | 'nextTransition' | 'indefinite' | '2hour' | '4hour';
