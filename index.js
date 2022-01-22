

var Service, Characteristic;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-delay-switch", "DelaySwitch", delaySwitch);
}


function delaySwitch(log, config, api) {
    let UUIDGen = api.hap.uuid;

    this.log = log;
    this.name = config['name'];
    this.delay = config['delay'];
    this.disableSensor = config['disableSensor'] || false;
    this.disableContactSensor = config['disableContactSensor'] ?? true;
    this.disableOccupancySensor = config['disableOccupancySensor'] ?? true;
    this.contactSensorMode = config['contactSensorMode'] || 1;
    this.occupancySensorMode = config['occupancySensorMode'] || 1;

    switch (this.contactSensorMode) {
        case 1: // Contact open when delay switch is on
        case 3: // Contact open only for 3 seconds after delay switch turns off
            this.contactTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED; // NAME was opened.
            this.contactNotTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED; // NAME was closed.
            break;
        case 2: // Contact closed when delay switch is on
        case 4: // Contact closed only for 3 seconds after delay switch turns off
            this.contactTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            this.contactNotTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED;
            break;
    }   
    switch (this.occupancySensorMode) {
        case 1: // Occupancy detected when delay switch is on
            this.occupancyTriggered = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED; // Occupancy detected in NAME.
            this.occupancyNotTriggered = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED; // no notification
            break;
        case 2: // Occupancy detected when delay switch is off
            this.occupancyTriggered = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
            this.occupancyNotTriggered = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
            break;
    }   

    this.startOnReboot = config['startOnReboot'] || false;
    this.timer;
    this.switchOn = false;
    this.motionTriggered = false;
    if (this.contactSensorMode == 1 || this.contactSensorMode == 3) {this.contactSensorState = this.contactNotTriggered;} else {this.contactSensorState = this.contactTriggered;}
    if (this.occupancySensorMode == 1) {this.occupancySensorState = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;} else {this.occupancySensorState = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;}
    this.uuid = UUIDGen.generate(this.name)
}

delaySwitch.prototype.getServices = function () {
    var informationService = new Service.AccessoryInformation();

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Delay Switch")
        .setCharacteristic(Characteristic.Model, `Delay-${this.delay}ms`)
        .setCharacteristic(Characteristic.SerialNumber, this.uuid);


    this.switchService = new Service.Switch(this.name);


    this.switchService.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this));

    if (this.startOnReboot)
        this.switchService.setCharacteristic(Characteristic.On, true)
    
    var services = [informationService, this.switchService]
    
    if (!this.disableSensor){
        this.log('Adding Motion Sensor');
        this.motionService = new Service.MotionSensor(this.name + ' Motion Sensor');

        this.motionService
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getMotion.bind(this));
        services.push(this.motionService)
    }

    // new ContactSensor
    if (!this.disableContactSensor){
        this.log('Adding Contact Sensor');
        this.contactService = new Service.ContactSensor(this.name + ' Contact Sensor');

        this.contactService
            .getCharacteristic(Characteristic.ContactSensorState)
            .on('get', this.getContactSensorState.bind(this));
        services.push(this.contactService)
    }

    // new OccupancySensor
    if (!this.disableOccupancySensor){
        this.log('Adding Occupancy Sensor');
        this.occupancyService = new Service.OccupancySensor(this.name + ' Occupancy Sensor');

        this.occupancyService
            .getCharacteristic(Characteristic.OccupancyDetected)
            .on('get', this.getOccupancySensorState.bind(this));
        services.push(this.occupancyService)
    }

    return services;

}


delaySwitch.prototype.setOn = function (on, callback) {

    if (!on) {
        this.log('Stopping the Timer');
    
        this.switchOn = false;
        clearTimeout(this.timer);

        // set state of MotionSensor when switch turned off
        this.motionTriggered = false; // no notification
        if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.motionTriggered);

        // set state of ContactSensor when switch turned off
        if (this.contactSensorMode == 1 || this.contactSensorMode == 3) {this.contactSensorState = this.contactNotTriggered;} else {this.contactSensorState = this.contactTriggered;}
        if (!this.disableContactSensor) this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.contactSensorState);

        // set state of OccupancySensor when switch turned off
        this.occupancySensorState = this.occupancyNotTriggered;
        if (!this.disableOccupancySensor) this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.occupancySensorState);

        
      } else {
        this.log('Starting the Timer');
        this.switchOn = true;
        clearTimeout(this.timer);

        // set state of ContactSensor when switch turned on
        if (this.contactSensorMode == 1 || this.contactSensorMode == 4) {this.contactSensorState = this.contactTriggered;} else {this.contactSensorState = this.contactNotTriggered;}
        if (!this.disableContactSensor) this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.contactSensorState);

        // set state of OccupancySensor when switch turned on
        this.occupancySensorState = this.occupancyTriggered;
        if (!this.disableOccupancySensor) this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.occupancySensorState);


        this.timer = setTimeout(function() {
            // fired after this.delay
            this.log('Time is Up!');
            this.switchOn = false;
            this.switchService.getCharacteristic(Characteristic.On).updateValue(this.switchOn);
                
            if (!this.disableSensor || !this.disableContactSensor || !this.disableOccupancySensor) {
                this.log('Triggering Sensor');

                // set state of MotionSensor when delay timer fired
                this.motionTriggered = true;
                if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.motionTriggered);

                // set state of ContactSensor when delay timer fired
                if (this.contactSensorMode == 1 || this.contactSensorMode == 4) {this.contactSensorState = this.contactNotTriggered;} else {this.contactSensorState = this.contactTriggered;}
                if (!this.disableContactSensor) this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.contactSensorState);

                // set state of OccupancySensor when delay timer fired
                this.occupancySensorState = this.occupancyNotTriggered;
                if (!this.disableOccupancySensor) this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.occupancySensorState);

                setTimeout(function() {

                    // set state of MotionSensor when sensor timeout fired
                    this.motionTriggered = false;
                    if (!this.disableSensor) this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.motionTriggered);

                    // set state of ContactSensor when sensor timeout fired
                    if (this.contactSensorMode == 4) {this.contactSensorState = this.contactTriggered;} else {this.contactSensorState = this.contactNotTriggered;}
                    if (!this.disableContactSensor) this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.contactSensorState);

                    // set state of OccupancySensor when sensor timeout fired
                    this.occupancySensorState = this.occupancyNotTriggered;
                    if (!this.disableOccupancySensor) this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.occupancySensorState);

                    }.bind(this), 3000);
            }
            
            
            }.bind(this), this.delay);
      }
    
      callback();
}



delaySwitch.prototype.getOn = function (callback) {
    callback(null, this.switchOn);
}

delaySwitch.prototype.getMotion = function(callback) {
    callback(null, this.motionTriggered);
}

delaySwitch.prototype.getContactSensorState = function(callback) {
    callback(null, this.contactSensorState);
}

delaySwitch.prototype.getOccupancySensorState = function(callback) {
    callback(null, this.occupancySensorState);
}
