export class EventHandler {
  name: string;
  type: string;
  enabled = true;
  on_config_change?: () => void;

  constructor(name: string, type: string, on_config_change?: () => void) {
    this.name = name;
    this.type = type;
    this.on_config_change = on_config_change;
  }
}
