var Service, Characteristic

module.exports = function (homebridge) {
	Service = homebridge.hap.Service
	Characteristic = homebridge.hap.Characteristic
	homebridge.registerAccessory('homebridge-delay-switch', 'DelaySwitch', delaySwitch)
}


function delaySwitch(log, config, api) {
	let UUIDGen = api.hap.uuid

	this.log = log
	this.name = config['name']
	this.delay = config['delay'] || 0
	this.delayUnit = config['delayUnit'] || 'ms'
	this.debug = config.debug || false
	this.sensorType = config['sensorType']
	if (typeof this.sensorType === 'undefined')
		this.sensorType = 'motion'
	this.flipSensor = config['flipSensorState']
	this.disableSensor = config['disableSensor'] || !config['sensorType'] || this.delay === 0
	this.startOnReboot = config['startOnReboot'] || false
	this.switchOn = false
	this.sensorTriggered = 0
	this.uuid = UUIDGen.generate(this.name)


	switch (this.delayUnit) {
	case 's':
		this.delayTime = this.delay * 1000
		break
	case 'm':
		this.delayTime = this.delay * 60 * 1000
		break
	case 'h':
		this.delayTime = this.delay * 60 * 60 * 1000
		break
	case 'd':
		this.delayTime = this.delay * 24 * 60 * 60 * 1000
		break
	default:
		this.delayTime = this.delay
		break
	}

	// define debug method to output debug logs when enabled in the config
	this.log.easyDebug = (...content) => {
		if (this.debug) {
			this.log(content.reduce((previous, current) => {
				return previous + ' ' + current
			}))
		} else
			this.log.debug(content.reduce((previous, current) => {
				return previous + ' ' + current
			}))
	}

	this.getSensorState = () => {
		const state = this.sensorTriggered
		if (this.flipSensor && this.sensorType === 'motion')
			return !state
		if (this.sensorType === 'motion')
			return !!state
		if (this.flipSensor)
			return state ^ 1
		return state
	}
}

delaySwitch.prototype.getServices = function () {
	var informationService = new Service.AccessoryInformation()

	informationService
		.setCharacteristic(Characteristic.Manufacturer, 'Delay Switch')
		.setCharacteristic(Characteristic.Model, `Delay-${this.delay}${this.delayUnit}`)
		.setCharacteristic(Characteristic.SerialNumber, this.uuid)


	this.switchService = new Service.Switch(this.name)
	this.switchService.getCharacteristic(Characteristic.On)
		.onGet(this.getOn.bind(this))
		.onSet(this.setOn.bind(this))

	if (this.startOnReboot)
		this.switchService.setCharacteristic(Characteristic.On, true)

	var services = [informationService, this.switchService]

	if (!this.disableSensor) {
		switch (this.sensorType) {
		case 'contact':
			this.sensorService = new Service.ContactSensor(this.name + ' Trigger')
			this.sensorCharacteristic = Characteristic.ContactSensorState
			break
		case 'occupancy':
			this.sensorService = new Service.OccupancySensor(this.name + ' Trigger')
			this.sensorCharacteristic = Characteristic.OccupancyDetected
			break
		case 'leak':
			this.sensorService = new Service.LeakSensor(this.name + ' Trigger')
			this.sensorCharacteristic = Characteristic.LeakDetected
			break
		default:
			this.sensorService = new Service.MotionSensor(this.name + ' Trigger')
			this.sensorCharacteristic = Characteristic.MotionDetected
			break
		}

		this.sensorService
			.getCharacteristic(this.sensorCharacteristic)
			.onGet(() => this.getSensorState())

		services.push(this.sensorService)
	}

	return services

}

delaySwitch.prototype.setOn = function (value) {

	if (value === false) {
		this.log.easyDebug('Stopping the Timer')
		this.switchOn = false
		clearTimeout(this.timer)
		this.sensorTriggered = 0
		if (!this.disableSensor)
			this.sensorService.updateCharacteristic(this.sensorCharacteristic, this.getSensorState())
	} else if (value === true) {
		this.switchOn = true
		clearTimeout(this.timer)
		if (this.delay > 0) {
			this.log.easyDebug('Starting the Timer')
			this.timer = setTimeout(function () {
				this.log.easyDebug('Time is Up!')
				this.switchService.updateCharacteristic(Characteristic.On, false)
				this.switchOn = false

				if (!this.disableSensor) {
					this.sensorTriggered = 1
					this.sensorService.updateCharacteristic(this.sensorCharacteristic, this.getSensorState())
					this.log.easyDebug('Triggering Sensor')
					setTimeout(function () {
						this.sensorTriggered = 0
						this.sensorService.updateCharacteristic(this.sensorCharacteristic, this.getSensorState())
					}.bind(this), 3000)
				}

			}.bind(this), this.delayTime)
		}
	}
}

delaySwitch.prototype.getOn = function () {
	return this.switchOn
}
