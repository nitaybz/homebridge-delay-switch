

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


    // if old config exists and sensor is enabled, set sensorMode=1 "Motion Sensor, activated at end of delay for 3s"
    // map disableSensor=true to sensorMode=0
    // map disableSensor=false or null to sensorMode=1 (default if config not found)
    if (!(config['disableSensor'] ?? true)) {
        this.sensorMode = 1; // 1 "Motion Sensor, activated at end of delay for 3s"
    } else {
        this.sensorMode = 0; // 0 None
    }
    // update sensorMode if new config exists
    this.sensorMode = config['sensorMode'] || this.sensorMode; // new config from v2.3.0


    switch (this.sensorMode) {
        case 1: // 1 "Motion Sensor, activated at end of delay for 3s"  normal mode
            this.sensorTriggered = true;
            this.sensorNotTriggered = false;
            break;

        case 2: // 2 "Contact Sensor, opened at end of delay for 3s" 
            this.sensorTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED; // NAME was opened.
            this.sensorNotTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED; // NAME was closed.
            break;

        case 3: // 3 "Contact Sensor, closed at end of delay for 3s" 
            this.sensorTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED; 
            this.sensorNotTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED; 
            break;
        
        case 4: // 4 "Contact Sensor, opened while delay switch is on" 
            this.sensorTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            this.sensorNotTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED;
            break;

        case 5: // 5 "Contact Sensor, closed while delay switch is on"
            this.sensorTriggered = Characteristic.ContactSensorState.CONTACT_DETECTED;
            this.sensorNotTriggered = Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
            break;

        case 6: // 6 "Occupancy Sensor, occupied while delay switch is on"
            this.sensorTriggered = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED; // Occupancy detected in NAME.
            this.sensorNotTriggered = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED; // no notification
            break;
        case 7: // 7 "Occupancy Sensor, occupied while delay switch is off"
            this.sensorTriggered = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
            this.sensorNotTriggered = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
            break;

    }   

    this.startOnReboot = config['startOnReboot'] || false;
    this.timer;
    this.switchOn = false;
    this.sensorState = this.sensorNotTriggered;
    if (this.contactSensorMode == 1 || this.contactSensorMode == 3) {this.contactSensorState = this.sensorNotTriggered;} else {this.contactSensorState = this.sensorTriggered;}
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

    if (this.startOnReboot){
        this.switchService.setCharacteristic(Characteristic.On, true);
        this.sensorState=this.sensorNotTriggered;
        }
    
    var services = [informationService, this.switchService]

    switch (this.sensorMode) {
        case 1: //  Motion Sensor 1
            this.log('Adding Motion Sensor');
            this.motionService = new Service.MotionSensor(this.name + ' Motion Sensor');
            this.motionService
                .getCharacteristic(Characteristic.MotionDetected)
                .on('get', this.getMotion.bind(this));
            services.push(this.motionService)
            break;

        case 2: // 2 "Contact Sensor, opened at end of delay for 3s"
        case 3: // 3 "Contact Sensor, closed at end of delay for 3s"
        case 4: // 4 "Contact Sensor, opened while delay switch is on"
        case 5: // 5 "Contact Sensor, closed while delay switch is on"
            this.log('Adding Contact Sensor');
            this.contactService = new Service.ContactSensor(this.name + ' Contact Sensor');
            this.contactService
                .getCharacteristic(Characteristic.ContactSensorState)
                .on('get', this.getContactSensorState.bind(this));
            services.push(this.contactService)
            break;

        case 6: // Occupancy Sensor 6-7
        case 7: // 
            this.log('Adding Occupancy Sensor');
            this.occupancyService = new Service.OccupancySensor(this.name + ' Occupancy Sensor');
            this.occupancyService
                .getCharacteristic(Characteristic.OccupancyDetected)
                .on('get', this.getOccupancySensorState.bind(this));
            services.push(this.occupancyService)
            break;
    }   
    
    return services;

}


