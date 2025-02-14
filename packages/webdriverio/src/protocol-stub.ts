import { capabilitiesEnvironmentDetector } from '@wdio/utils'
import type { Capabilities, Options } from '@wdio/types'
import type { AttachOptions } from 'webdriver'

/**
 * these commands can be used outside test scope and may be used accidentally by user before browser session is started
 */
const WARN_ON_COMMANDS = ['addCommand', 'overwriteCommand']

/**
 * create `browser` object with capabilities and environment flags before session is started
 * so that Mocha/Jasmine users can filter their specs based on flags or use capabilities in test titles
 */
export default class ProtocolStub {
    static async newSession (options: Options.WebDriver) {
        const capabilities = emulateSessionCapabilities(
            (options.capabilities || {}) as unknown as Capabilities.DesiredCapabilities
        )

        const browser = addCommands({
            capabilities,
            ...capabilitiesEnvironmentDetector(capabilities, (options as any)._automationProtocol || 'webdriver')
        })

        browser.options = options
        return browser
    }

    /**
     * added just in case user wants to somehow reload webdriver or devtools session
     * before it was started.
     */
    static reloadSession () {
        throw new Error('Protocol Stub: Make sure to start webdriver or devtools session before reloading it.')
    }

    static attachToSession (
        options: AttachOptions,
        modifier?: (...args: any[]) => any
    ) {
        if (options || !modifier) {
            return ProtocolStub.newSession(options as any)
        }

        /**
         * MultiRemote
         */
        return addCommands(modifier({
            commandList: []
        }))
    }
}

/**
 * provide better visibility to users that want to add / overwrite commands
 * before session is started
 * @param {object} browser
 */
function addCommands (browser: Record<string, any>) {
    WARN_ON_COMMANDS.forEach((commandName) => {
        browser[commandName] = commandNotAvailable(commandName)
    })
    return browser
}

/**
 * transform capabilities provided by user to look like
 * capabilities returned by WebDriver
 * @param   {object} caps user defined capabilities
 * @return  {object}
 */
function emulateSessionCapabilities (caps: Capabilities.DesiredCapabilities) {
    const capabilities: Record<string, any> = {}

    // remove appium vendor prefix from capabilities
    Object.entries(caps).forEach(([key, value]) => {
        const newKey = key.replace('appium:', '')
        capabilities[newKey] = value
    })

    // isChrome
    if (caps.browserName && caps.browserName.toLowerCase() === 'chrome') {
        capabilities.chrome = true
    }

    return capabilities
}

/**
 * warn user to avoid usage of command before browser session is started.
 * @param {string} commandName
 */
function commandNotAvailable (commandName: string) {
    return () => { throw new Error(`Unable to use '${commandName}' before browser session is started.`) }
}