delaySwitch.prototype.setOn = function (on, callback) {

    if (!on) {
        this.log('Stopping the Timer');
        this.switchOn = false;
        clearTimeout(this.timer);

        // set state of Sensor when delay switch turned OFF (manually)
        switch (this.sensorMode) {
            case 1: //  Motion Sensor 1, triggers only at end of delay, so always OFF when switch turns OFF
                this.sensorState=this.sensorNotTriggered;
                this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.sensorState);
                break;
    
            case 2: // 2 "Contact Sensor, opened at end of delay for 3s"
            case 3: // 3 "Contact Sensor, closed at end of delay for 3s"
                this.sensorState=this.sensorNotTriggered;
                this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                break;

            case 4: // 4 "Contact Sensor, opened while delay switch is on"
            case 5: // 5 "Contact Sensor, closed while delay switch is on"
                this.sensorState=this.sensorNotTriggered;
                this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                break;
    
            case 6: // 6 "Occupancy Sensor, occupied while delay switch is on"
            case 7: // 7 "Occupancy Sensor, occupied while delay switch is off"
                this.sensorState=this.sensorNotTriggered;
                this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.sensorState);
                break;
        }   
        


        
      } else {
        this.log('Starting the Timer');
        this.switchOn = true;
        clearTimeout(this.timer);

        // set state of Sensor when delay switch turned ON
        switch (this.sensorMode) {
            case 1: //  Motion Sensor 1, triggers only at end of delay, so always OFF when switch turns ON
                this.sensorState=this.sensorNotTriggered;
                this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.sensorState);
                break;
    
            case 2: // 2 "Contact Sensor, opened at end of delay for 3s"
            case 3: // 3 "Contact Sensor, closed at end of delay for 3s"
                this.sensorState=this.sensorNotTriggered;
                this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                break;
    
            case 4: // 4 "Contact Sensor, opened while delay switch is on"
            case 5: // 5 "Contact Sensor, closed while delay switch is on"
                this.sensorState=this.sensorTriggered;
                this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                break;
        
            case 6: // 6 "Occupancy Sensor, occupied while delay switch is on"
            case 7: // 7 "Occupancy Sensor, occupied while delay switch is off"
                this.sensorState=this.sensorTriggered;
                this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.sensorState);
                break;
        }   


        

        this.timer = setTimeout(function() {
            // fired after this.delay
            this.log('Time is Up!');
            this.switchOn = false;
            this.switchService.getCharacteristic(Characteristic.On).updateValue(this.switchOn);
                
            // trigger sensor if some sensor is enabled
            if (this.sensorMode > 0) {
                this.log('Triggering Sensor');

                // set state of Sensor when delay switch has turned OFF at end of delay
                switch (this.sensorMode) {
                    case 1: //  Motion Sensor 1, triggers only at end of delay, so set ON
                        this.sensorState=this.sensorTriggered;
                        this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.sensorState);
                        break;
            
                    case 2: // 2 "Contact Sensor, opened at end of delay for 3s"
                    case 3: // 3 "Contact Sensor, closed at end of delay for 3s"
                        this.sensorState=this.sensorTriggered;
                        this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                        break;

                    case 4: // 4 "Contact Sensor, opened while delay switch is on"
                    case 5: // 5 "Contact Sensor, closed while delay switch is on"
                        this.sensorState=this.sensorNotTriggered;
                        this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                        break;
            
                    case 6: // 6 "Occupancy Sensor, occupied while delay switch is on"
                    case 7: // 7 "Occupancy Sensor, occupied while delay switch is off"
                        this.sensorState=this.sensorNotTriggered;
                        this.occupancyService.getCharacteristic(Characteristic.OccupancyDetected).updateValue(this.sensorState);
                        break;
                }   

                // only enable the timeout for sensorMode 1, 2 & 3
                if (this.sensorMode < 4){
                    setTimeout(function() {
                        this.log('Turning off Sensor');

                        // set state of Sensor when delay switch timeout has fired after end of delay
                        switch (this.sensorMode) {
                            case 1: //  Motion Sensor 1, triggered only at end of delay, so set OFF after timeout
                                this.sensorState=this.sensorNotTriggered;
                                this.motionService.getCharacteristic(Characteristic.MotionDetected).updateValue(this.sensorState);
                                break;
                    
                            case 2: // 2 "Contact Sensor, opened at end of delay for 3s"
                            case 3: // 3 "Contact Sensor, closed at end of delay for 3s"
                                this.sensorState=this.sensorNotTriggered;
                                this.contactService.getCharacteristic(Characteristic.ContactSensorState).updateValue(this.sensorState);
                                break;
                        }   
    
                    }.bind(this), 3000);
                }
            }
            
            }.bind(this), this.delay);
      }
    
      callback();
}



delaySwitch.prototype.getOn = function (callback) {
    callback(null, this.switchOn);
}

delaySwitch.prototype.getMotion = function(callback) {
    callback(null, this.sensorState);
}

delaySwitch.prototype.getContactSensorState = function(callback) {
    callback(null, this.sensorState);
}

delaySwitch.prototype.getOccupancySensorState = function(callback) {
    callback(null, this.sensorState);
}
